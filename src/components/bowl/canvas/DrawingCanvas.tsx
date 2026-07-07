import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Check, X } from "lucide-react";
import { HeadSheetTemplate, TemplateKey, VIEWBOX_H, VIEWBOX_W } from "./HeadSheetTemplates";

export type Tool = "pen" | "highlighter" | "eraser" | "text";

export interface Stroke {
  id: string;
  tool: "pen" | "highlighter";
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

export interface TextLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

export interface CanvasPage {
  template: TemplateKey;
  strokes: Stroke[];
  texts: TextLabel[];
}

interface Props {
  page: CanvasPage;
  tool: Tool;
  color: string;
  size: number;
  onChange: (next: CanvasPage) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const mx = (prev.x + p.x) / 2;
    const my = (prev.y + p.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function DrawingCanvas({ page, tool, color, size, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drawing, setDrawing] = useState<Stroke | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  const getPoint = useCallback((evt: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * VIEWBOX_W;
    const y = ((evt.clientY - rect.top) / rect.height) * VIEWBOX_H;
    return { x, y };
  }, []);

  // Focus input synchronously after it mounts so iOS opens the keyboard
  useLayoutEffect(() => {
    if (editingText && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editingText]);

  const textPixelSize = Math.max(36, size * 7);

  const commitText = (id: string, raw: string) => {
    const v = raw.trim();
    if (!v) {
      onChange({ ...page, texts: page.texts.filter((t) => t.id !== id) });
    } else {
      onChange({
        ...page,
        texts: page.texts.map((t) => (t.id === id ? { ...t, text: v } : t)),
      });
    }
    setEditingText(null);
    setDraftValue("");
  };

  const cancelText = (id: string) => {
    // Remove the in-progress label entirely
    onChange({ ...page, texts: page.texts.filter((t) => t.id !== id || t.text) });
    setEditingText(null);
    setDraftValue("");
  };

  // Commit any in-progress label when tool changes
  useEffect(() => {
    if (editingText) commitText(editingText, draftValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // If editing a text label, ignore canvas pointer events
    if (editingText) return;
    const p = getPoint(e);

    if (tool === "text") {
      // Re-open an existing nearby label instead of stacking a new one
      const hit = page.texts.find(
        (t) => Math.hypot(t.x - p.x, t.y - p.y) < Math.max(80, t.size),
      );
      if (hit) {
        setDraftValue(hit.text);
        setEditingText(hit.id);
        return;
      }
      const id = uid();
      const next: CanvasPage = {
        ...page,
        texts: [...page.texts, { id, x: p.x, y: p.y, text: "", color, size: textPixelSize }],
      };
      onChange(next);
      setDraftValue("");
      setEditingText(id);
      return;
    }

    // Capture pointer for stroke / erase gestures
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (tool === "eraser") {
      const r = size * 4;
      const idx = page.strokes.findIndex((s) =>
        s.points.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < r),
      );
      if (idx >= 0) {
        const strokes = page.strokes.slice();
        strokes.splice(idx, 1);
        onChange({ ...page, strokes });
      }
      return;
    }

    const s: Stroke = {
      id: uid(),
      tool: tool === "highlighter" ? "highlighter" : "pen",
      color,
      size,
      points: [p],
    };
    setDrawing(s);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing && tool !== "eraser") return;
    const p = getPoint(e);

    if (tool === "eraser" && (e.buttons & 1)) {
      const r = size * 4;
      const idx = page.strokes.findIndex((s) =>
        s.points.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < r),
      );
      if (idx >= 0) {
        const strokes = page.strokes.slice();
        strokes.splice(idx, 1);
        onChange({ ...page, strokes });
      }
      return;
    }

    if (drawing) {
      setDrawing({ ...drawing, points: [...drawing.points, p] });
    }
  };

  const handlePointerUp = () => {
    if (drawing) {
      onChange({ ...page, strokes: [...page.strokes, drawing] });
      setDrawing(null);
    }
  };

  const editingLabel = editingText ? page.texts.find((t) => t.id === editingText) : null;

  return (
    <div ref={wrapperRef} className="relative w-full h-full select-none touch-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair" }}
      >
        <rect x={0} y={0} width={VIEWBOX_W} height={VIEWBOX_H} fill="hsl(var(--background))" />
        <HeadSheetTemplate template={page.template} />

        {page.strokes.map((s) => (
          <path
            key={s.id}
            d={pointsToPath(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.size}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={s.tool === "highlighter" ? 0.35 : 1}
          />
        ))}
        {drawing && (
          <path
            d={pointsToPath(drawing.points)}
            fill="none"
            stroke={drawing.color}
            strokeWidth={drawing.size}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={drawing.tool === "highlighter" ? 0.35 : 1}
          />
        )}

        {page.texts.map((t) => {
          if (editingText === t.id || !t.text) return null;
          return (
            <text
              key={t.id}
              x={t.x}
              y={t.y}
              fontSize={t.size}
              fill={t.color}
              style={{ pointerEvents: "none" }}
            >
              {t.text}
            </text>
          );
        })}
      </svg>

      {/* Text editing overlay - rendered above the SVG */}
      {editingLabel && (
        <div
          className="absolute z-10 flex items-center gap-1"
          style={{
            left: `${Math.min(80, Math.max(2, (editingLabel.x / VIEWBOX_W) * 100))}%`,
            top: `${Math.min(85, Math.max(2, (editingLabel.y / VIEWBOX_H) * 100))}%`,
            transform: "translate(-8px, -50%)",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            data-canvas-text
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText(editingLabel.id, draftValue);
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelText(editingLabel.id);
              }
            }}
            style={{ color: editingLabel.color, minWidth: 180 }}
            className="bg-background border-2 border-primary rounded-md px-2 py-1.5 text-base font-medium shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Type label…"
          />
          <button
            type="button"
            onClick={() => commitText(editingLabel.id, draftValue)}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
            aria-label="Place label"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => cancelText(editingLabel.id)}
            className="w-9 h-9 rounded-full bg-background border border-foreground/20 shadow-lg flex items-center justify-center"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
