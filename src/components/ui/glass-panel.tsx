import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** rounded-full pill style (control clusters) vs default rounded */
  pill?: boolean;
  /** stronger blur + tint for floating overlays */
  intense?: boolean;
}

/**
 * Warm-tinted frosted glass surface, paper-aware.
 * Use sparingly — only where surface hierarchy needs to lift above page content.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, pill, intense, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass",
          pill ? "rounded-full" : "rounded-[var(--radius)]",
          intense && "glass-intense",
          className,
        )}
        {...props}
      />
    );
  },
);
GlassPanel.displayName = "GlassPanel";
