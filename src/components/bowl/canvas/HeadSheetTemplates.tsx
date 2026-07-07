// Head sheet templates are bundled with the app (public/headsheets/*.svg).
// They previously lived on Lovable's asset servers (/__l5e/...) and broke the
// moment the app was hosted anywhere else. To use custom artwork, replace the
// files in public/headsheets/ — keep the 1024x1536 aspect so existing saved
// sketches stay aligned.

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
  front: "/headsheets/front.svg",
  back: "/headsheets/back.svg",
  left: "/headsheets/left.svg",
  right: "/headsheets/right.svg",
  top: "/headsheets/top.svg",
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
