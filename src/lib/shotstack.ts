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
