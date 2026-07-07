import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PinManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
  action: "set" | "reset";
  onSuccess: () => void;
}

export function PinManagementDialog({
  open,
  onOpenChange,
  staffId,
  staffName,
  action,
  onSuccess,
}: PinManagementDialogProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-pin", {
        body: {
          staff_id: staffId,
          pin: pin,
          action: action,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(action === "set" ? "PIN set successfully" : "PIN changed successfully");
      setPin("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("PIN management error:", error);
      toast.error(error.message || "Failed to manage PIN");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPin("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "set" ? "Set PIN" : "Change PIN"}
          </DialogTitle>
          <DialogDescription>
            Enter a 4-digit PIN for {staffName} to use at the kiosk.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-6">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={setPin}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={pin.length !== 4 || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === "set" ? "Set PIN" : "Change PIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
