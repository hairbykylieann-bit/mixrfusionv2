import { useRef, useState, useEffect } from "react";
import { Camera, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useSalonBowls, SalonBowl } from "@/hooks/useSalonBowls";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultUnit?: string;
  onCreated?: (bowl: SalonBowl) => void;
}

export function AddBowlPresetDialog({ open, onOpenChange, defaultUnit = "g", onCreated }: Props) {
  const { createBowl } = useSalonBowls();
  const { tenantId } = useTenant();
  const [name, setName] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [tareUnit, setTareUnit] = useState(defaultUnit);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTareWeight("");
      setTareUnit(defaultUnit);
      setPhotoUrl(null);
    }
  }, [open, defaultUnit]);

  const handleUpload = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WebP image");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 2MB");
      return;
    }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${tenantId}/bowls/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("salon-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("salon-assets").getPublicUrl(path);
      setPhotoUrl(publicUrl);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const weight = parseFloat(tareWeight);
    if (!name.trim()) return toast.error("Bowl name is required");
    if (isNaN(weight) || weight < 0) return toast.error("Enter a valid bowl weight");
    setIsSaving(true);
    try {
      const created = await createBowl({
        name: name.trim(),
        tare_weight: weight,
        tare_unit: tareUnit,
        photo_url: photoUrl,
      });
      onCreated?.(created);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bowl</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Photo</Label>
            {photoUrl ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-background">
                  <img src={photoUrl} alt="Bowl" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span className="ml-2">Upload</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>
                    <Camera className="w-4 h-4" />
                    <span className="ml-2">Take photo</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setPhotoUrl(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Upload
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>
                  <Camera className="w-4 h-4" />
                  Take photo
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            <p className="text-xs text-muted-foreground">PNG, JPG, or WebP, up to 2MB.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bowl-name">Name</Label>
            <Input
              id="bowl-name"
              placeholder="e.g. Pink small bowl"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bowl-weight">Empty weight</Label>
              <Input
                id="bowl-weight"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0"
                value={tareWeight}
                onChange={(e) => setTareWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={tareUnit} onValueChange={setTareUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save bowl"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
