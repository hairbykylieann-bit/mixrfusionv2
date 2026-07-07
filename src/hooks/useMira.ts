import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedBowlItem {
  productId: string | null;
  productName: string;
  amount: number;
  unit: string;
}

export interface ParsedDeveloper {
  productId: string | null;
  productName: string;
  amount: number;
  unit: string;
  brandHint: string | null;
}

export interface ParsedBowl {
  name: string;
  items: ParsedBowlItem[];
  developers: ParsedDeveloper[];
  notes: string | null;
}

export interface MiraParseResult {
  clientName: string | null;
  clientId: string | null;
  bowls: ParsedBowl[];
  confidence: number;
}

export type MiraStatus = "idle" | "recording" | "transcribing" | "parsing" | "complete" | "error";

interface UseMiraOptions {
  products: Array<{
    id: string;
    name: string;
    brand: string;
    line: string | null;
    shade: string | null;
    type: string;
  }>;
  clients: Array<{
    id: string;
    name: string;
  }>;
  preferredUnit?: string;
  onResult?: (result: MiraParseResult) => void;
}

export function useMira({ products, clients, preferredUnit, onResult }: UseMiraOptions) {
  const [status, setStatus] = useState<MiraStatus>("idle");
  const [transcription, setTranscription] = useState<string | null>(null);
  const [partialText, setPartialText] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<MiraParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const committedSegmentsRef = useRef<string[]>([]);
  const isActiveRef = useRef(false);
  const parseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (isActiveRef.current) {
        setPartialText(data.text);
      }
    },
    onCommittedTranscript: (data) => {
      if (!isActiveRef.current) return;
      console.log("[Mira] Committed segment:", data.text);
      committedSegmentsRef.current.push(data.text);
      setPartialText(null);

      // Debounce: wait 2s after last committed segment before parsing
      // VAD will keep committing segments as user speaks, so we wait for a pause
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
      parseTimeoutRef.current = setTimeout(() => {
        if (isActiveRef.current) {
          finalizAndParse();
        }
      }, 2000);
    },
  });

  const finalizAndParse = useCallback(async () => {
    isActiveRef.current = false;
    const fullText = committedSegmentsRef.current.join(" ").trim();

    if (!fullText) {
      setError("No speech detected. Please try again.");
      setStatus("error");
      scribe.disconnect();
      return;
    }

    setTranscription(fullText);
    setPartialText(null);
    setStatus("parsing");
    scribe.disconnect();

    console.log("[Mira] Full transcription:", fullText);
    console.log("[Mira] Starting AI parsing...");

    try {
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        "mira-parse",
        {
          body: {
            transcription: fullText,
            preferredUnit: preferredUnit || "oz",
            products: products.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              line: p.line,
              shade: p.shade,
              type: p.type,
            })),
            clients: clients.map((c) => ({
              id: c.id,
              name: c.name,
            })),
          },
        }
      );

      if (parseError) {
        console.error("[Mira] Parse function error:", parseError);
        throw new Error(parseError.message || "Parsing failed");
      }

      console.log("[Mira] Parse result:", parseData);

      if (!parseData.success) {
        throw new Error(parseData.error || "Parsing failed");
      }

      const result: MiraParseResult = {
        clientName: parseData.clientName,
        clientId: parseData.clientId,
        bowls: parseData.bowls || [],
        confidence: parseData.confidence || 0,
      };

      setParseResult(result);
      setStatus("complete");
      onResult?.(result);

      const confidencePercent = Math.round((result.confidence || 0) * 100);
      toast.success(`Voice command processed! (${confidencePercent}% confident)`);
    } catch (err) {
      console.error("[Mira] Processing error:", err);
      const errorMessage = err instanceof Error ? err.message : "Processing failed";
      setError(errorMessage);
      setStatus("error");

      if (errorMessage.includes("429")) {
        toast.error("Rate limit reached. Please wait a moment and try again.");
      } else if (errorMessage.includes("402")) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error(`Failed to process: ${errorMessage}`);
      }
    }
  }, [products, clients, preferredUnit, onResult, scribe]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscription(null);
      setPartialText(null);
      setParseResult(null);
      committedSegmentsRef.current = [];

      console.log("[Mira] Getting scribe token...");
      setStatus("transcribing"); // brief loading state while getting token

      const tokenResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        console.error("[Mira] Token error:", tokenResponse.status, errText);
        throw new Error("Failed to initialize voice recognition");
      }

      const { token } = await tokenResponse.json();

      if (!token) {
        throw new Error("No token received");
      }

      console.log("[Mira] Connecting to realtime scribe...");
      isActiveRef.current = true;

      await scribe.connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStatus("recording");
      console.log("[Mira] Realtime transcription active");
    } catch (err) {
      console.error("[Mira] Failed to start recording:", err);
      const msg = err instanceof Error ? err.message : "Failed to start recording";
      setError(msg);
      setStatus("error");
      toast.error(msg);
    }
  }, [scribe]);

  const stopRecording = useCallback(() => {
    console.log("[Mira] Manual stop requested");
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }
    if (isActiveRef.current && committedSegmentsRef.current.length > 0) {
      finalizAndParse();
    } else if (isActiveRef.current) {
      // No committed segments yet — wait briefly for any pending commit
      setTimeout(() => {
        if (committedSegmentsRef.current.length > 0) {
          finalizAndParse();
        } else {
          isActiveRef.current = false;
          scribe.disconnect();
          setError("No speech detected. Please try again.");
          setStatus("error");
        }
      }, 500);
    }
  }, [finalizAndParse, scribe]);

  const reset = useCallback(() => {
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }
    isActiveRef.current = false;
    committedSegmentsRef.current = [];
    scribe.disconnect();
    setStatus("idle");
    setTranscription(null);
    setPartialText(null);
    setParseResult(null);
    setError(null);
  }, [scribe]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
      isActiveRef.current = false;
    };
  }, []);

  return {
    status,
    transcription,
    partialText,
    parseResult,
    error,
    silenceCountdown: null as number | null, // kept for API compat
    startRecording,
    stopRecording,
    reset,
    isRecording: status === "recording",
    isProcessing: status === "transcribing" || status === "parsing",
  };
}
