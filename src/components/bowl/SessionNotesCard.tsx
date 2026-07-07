import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { CanvasData, SessionCanvasModal } from "./SessionCanvasModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tenantId: string | null;
  sessionId?: string | null;
  value: CanvasData | null;
  previewUrl: string | null;
  onChange: (next: { data: CanvasData; previewUrl: string | null }) => void;
}

export function SessionNotesCard({ tenantId, sessionId, value, previewUrl, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const handleSave = async (data: CanvasData, blob: Blob | null) => {
    let url = previewUrl;
    if (blob && tenantId) {
      const key = `${tenantId}/session-canvases/${sessionId ?? "draft-" + Date.now()}.png`;
      const { error } = await supabase.storage
        .from("salon-assets")
        .upload(key, blob, { upsert: true, contentType: "image/png", cacheControl: "0" });
      if (error) {
        toast.error("Couldn't save preview image");
      } else {
        const { data: pub } = supabase.storage.from("salon-assets").getPublicUrl(key);
        url = `${pub.publicUrl}?t=${Date.now()}`;
      }
    } else if (!blob) {
      url = null;
    }
    onChange({ data, previewUrl: url });
  };

  const filledPages = value?.pages.filter((p) => p.strokes.length > 0 || p.texts.some((t) => t.text.trim())).length ?? 0;
  const hasDrawings = filledPages > 0;
  const hasNotes = !!value?.notes?.trim();
  const hasContent = hasDrawings || hasNotes;

  const summary = hasContent
    ? [
        hasDrawings ? `${filledPages} sketch${filledPages === 1 ? "" : "es"}` : null,
        hasNotes ? "notes added" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Sketch placements";

  const subline = hasContent
    ? "Tap to edit"
    : "\n";

  return (
    <>
      <button
        type="button"
        aria-label="Open head sheet and notes editor"
        onClick={() => setOpen(true)}
        className="group relative w-full overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {hasContent && (
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
        )}
        <div className="flex items-stretch">
          <div className="relative w-16 sm:w-20 shrink-0 border-r border-border overflow-hidden bg-muted/30">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Head sheet preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(hsl(var(--foreground)/0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)/0.06) 1px, transparent 1px)",
                  backgroundSize: "10px 10px",
                }}
              >
                <NotebookPen className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Head Sheet &amp; Notes
            </div>
            <div className="mt-0.5 text-base font-bold text-foreground truncate">
              {summary}
            </div>
            <div className="text-xs text-muted-foreground truncate">{subline}</div>
          </div>
        </div>
      </button>

      <SessionCanvasModal
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onSave={handleSave}
      />
    </>
  );
}
