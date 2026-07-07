import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Check, StickyNote, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasToolbar } from "./canvas/CanvasToolbar";
import { CanvasPage, DrawingCanvas, Tool } from "./canvas/DrawingCanvas";
import { TEMPLATES, VIEWBOX_H, VIEWBOX_W } from "./canvas/HeadSheetTemplates";
import { renderToStaticMarkup } from "react-dom/server";

export interface CanvasData {
  version: 1;
  pages: CanvasPage[];
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  value: CanvasData | null;
  onSave: (data: CanvasData, previewBlob: Blob | null) => void | Promise<void>;
}

const emptyData = (): CanvasData => ({
  version: 1,
  pages: TEMPLATES.map((t) => ({ template: t.key, strokes: [], texts: [] })),
  notes: "",
});

const isPageEmpty = (p: CanvasPage) =>
  p.strokes.length === 0 && p.texts.every((t) => !t.text.trim());

export function SessionCanvasModal({ open, onClose, value, onSave }: Props) {
  const [data, setData] = useState<CanvasData>(() => value ?? emptyData());
  const [activeIdx, setActiveIdx] = useState(0);
  const [view, setView] = useState<"sheet" | "notes">("sheet");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>("#0f172a");
  const [size, setSize] = useState<number>(6);
  const [saving, setSaving] = useState(false);

  // Per-page undo/redo stacks
  const undoStacks = useRef<Map<number, CanvasPage[]>>(new Map());
  const redoStacks = useRef<Map<number, CanvasPage[]>>(new Map());
  const [, force] = useState(0);

  useEffect(() => {
    if (open) {
      const incoming = value ?? emptyData();
      // Normalize: ensure all templates exist
      const pages = TEMPLATES.map((t) =>
        incoming.pages.find((p) => p.template === t.key) ?? { template: t.key, strokes: [], texts: [] },
      );
      setData({ version: 1, pages, notes: incoming.notes ?? "" });
      setActiveIdx(0);
      setView("sheet");
      undoStacks.current.clear();
      redoStacks.current.clear();
    }
  }, [open, value]);

  const updatePage = (next: CanvasPage) => {
    const prev = data.pages[activeIdx];
    const u = undoStacks.current.get(activeIdx) ?? [];
    u.push(prev);
    if (u.length > 50) u.shift();
    undoStacks.current.set(activeIdx, u);
    redoStacks.current.set(activeIdx, []);
    const pages = data.pages.slice();
    pages[activeIdx] = next;
    setData({ ...data, pages });
    force((n) => n + 1);
  };

  const undo = () => {
    const u = undoStacks.current.get(activeIdx) ?? [];
    if (u.length === 0) return;
    const prev = u.pop()!;
    const r = redoStacks.current.get(activeIdx) ?? [];
    r.push(data.pages[activeIdx]);
    redoStacks.current.set(activeIdx, r);
    undoStacks.current.set(activeIdx, u);
    const pages = data.pages.slice();
    pages[activeIdx] = prev;
    setData({ ...data, pages });
  };
  const redo = () => {
    const r = redoStacks.current.get(activeIdx) ?? [];
    if (r.length === 0) return;
    const next = r.pop()!;
    const u = undoStacks.current.get(activeIdx) ?? [];
    u.push(data.pages[activeIdx]);
    undoStacks.current.set(activeIdx, u);
    redoStacks.current.set(activeIdx, r);
    const pages = data.pages.slice();
    pages[activeIdx] = next;
    setData({ ...data, pages });
  };
  const clearPage = () => {
    updatePage({ ...data.pages[activeIdx], strokes: [], texts: [] });
  };

  const canUndo = (undoStacks.current.get(activeIdx)?.length ?? 0) > 0;
  const canRedo = (redoStacks.current.get(activeIdx)?.length ?? 0) > 0;

  const flattenToPng = async (): Promise<Blob | null> => {
    // Pick first non-empty page as preview
    const previewPage = data.pages.find((p) => !isPageEmpty(p)) ?? null;
    if (!previewPage) return null;

    // Inline the head sheet template (if any) as a data URL so canvas.toBlob
    // does not taint from the CDN-hosted image.
    let templateDataUrl: string | null = null;
    if (previewPage.template !== "blank") {
      const { TEMPLATE_URLS } = await import("./canvas/HeadSheetTemplates");
      try {
        const res = await fetch(TEMPLATE_URLS[previewPage.template as Exclude<typeof previewPage.template, "blank">]);
        const blob = await res.blob();
        templateDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        templateDataUrl = null;
      }
    }

    const svgMarkup = renderToStaticMarkup(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        width={VIEWBOX_W}
        height={VIEWBOX_H}
      >
        <rect x={0} y={0} width={VIEWBOX_W} height={VIEWBOX_H} fill="#ffffff" />
        {templateDataUrl && (
          <image
            href={templateDataUrl}
            xlinkHref={templateDataUrl}
            x={0}
            y={0}
            width={VIEWBOX_W}
            height={VIEWBOX_H}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.85}
          />
        )}
        {previewPage.strokes.map((s) => {
          const d = s.points.reduce((acc, p, i) =>
            i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "");
          return (
            <path
              key={s.id}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.size}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.tool === "highlighter" ? 0.35 : 1}
            />
          );
        })}
        {previewPage.texts.map((t) => (
          <text key={t.id} x={t.x} y={t.y} fontSize={t.size} fill={t.color}>
            {t.text}
          </text>
        ))}
      </svg>
    );

    return new Promise<Blob | null>((resolve) => {
      const img = new Image();
      const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = VIEWBOX_W;
        canvas.height = VIEWBOX_H;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        try {
          canvas.toBlob((b) => resolve(b), "image/png", 0.9);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const blob = await flattenToPng();
      await onSave(data, blob);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const activePage = data.pages[activeIdx];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 gap-0 rounded-none border-0 sm:rounded-none">
        <VisuallyHidden>
          <DialogTitle>Session head sheet & notes</DialogTitle>
          <DialogDescription>Sketch placements and add labels on head sheet templates.</DialogDescription>
        </VisuallyHidden>
        <div className="flex flex-col h-full bg-muted/30">

          {/* Top bar */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* View switcher: Head Sheet vs Notes */}
            <div className="flex items-center gap-1 bg-muted rounded-full p-1">
              <button
                onClick={() => setView("sheet")}
                className={cn(
                  "px-3 h-8 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors",
                  view === "sheet" ? "bg-background shadow text-foreground" : "text-muted-foreground",
                )}
              >
                <Pencil className="w-3.5 h-3.5" />
                Head Sheet
              </button>
              <button
                onClick={() => setView("notes")}
                className={cn(
                  "px-3 h-8 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors",
                  view === "notes" ? "bg-background shadow text-foreground" : "text-muted-foreground",
                )}
              >
                <StickyNote className="w-3.5 h-3.5" />
                Notes
                {(data.notes ?? "").trim().length > 0 && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            </div>

            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Check className="w-4 h-4" />
              {saving ? "Saving…" : "Done"}
            </Button>
          </div>

          {view === "sheet" ? (
            <>
              {/* Template tabs */}
              <div className="flex items-center gap-1 overflow-x-auto px-4 py-2 border-b border-foreground/10 bg-background/60">
                {TEMPLATES.map((t, i) => {
                  const empty = isPageEmpty(data.pages[i]);
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "px-3 h-8 rounded-full text-xs font-medium uppercase tracking-wider transition-colors whitespace-nowrap",
                        activeIdx === i
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {t.label}
                      {!empty && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />}
                    </button>
                  );
                })}
              </div>

              {/* Canvas area */}
              <div className="flex-1 flex items-stretch overflow-hidden">
                <div className="hidden sm:flex p-3 items-start">
                  <CanvasToolbar
                    tool={tool} color={color} size={size}
                    onToolChange={setTool} onColorChange={setColor} onSizeChange={setSize}
                    onUndo={undo} onRedo={redo} onClear={clearPage}
                    canUndo={canUndo} canRedo={canRedo}
                  />
                </div>

                <div className="flex-1 p-3 flex items-center justify-center min-h-0">
                  <div
                    className="bg-background rounded-2xl shadow-xl border border-foreground/10 overflow-hidden"
                    style={{ aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}`, height: "100%", maxWidth: "100%" }}
                  >
                    <DrawingCanvas
                      page={activePage}
                      tool={tool}
                      color={color}
                      size={size}
                      onChange={updatePage}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile toolbar */}
              <div className="sm:hidden border-t border-foreground/10 bg-background/90 backdrop-blur-xl p-2 flex justify-center">
                <div className="flex gap-2 overflow-x-auto">
                  <CanvasToolbar
                    tool={tool} color={color} size={size}
                    onToolChange={setTool} onColorChange={setColor} onSizeChange={setSize}
                    onUndo={undo} onRedo={redo} onClear={clearPage}
                    canUndo={canUndo} canRedo={canRedo}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Notes view */
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
              <div className="w-full max-w-2xl">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Session Notes
                </label>
                <Textarea
                  value={data.notes ?? ""}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  placeholder="Processing time, application technique, results, client preferences…"
                  className="mt-2 min-h-[60vh] text-base leading-relaxed resize-none"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
