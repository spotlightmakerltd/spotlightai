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
  queued: "Queued for production",
  fetching: "Gathering your visuals",
  rendering: "Producing your video",
  saving: "Finishing your video",
  done: "Your ad is ready",
  failed: "Production failed",
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

/** Voice options offered in the studio. */
export const VOICE_OPTIONS = [
  { id: "en-NG-EzinneNeural", label: "Nigerian English — Ezinne (female)", group: "Nigerian English" },
  { id: "en-NG-AbeoNeural", label: "Nigerian English — Abeo (male)", group: "Nigerian English" },
  { id: "en-US-AriaNeural", label: "US English — Aria (female)", group: "US English" },
  { id: "en-US-ChristopherNeural", label: "US English — Christopher (male)", group: "US English" },
] as const;

export type VoiceId = (typeof VOICE_OPTIONS)[number]["id"];
export const DEFAULT_VOICE: VoiceId = "en-NG-EzinneNeural";
