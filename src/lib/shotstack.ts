export type ShotstackSceneInput = {
  label: string;
  caption: string;
  voiceover: string;
  backgroundUrl?: string | undefined;
  voiceoverUrl?: string | undefined;
};

export type ShotstackRenderStatus = {
  ok: boolean;
  status: "queued" | "fetching" | "rendering" | "saving" | "done" | "failed";
  url?: string | undefined;
  poster?: string | undefined;
  error?: string | undefined;
};

export const SHOTSTACK_STATUS_LABEL: Record<ShotstackRenderStatus["status"], string> = {
  queued: "Queued in the render farm",
  fetching: "Fetching media assets",
  rendering: "Rendering MP4 in the cloud",
  saving: "Saving final file",
  done: "Render complete",
  failed: "Render failed",
};

/** Vertical 9:16 output presets. */
export const RESOLUTION_PRESETS = [
  { id: "sd", label: "540 × 960 (draft)", width: 540, height: 960 },
  { id: "hd", label: "720 × 1280 (HD)", width: 720, height: 1280 },
  { id: "fhd", label: "1080 × 1920 (Full HD)", width: 1080, height: 1920 },
] as const;

export type ResolutionId = (typeof RESOLUTION_PRESETS)[number]["id"];

export const QUALITY_PRESETS = [
  { id: "low", label: "Low — fastest render" },
  { id: "medium", label: "Medium — balanced" },
  { id: "high", label: "High — best quality" },
] as const;

export type QualityId = (typeof QUALITY_PRESETS)[number]["id"];

export const FPS_OPTIONS = [24, 25, 30] as const;
