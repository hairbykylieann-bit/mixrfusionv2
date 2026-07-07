import { useState, useEffect } from "react";
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
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salonName = settings?.salon_name || "MixR Fusion";
  const salonLogo = settings?.salon_logo_url;

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

    setIsVerifying(true);
    setError(null);

    const result = await verifyPin(pinToVerify);

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
        {salonLogo ? (
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden">
            <img src={salonLogo} alt={salonName} className="w-full h-full object-contain" />
          </div>
        ) : null}
        <h1 className="text-3xl font-bold text-foreground mb-2">{salonName}</h1>
        <p className="text-muted-foreground">
          {selectedStaff ? "Enter your 4-digit PIN" : "Select your profile to continue"}
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
                <p className="text-muted-foreground mb-2">No staff members with PINs</p>
                <p className="text-sm text-muted-foreground">
                  Ask your manager to set up PINs for kiosk access
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
                    onClick={() => setSelectedStaff(staff.id)}
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
              onClick={handleClear}
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
