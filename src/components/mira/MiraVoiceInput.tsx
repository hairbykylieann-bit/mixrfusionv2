import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, Check, AlertCircle, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMira, type MiraParseResult, type MiraStatus } from "@/hooks/useMira";

interface MiraVoiceInputProps {
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
  onResult: (result: MiraParseResult) => void;
}

const getStatusMessage = (status: MiraStatus): string => {
  const messages: Record<MiraStatus, string> = {
    idle: "Tap to speak your mix",
    recording: "Listening...",
    transcribing: "Connecting...",
    parsing: "Understanding your instructions...",
    complete: "Got it!",
    error: "Something went wrong",
  };
  return messages[status];
};

export function MiraVoiceInput({ products, clients, preferredUnit, onResult }: MiraVoiceInputProps) {
  const [pulseScale, setPulseScale] = useState(1);

  const {
    status,
    transcription,
    partialText,
    error,
    startRecording,
    stopRecording,
    reset,
    isRecording,
    isProcessing,
  } = useMira({
    products,
    clients,
    preferredUnit,
    onResult,
  });

  // Animate pulse while recording
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setPulseScale((s) => (s === 1 ? 1.1 : 1));
    }, 500);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleClick = () => {
    if (status === "idle" || status === "error" || status === "complete") {
      reset();
      startRecording();
    } else if (isRecording) {
      stopRecording();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "recording":
        return <Mic className="w-6 h-6" />;
      case "transcribing":
      case "parsing":
        return <Loader2 className="w-6 h-6 animate-spin" />;
      case "complete":
        return <Check className="w-6 h-6" />;
      case "error":
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Mic className="w-6 h-6" />;
    }
  };

  const getButtonVariant = () => {
    if (status === "recording") return "destructive";
    if (status === "error") return "outline";
    if (status === "complete") return "default";
    return "default";
  };

  // Show live text: partial while recording, final transcription after
  const displayText = isRecording ? partialText : transcription;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Mira Voice Assistant</h3>
            <p className="text-sm text-muted-foreground">Speak your color mix naturally</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Recording Button */}
          <motion.div
            animate={{ scale: isRecording ? pulseScale : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              size="lg"
              variant={getButtonVariant()}
              className={`w-16 h-16 rounded-full ${
                isRecording ? "bg-destructive hover:bg-destructive/90" : ""
              } ${status === "complete" ? "bg-success hover:bg-success/90" : ""}`}
              onClick={handleClick}
              disabled={isProcessing}
            >
              {getStatusIcon()}
            </Button>
          </motion.div>

          {/* Status Text */}
          <AnimatePresence mode="wait">
            <motion.p
              key={status}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`text-sm font-medium ${
                status === "error" ? "text-destructive" :
                status === "complete" ? "text-success" :
                "text-muted-foreground"
              }`}
            >
              {error || getStatusMessage(status)}
            </motion.p>
          </AnimatePresence>

          {/* Live / Final Transcription Display */}
          <AnimatePresence>
            {displayText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full"
              >
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {isRecording ? "Hearing:" : "I heard:"}
                  </p>
                  <p className="text-sm text-foreground italic">"{displayText}"</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset Button */}
          {(status === "complete" || status === "error") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Start Over
            </Button>
          )}
        </div>

        {/* Example Prompts */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Try saying:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "30g of 6N for Sarah",
              "Equal parts 7N and 8N with 60ml 20 vol",
              "Mix 40g shade 5.0 with developer",
            ].map((example) => (
              <span
                key={example}
                className="text-xs px-2 py-1 bg-secondary rounded-full text-muted-foreground"
              >
                {example}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
