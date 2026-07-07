import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Building2, User, KeyRound, CheckCircle2, Eye, EyeOff, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Form data
  const [salonName, setSalonName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  // PIN visibility
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const processLogoFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("salon-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("salon-assets")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast({
        title: "Logo uploaded",
        description: "Your salon logo has been uploaded successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      setLogoPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processLogoFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processLogoFile(file);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !salonName.trim()) {
      toast({
        title: "Salon name required",
        description: "Please enter your salon name to continue",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    // Validate
    if (!ownerName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Phone required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN",
        variant: "destructive",
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: "PINs don't match",
        description: "Please make sure your PINs match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("complete-onboarding", {
        body: {
          salonName: salonName.trim(),
          logoUrl,
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          pin,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Welcome to MixR!",
        description: `${salonName} has been set up successfully`,
      });

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      await queryClient.invalidateQueries({ queryKey: ["salon-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });

      // Navigate to home
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div className={`w-16 h-1 rounded-full transition-colors ${
              step > 1 ? "bg-primary" : "bg-muted"
            }`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">
              {step === 1 ? "Welcome to MixR" : "Your Profile"}
            </CardTitle>
            <CardDescription className="text-base">
              {step === 1 
                ? "Let's set up your salon" 
                : "Create your owner account"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {step === 1 ? (
              <>
                {/* Salon Name */}
                <div className="space-y-2">
                  <Label htmlFor="salonName">Salon Name</Label>
                  <Input
                    id="salonName"
                    placeholder="Enter your salon name"
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>

                {/* Logo Upload - Drag & Drop */}
                <div className="space-y-2">
                  <Label>Logo (optional)</Label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className={`
                      relative cursor-pointer rounded-xl border-2 border-dashed p-6
                      transition-all duration-200 ease-in-out
                      ${isDragging 
                        ? "border-primary bg-primary/5 scale-[1.02]" 
                        : logoPreview 
                          ? "border-border bg-muted/30 hover:border-primary/50" 
                          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-background shadow-sm">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-lg flex items-center justify-center transition-colors ${
                          isDragging ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <Building2 className={`w-7 h-7 transition-colors ${
                            isDragging ? "text-primary" : "text-muted-foreground"
                          }`} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className={`w-4 h-4 ${isDragging ? "text-primary" : ""}`} />
                              <span>{logoPreview ? "Change logo" : "Drop your logo here"}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isDragging ? "Release to upload" : "or click to browse • PNG, JPG up to 2MB"}
                        </p>
                      </div>
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {/* Preview Card */}
                {salonName && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Lock screen preview</p>
                    <div className="flex items-center gap-3">
                      {logoPreview ? (
                        <img src={logoPreview} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <span className="font-semibold text-lg">{salonName}</span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleNextStep} 
                  className="w-full h-12 text-base"
                  disabled={!salonName.trim()}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                {/* Owner Name */}
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Your Name</Label>
                  <Input
                    id="ownerName"
                    placeholder="Enter your full name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="h-12 text-base"
                  />
                </div>

                {/* PIN Input */}
                <div className="space-y-2">
                  <Label htmlFor="pin" className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    4-Digit PIN
                  </Label>
                  <div className="relative">
                    <Input
                      id="pin"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-12 text-base text-center tracking-[0.5em] font-mono pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll use this PIN to unlock the kiosk
                  </p>
                </div>

                {/* Confirm PIN */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirm PIN</Label>
                  <div className="relative">
                    <Input
                      id="confirmPin"
                      type={showConfirmPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-12 text-base text-center tracking-[0.5em] font-mono pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPin && pin !== confirmPin && (
                    <p className="text-sm font-medium text-destructive">PINs don't match</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1 h-12"
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleComplete}
                    className="flex-1 h-12"
                    disabled={isSubmitting || !ownerName.trim() || !phone.trim() || pin.length !== 4 || pin !== confirmPin}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      "Complete Setup"
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Step {step} of 2
        </p>
      </div>
    </div>
  );
}
