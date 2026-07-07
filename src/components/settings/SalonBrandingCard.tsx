import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Upload, 
  X, 
  Loader2, 
  Check, 
  Pencil,
  ImageIcon,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function SalonBrandingCard() {
  const { settings, isLoading, updateSettings, isUpdating } = useSalonSettings();
  const { tenantId } = useTenant();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(settings?.salon_name || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameSave = () => {
    if (nameValue.trim()) {
      updateSettings({ salon_name: nameValue.trim() });
      setIsEditingName(false);
    }
  };

  const handleNameCancel = () => {
    setNameValue(settings?.salon_name || "");
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleNameSave();
    if (e.key === "Escape") handleNameCancel();
  };

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WebP image");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be less than 2MB");
      return false;
    }
    return true;
  };

  const uploadLogo = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenantId}/logos/${settings?.id || "default"}-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (settings?.salon_logo_url) {
        const oldPath = settings.salon_logo_url.split("/salon-assets/")[1];
        if (oldPath) {
          await supabase.storage.from("salon-assets").remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("salon-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("salon-assets")
        .getPublicUrl(fileName);

      // Update settings
      updateSettings({ salon_logo_url: publicUrl });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Failed to upload logo:", error);
      toast.error("Failed to upload logo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!settings?.salon_logo_url) return;

    setIsUploading(true);
    try {
      const oldPath = settings.salon_logo_url.split("/salon-assets/")[1];
      if (oldPath) {
        await supabase.storage.from("salon-assets").remove([oldPath]);
      }
      updateSettings({ salon_logo_url: null });
      toast.success("Logo removed");
    } catch (error) {
      console.error("Failed to remove logo:", error);
      toast.error("Failed to remove logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadLogo(file);
  }, [settings?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return (
      <motion.div
        className="stat-card flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="stat-card space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Building2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">Salon Branding</h3>
          <p className="text-sm text-muted-foreground">
            Customize how your salon appears throughout the app
          </p>
        </div>
      </div>

      {/* Salon Name */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Salon Name</Label>
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter salon name"
              className="flex-1"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNameSave}
              disabled={isUpdating || !nameValue.trim()}
              className="text-success hover:text-success hover:bg-success/10"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleNameCancel}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <span className="font-medium text-foreground">
              {settings?.salon_name || "MixR Fusion"}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setNameValue(settings?.salon_name || "");
                setIsEditingName(true);
              }}
              className="h-8 w-8"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Salon Logo</Label>
        
        {settings?.salon_logo_url ? (
          <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
            <div className="w-16 h-16 rounded-lg bg-background flex items-center justify-center overflow-hidden border border-border">
              <img
                src={settings.salon_logo_url}
                alt="Salon logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Current Logo</p>
              <p className="text-xs text-muted-foreground">
                Click to replace or remove
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="ml-2">Replace</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={removeLogo}
                disabled={isUploading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Drop your logo here
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  PNG, JPG, or WebP • Max 2MB
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Live Preview */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Preview</Label>
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground mb-3">
            How your branding appears in the header:
          </p>
          <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
            {settings?.salon_logo_url ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img
                  src={settings.salon_logo_url}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                <span className="text-background font-bold text-sm">M</span>
              </div>
            )}
            <span className="font-semibold text-lg tracking-tight text-foreground">
              {settings?.salon_name || "MixR Fusion"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
