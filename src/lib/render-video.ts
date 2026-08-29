export type CaptionStyle = {
  fontFamily: string;
  fontSize: number;
  highlight: string;
  textColor: string;
  uppercase: boolean;
};

export const CAPTION_FONTS = [
  { id: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { id: "'DM Sans', sans-serif", label: "DM Sans" },
  { id: "Impact, 'Arial Black', sans-serif", label: "Impact" },
  { id: "Georgia, serif", label: "Georgia" },
  { id: "'Courier New', monospace", label: "Mono" },
];

export const HIGHLIGHT_COLORS = ["#7c3aed", "#f43f5e", "#f59e0b", "#10b981", "#0ea5e9", "#111827"];
