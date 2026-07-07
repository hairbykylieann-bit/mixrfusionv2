import frontAsset from "@/assets/headsheets/front.png.asset.json";
import backAsset from "@/assets/headsheets/back.png.asset.json";
import leftAsset from "@/assets/headsheets/left.png.asset.json";
import rightAsset from "@/assets/headsheets/right.png.asset.json";
import topAsset from "@/assets/headsheets/top.png.asset.json";

export type TemplateKey = "front" | "back" | "left" | "right" | "top" | "blank";

export const TEMPLATES: { key: TemplateKey; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "top", label: "Top" },
  { key: "blank", label: "Blank" },
];

// Native aspect ratio of the rendered head sheet images (1024x1536).
export const VIEWBOX_W = 1024;
export const VIEWBOX_H = 1536;

export const TEMPLATE_URLS: Record<Exclude<TemplateKey, "blank">, string> = {
  front: frontAsset.url,
  back: backAsset.url,
  left: leftAsset.url,
  right: rightAsset.url,
  top: topAsset.url,
};

export function HeadSheetTemplate({ template }: { template: TemplateKey }) {
  if (template === "blank") return null;
  const url = TEMPLATE_URLS[template];
  return (
    <image
      href={url}
      x={0}
      y={0}
      width={VIEWBOX_W}
      height={VIEWBOX_H}
      preserveAspectRatio="xMidYMid meet"
      opacity={0.85}
    />
  );
}
