import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CircleDot, Plus, Pencil, Trash2, Upload, Loader2, ImageIcon, X, Check, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useSalonBowls, SalonBowl } from "@/hooks/useSalonBowls";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface BowlFormState {
  name: string;
  tare_weight: string;
  tare_unit: string;
  photo_url: string | null;
}

function defaultForm(preferredUnit: string = "g"): BowlFormState {
  return { name: "", tare_weight: "", tare_unit: preferredUnit, photo_url: null };
}

export function BowlsCard() {
  const { bowls, isLoading, createBowl, updateBowl, deleteBowl } = useSalonBowls();
  const { settings } = useSalonSettings();
  const { tenantId } = useTenant();
  const preferredUnit = settings?.preferred_display_unit || "g"; // match DB default

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SalonBowl | null>(null);
  const [form, setForm] = useState<BowlFormState>(defaultForm(preferredUnit));
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm(preferredUnit));
    setOpen(true);
  };


  const openEdit = (b: SalonBowl) => {
    setEditing(b);
    setForm({
      name: b.name,
      tare_weight: String(b.tare_weight),
      tare_unit: b.tare_unit,
      photo_url: b.photo_url,
    });
    setOpen(true);
  };

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
      setForm(f => ({ ...f, photo_url: publicUrl }));
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const weight = parseFloat(form.tare_weight);
    if (!form.name.trim()) return toast.error("Bowl name is required");
    if (isNaN(weight) || weight < 0) return toast.error("Enter a valid weight");
    setIsSaving(true);
    try {
      if (editing) {
        await updateBowl({
          id: editing.id,
          name: form.name.trim(),
          tare_weight: weight,
          tare_unit: form.tare_unit,
          photo_url: form.photo_url,
        });
      } else {
        await createBowl({
          name: form.name.trim(),
          tare_weight: weight,
          tare_unit: form.tare_unit,
          photo_url: form.photo_url,
        });
      }
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: SalonBowl) => {
    if (!confirm(`Delete bowl "${b.name}"?`)) return;
    await deleteBowl(b.id);
  };

  return (
    <motion.div
      className="stat-card space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Mixing Bowls</h3>
            <p className="text-sm text-muted-foreground">
              Save your bowls with their empty weight so leftover product is calculated automatically.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Add bowl
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit bowl" : "Add bowl"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Photo</Label>
                {form.photo_url ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-background">
                      <img src={form.photo_url} alt="Bowl" className="w-full h-full object-cover" />
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
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setForm(f => ({ ...f, photo_url: null }))}>
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
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />

              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Black plastic bowl"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Empty weight (tare)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={form.tare_weight}
                    onChange={(e) => setForm(f => ({ ...f, tare_weight: e.target.value }))}
                    className="flex-1"
                  />
                  <Select value={form.tare_unit} onValueChange={(v) => setForm(f => ({ ...f, tare_unit: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Place the empty bowl on the scale and enter the reading.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : bowls.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border rounded-lg">
          No bowls yet. Add one to start auto-subtracting bowl weight from leftover.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bowls.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                {b.photo_url ? (
                  <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <CircleDot className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{b.name}</p>
                <p className="text-xs text-muted-foreground">Tare: {b.tare_weight}{b.tare_unit}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(b)} className="h-8 w-8">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(b)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
