import { useState, useCallback, useRef } from "react";
import { useMiraContext } from "@/contexts/MiraContext";
import { useTenantData } from "@/hooks/useTenant";

// Clean markdown formatting from text before TTS
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\*/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Silence detection configuration - optimized for noisy salon environments
const AMBIENT_THRESHOLD = 0.03; // Background noise floor (raised from 0.01)
const SPEECH_THRESHOLD = 0.08;  // Volume level indicating clear speech
const SILENCE_TIMEOUT = 3000;   // 3 seconds of silence before auto-stop (reduced from 5)
const MIN_SPEECH_DURATION = 500;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useGlobalMira() {
  const { currentPage, selectedClientId } = useMiraContext();
  const { tenant } = useTenantData();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceMonitorRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const hasDetectedSpeechRef = useRef<boolean>(false);
  const speechStartRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // TTS audio ref
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupAudioContext = useCallback(() => {
    if (silenceMonitorRef.current) {
      cancelAnimationFrame(silenceMonitorRef.current);
      silenceMonitorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    silenceStartRef.current = null;
    hasDetectedSpeechRef.current = false;
    speechStartRef.current = null;
    setSilenceCountdown(null);
  }, []);

  // Text-to-speech function
  const speakText = useCallback(async (text: string) => {
    try {
      // Stop any currently playing audio
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }

      setIsSpeaking(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mira-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        ttsAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        ttsAudioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error("[Global Mira] TTS error:", err);
      setIsSpeaking(false);
    }
  }, []);

  // Stop speaking function
  const stopSpeaking = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setIsSpeaking(false);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mira-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            question: text,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            context: {
              currentPage,
              selectedClientId,
              tenantId: tenant?.id,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            // Incomplete JSON, put back in buffer
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch { /* ignore */ }
        }
      }
      // Speak the final response (cleaned of markdown)
      if (assistantContent) {
        speakText(cleanTextForSpeech(assistantContent));
      }
    } catch (err) {
      console.error("[Global Mira] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get response";
      setError(errorMessage);
      
      // Add error message
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.content !== "");
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentPage, selectedClientId, tenant?.id, speakText]);

  const stopRecording = useCallback(async () => {
    cleanupAudioContext();
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [cleanupAudioContext]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setSilenceCountdown(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      setIsRecording(true);

      // Set up Web Audio API for silence detection
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Silence monitoring - dual threshold approach for noisy environments
      const monitorSilence = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;

        const now = Date.now();
        const isSpeaking = average >= SPEECH_THRESHOLD;
        const isSilent = average < AMBIENT_THRESHOLD;

        if (isSpeaking) {
          // Clear speech detected
          if (!hasDetectedSpeechRef.current) {
            hasDetectedSpeechRef.current = true;
            speechStartRef.current = now;
            console.log("[Global Mira] Speech detected");
          }
          silenceStartRef.current = null;
          setSilenceCountdown(null);
        } else if (hasDetectedSpeechRef.current && isSilent) {
          // Volume dropped below ambient threshold after speech
          const speechDuration = speechStartRef.current ? now - speechStartRef.current : 0;

          if (speechDuration >= MIN_SPEECH_DURATION) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = now;
              console.log("[Global Mira] Silence detected, starting countdown");
            }

            const silenceDuration = now - silenceStartRef.current;
            const remainingSeconds = Math.ceil((SILENCE_TIMEOUT - silenceDuration) / 1000);

            if (remainingSeconds > 0 && remainingSeconds <= 3) {
              setSilenceCountdown(remainingSeconds);
            }

            if (silenceDuration >= SILENCE_TIMEOUT) {
              console.log("[Global Mira] Silence timeout reached, auto-stopping");
              stopRecording();
              return;
            }
          }
        }

        silenceMonitorRef.current = requestAnimationFrame(monitorSilence);
      };

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await processVoiceInput(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          silenceMonitorRef.current = requestAnimationFrame(monitorSilence);
        }
      }, 100);
    } catch (err) {
      console.error("[Global Mira] Recording error:", err);
      setError("Microphone access denied");
      setIsRecording(false);
      cleanupAudioContext();
    }
  }, [stopRecording, cleanupAudioContext]);

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mira-transcribe`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.text) {
        throw new Error(data.error || "No transcription received");
      }

      // Send the transcribed text as a message
      await sendMessage(data.text);
    } catch (err) {
      console.error("[Global Mira] Voice processing error:", err);
      setError(err instanceof Error ? err.message : "Voice processing failed");
      setIsLoading(false);
    }
  };

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    messages,
    isLoading,
    isRecording,
    isSpeaking,
    silenceCountdown,
    error,
    sendMessage,
    startRecording,
    stopRecording,
    stopSpeaking,
    clearMessages,
  };
}
