import { motion } from "framer-motion";
import { Delete, Check, Loader2 } from "lucide-react";

interface KioskKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
}

export function KioskKeypad({
  onDigit,
  onBackspace,
  onSubmit,
  isSubmitting = false,
  canSubmit = false,
}: KioskKeypadProps) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="grid grid-cols-3 gap-3">
      {digits.map((digit) => (
        <KeypadButton key={digit} onClick={() => onDigit(digit)}>
          {digit}
        </KeypadButton>
      ))}
      
      {/* Bottom row */}
      <KeypadButton onClick={onBackspace} variant="secondary">
        <Delete className="w-5 h-5" />
      </KeypadButton>
      
      <KeypadButton onClick={() => onDigit("0")}>0</KeypadButton>
      
      <KeypadButton
        onClick={onSubmit}
        variant={canSubmit ? "primary" : "secondary"}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Check className="w-5 h-5" />
        )}
      </KeypadButton>
    </div>
  );
}

interface KeypadButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "secondary" | "primary";
  disabled?: boolean;
}

function KeypadButton({
  children,
  onClick,
  variant = "default",
  disabled = false,
}: KeypadButtonProps) {
  const baseClasses = "h-16 rounded-xl font-semibold text-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variantClasses = {
    default: "bg-secondary hover:bg-secondary/80 text-foreground",
    secondary: "bg-muted hover:bg-muted/80 text-muted-foreground",
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {children}
    </motion.button>
  );
}
