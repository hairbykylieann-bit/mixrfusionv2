import { Pen, Highlighter, Eraser, Type, Undo2, Redo2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tool } from "./DrawingCanvas";

interface Props {
  tool: Tool;
  color: string;
  size: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onSizeChange: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const PEN_COLORS = [
  "#0f172a", // ink
  "#dc2626", // red
  "#ea580c", // orange
  "#ca8a04", // amber
  "#16a34a", // green
  "#2563eb", // blue
  "#7c3aed", // purple
  "#db2777", // pink
];

const HIGHLIGHTER_COLORS = ["#fde047", "#fca5a5", "#86efac", "#93c5fd"];

const SIZES = [
  { label: "S", value: 3 },
  { label: "M", value: 6 },
  { label: "L", value: 12 },
];

export function CanvasToolbar({
  tool, color, size,
  onToolChange, onColorChange, onSizeChange,
  onUndo, onRedo, onClear, canUndo, canRedo,
}: Props) {
  const colors = tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;

  const ToolBtn = ({ t, icon: Icon, label }: { t: Tool; icon: any; label: string }) => (
    <button
      type="button"
      onClick={() => onToolChange(t)}
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
        tool === t
          ? "bg-foreground text-background shadow-md"
          : "text-muted-foreground hover:bg-muted",
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-col gap-2 p-2 rounded-2xl border border-foreground/15 bg-background/80 backdrop-blur-xl shadow-lg">
      <ToolBtn t="pen" icon={Pen} label="Pen" />
      <ToolBtn t="highlighter" icon={Highlighter} label="Highlighter" />
      <ToolBtn t="eraser" icon={Eraser} label="Eraser" />
      <ToolBtn t="text" icon={Type} label="Text" />

      <div className="h-px bg-foreground/10 my-1" />

      {(tool === "pen" || tool === "highlighter" || tool === "text") && (
        <div className="grid grid-cols-2 gap-1.5 p-1">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={cn(
                "w-6 h-6 rounded-full border transition-transform",
                color === c ? "ring-2 ring-foreground ring-offset-1 ring-offset-background scale-110" : "border-foreground/20",
              )}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      )}

      {(tool === "pen" || tool === "highlighter" || tool === "eraser") && (
        <div className="flex flex-col gap-1 items-center pt-1">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onSizeChange(s.value)}
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors",
                size === s.value ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="h-px bg-foreground/10 my-1" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
        title="Undo"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30"
        title="Redo"
      >
        <Redo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onClear}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10"
        title="Clear page"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
