import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useKioskSafe } from "@/contexts/KioskContext";
import { KioskKeypad } from "./KioskKeypad";
import { Loader2, LogOut } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { supabase } from "@/integrations/supabase/client";

export function KioskLockScreen() {
  const navigate = useNavigate();
  const kioskContext = useKioskSafe();
  const { settings } = useSalonSettings();
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  // First-time PIN setup: 'choose' → 'confirm' (null = normal unlock)
  const [setupStep, setSetupStep] = useState<null | "choose" | "confirm">(null);
  const [setupFirstPin, setSetupFirstPin] = useState("");
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salonName = settings?.salon_name || "MixR Fusion";

  const { availableStaff, isLoadingStaff, verifyPin, activeStaff } = kioskContext ?? {};

  // Reset form state when lock screen appears (isLocked becomes true)
  // Also reset when activeStaff is cleared (logout vs lock)
  useEffect(() => {
    if (kioskContext?.isLocked) {
      setPin("");
      setError(null);
      // Only reset to staff selection if no activeStaff (logout case)
      // If activeStaff exists (lock case), keep them selected for quick PIN re-entry
      if (!kioskContext.activeStaff) {
        setSelectedStaff(null);
      }
    }
  }, [kioskContext?.isLocked, kioskContext?.activeStaff]);

  // Don't render if context not available, not in kiosk mode, or not locked
  // Never cover public pages (login/signup/reset/join) — kiosk lock is an
  // inside-the-app concept, and a stale localStorage kiosk flag on a signed-out
  // device would otherwise sit over the signup form and block typing.
  const publicPaths = ["/auth", "/reset-password", "/join"];
  if (publicPaths.some((p) => window.location.pathname.startsWith(p))) {
    return null;
  }
  if (!kioskContext || !kioskContext.isKioskMode || !kioskContext.isLocked) {
    return null;
  }

  const handleSignOut = async () => {
    kioskContext.enableKioskMode(false);
    await supabase.auth.signOut();
  };

  const handlePinSubmit = async (pinToVerify: string) => {
    if (pinToVerify.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    // First-time setup, step 1: remember the choice, ask to confirm
    if (setupStep === "choose") {
      setSetupFirstPin(pinToVerify);
      setSetupStep("confirm");
      setPin("");
      setError(null);
      return;
    }

    // First-time setup, step 2: confirm and save
    if (setupStep === "confirm") {
      if (pinToVerify !== setupFirstPin) {
        setError("PINs didn't match — start again");
        setSetupStep("choose");
        setSetupFirstPin("");
        setPin("");
        return;
      }
      setIsVerifying(true);
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke("manage-pin", {
        body: { staff_id: selectedStaff, pin: pinToVerify, action: "set" },
      });
      if (fnError || data?.error) {
        setError(data?.error || "Couldn't save your PIN — try again");
        setSetupStep("choose");
        setSetupFirstPin("");
        setPin("");
        setIsVerifying(false);
        return;
      }
      // PIN saved — log them straight in with it
      const result = await verifyPin(pinToVerify, selectedStaff ?? undefined);
      setIsVerifying(false);
      if (result) {
        navigate("/");
      } else {
        setSetupStep(null);
        setPin("");
      }
      return;
    }

    setIsVerifying(true);
    setError(null);

    const result = await verifyPin(pinToVerify, selectedStaff ?? undefined);

    if (result) {
      navigate("/");
    } else {
      setError("Invalid PIN");
      setPin("");
    }

    setIsVerifying(false);
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !isVerifying) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      
      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
    setSelectedStaff(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <BrandLogo size="sm" className="mb-4" />
        <h1 className="text-3xl font-bold text-foreground mb-2">{salonName}</h1>
        <p className="text-muted-foreground">
          {setupStep === "choose"
            ? "Welcome! Choose your 4-digit PIN"
            : setupStep === "confirm"
            ? "Enter it once more to confirm"
            : selectedStaff
            ? "Enter your 4-digit PIN"
            : "Select your profile to continue"}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!selectedStaff ? (
          <motion.div
            key="staff-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            {isLoadingStaff ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : availableStaff.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">No staff members yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your team in Staff, then everyone sets their own PIN right here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {availableStaff.map((staff, index) => (
                  <motion.button
                    key={staff.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedStaff(staff.id);
                      setSetupStep(staff.has_pin ? null : "choose");
                      setPin("");
                      setError(null);
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-semibold text-primary">
                        {staff.initials}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-full">
                      {staff.name}
                    </span>
                    {!staff.has_pin && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        Set up PIN
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="mt-8 mx-auto flex items-center gap-2 text-base font-medium text-destructive border border-destructive rounded-lg px-5 py-2.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="pin-entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm"
          >
            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-colors ${
                    pin.length > i
                      ? "bg-primary border-primary"
                      : error
                      ? "border-destructive"
                      : "border-border"
                  }`}
                >
                  {pin.length > i && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 rounded-full bg-primary-foreground"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-destructive text-sm mb-4"
              >
                {error}
              </motion.p>
            )}

            {/* Keypad */}
            <KioskKeypad
              onDigit={handleDigit}
              onBackspace={handleBackspace}
              onSubmit={() => handlePinSubmit(pin)}
              isSubmitting={isVerifying}
              canSubmit={pin.length === 4}
            />

            {/* Back Button */}
            <button
              onClick={() => {
                handleClear();
                setSetupStep(null);
                setSetupFirstPin("");
              }}
              className="w-full mt-6 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to profile selection
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
