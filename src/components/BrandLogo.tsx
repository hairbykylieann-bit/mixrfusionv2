import { cn } from "@/lib/utils";

/**
 * The MixRFusion lockup: MIX [metallic R] FUSION.
 * Brand source of truth: vault note "Redesign Brief — MixRFusion Brand".
 */
interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  tagline?: boolean;
  className?: string;
}

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
};

export function BrandLogo({ size = "md", tagline = false, className }: BrandLogoProps) {
  return (
    <div className={cn("select-none", className)}>
      <div
        className={cn(
          "font-display uppercase leading-none flex items-baseline justify-center gap-[0.3em] tracking-[0.22em]",
          SIZES[size],
        )}
      >
        <span className="text-foreground font-normal">Mix</span>
        <span className="text-metallic font-bold text-[1.3em] -mb-[0.05em] tracking-normal">R</span>
        <span className="text-foreground font-normal">Fusion</span>
      </div>
      {tagline && (
        <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-muted-foreground text-center">
          Color, cost, and inventory — finally fused.
        </p>
      )}
    </div>
  );
}
