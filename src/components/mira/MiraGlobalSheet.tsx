import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Mic, MicOff, Send, Trash2, Loader2, Volume2, VolumeX } from "lucide-react";
import { useMiraContext } from "@/contexts/MiraContext";
import { useGlobalMira, ChatMessage } from "@/hooks/useGlobalMira";
import { useMiraInventory } from "@/hooks/useMiraInventory";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { InventoryUpdateCard } from "@/components/mira/InventoryUpdateCard";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const INVENTORY_INTENT_RE =
  /\b(update inventory|inventory|stock|count|we have|we're at|we are at|restock|on hand|in stock|tubes? of)\b/i;

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.content || (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
          </span>
        )}
      </div>
    </motion.div>
  );
}

function VoiceButton({
  isRecording,
  silenceCountdown,
  onStart,
  onStop,
  disabled,
}: {
  isRecording: boolean;
  silenceCountdown: number | null;
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}) {
  const progress = silenceCountdown ? ((5 - silenceCountdown) / 5) * 100 : 0;

  return (
    <div className="relative">
      {/* Countdown ring */}
      {isRecording && silenceCountdown && (
        <svg
          className="absolute -inset-1 h-12 w-12"
          viewBox="0 0 48 48"
        >
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/30"
          />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
            className="text-destructive transition-all duration-200"
            transform="rotate(-90 24 24)"
          />
        </svg>
      )}
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        onClick={isRecording ? onStop : onStart}
        disabled={disabled}
        className={cn(
          "h-10 w-10 rounded-full transition-all",
          isRecording && "animate-pulse"
        )}
      >
        {isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function MiraGlobalSheet() {
  const { isOpen, closeMira, prefilledQuestion, clearPrefill, currentPage } = useMiraContext();
  const {
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
  } = useGlobalMira();
  const { effectiveStaff } = useEffectiveStaff();
  const canManageProducts = effectiveStaff?.permissions.can_manage_products ?? false;
  const inventory = useMiraInventory();

  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle prefilled question
  useEffect(() => {
    if (prefilledQuestion && isOpen) {
      setInput(prefilledQuestion);
      clearPrefill();
      inputRef.current?.focus();
    }
  }, [prefilledQuestion, isOpen, clearPrefill]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, inventory.proposal]);

  const isInventoryIntent = (text: string) => {
    if (!canManageProducts) return false;
    const onInventoryPage = currentPage === "Inventory";
    return onInventoryPage || INVENTORY_INTENT_RE.test(text);
  };

  // Voice path: when a new user message comes in and it looks like an inventory
  // update, also trigger the inventory parse flow.
  const lastHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") return;
    if (lastHandledRef.current === last.id) return;
    lastHandledRef.current = last.id;
    if (inventory.status !== "idle") return;
    if (isInventoryIntent(last.content)) {
      void inventory.propose(last.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || isRecording) return;
    if (inventory.status === "parsing" || inventory.status === "applying") return;
    sendMessage(input);
    setInput("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeMira()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left text-base">Ask Mira</SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {isSpeaking ? (
                    <span className="flex items-center gap-1">
                      <Volume2 className="h-3 w-3 animate-pulse" />
                      Speaking...
                    </span>
                  ) : (
                    "Your salon assistant"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isSpeaking && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stopSpeaking}
                  className="h-8 w-8"
                  title="Stop speaking"
                >
                  <VolumeX className="h-4 w-4" />
                </Button>
              )}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-medium">Hi! I'm Mira</h3>
                <p className="text-sm text-muted-foreground max-w-[260px]">
                  I can help you with client formulas, inventory, and navigating the app. Just ask!
                </p>
                <div className="mt-6 space-y-2 text-left w-full">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Try asking:</p>
                  {[
                    "What was Sarah's formula last time?",
                    "What products are running low?",
                    "How do I add a new client?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => sendMessage(suggestion)}
                      disabled={isLoading}
                      className="w-full rounded-lg border bg-background p-3 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </AnimatePresence>
            )}

            {(inventory.status === "parsing" || inventory.status === "applying") && !inventory.proposal && (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Reading your inventory update...
              </div>
            )}

            {inventory.proposal && (
              <InventoryUpdateCard
                proposal={inventory.proposal}
                status={inventory.status}
                onChange={inventory.updateRow}
                onRemove={inventory.removeRow}
                onApply={inventory.apply}
                onCancel={inventory.cancel}
              />
            )}

            {isRecording && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
              >
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive"></span>
                </span>
                {silenceCountdown
                  ? `Stopping in ${silenceCountdown}...`
                  : "Listening..."}
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex items-center gap-2">
            <VoiceButton
              isRecording={isRecording}
              silenceCountdown={silenceCountdown}
              onStart={startRecording}
              onStop={stopRecording}
              disabled={isLoading}
            />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading || isRecording}
              className="flex-1"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || isRecording}
              className="h-10 w-10 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
