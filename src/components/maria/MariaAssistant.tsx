import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MariaSuggestion {
  id: string;
  message: string;
  type: "waste" | "suggestion" | "reminder";
}

interface MariaAssistantProps {
  suggestion: MariaSuggestion | null;
  onAccept?: (suggestion: MariaSuggestion) => void;
  onDismiss?: (suggestion: MariaSuggestion) => void;
}

export function MariaAssistant({ suggestion, onAccept, onDismiss }: MariaAssistantProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!suggestion || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.(suggestion);
  };

  const handleAccept = () => {
    setIsVisible(false);
    onAccept?.(suggestion);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-24 right-6 z-50 max-w-sm"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-foreground">Maria</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-foreground leading-relaxed">
              "{suggestion.message}"
            </p>
          </div>
          
          <div className="flex gap-2 px-4 pb-4">
            <Button
              variant="default"
              size="sm"
              onClick={handleAccept}
              className="flex-1 gap-1.5"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {suggestion.type === "reminder" ? "Yes, remind me" : "Got it"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="flex-1"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper to generate Maria suggestions based on mix data
export function generateMariaSuggestion(
  clientName: string,
  amountMixed: number,
  amountUsed: number,
  averageUsage?: number
): MariaSuggestion | null {
  const waste = amountMixed - amountUsed;
  
  if (waste > 10) {
    return {
      id: `waste-${Date.now()}`,
      type: "waste",
      message: `I noticed you had about ${waste}g leftover with ${clientName}. Next time, try starting with ${amountUsed + 5}g - you can always add more!`
    };
  }
  
  if (averageUsage && Math.abs(amountMixed - averageUsage) > 15) {
    return {
      id: `suggestion-${Date.now()}`,
      type: "suggestion",
      message: `${clientName} usually needs about ${averageUsage}g for their service. Want me to suggest that amount next time?`
    };
  }
  
  return null;
}
