import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  describeFalExecutionError,
  falFetchResult,
  falFetchStatus,
  falSubmit,
} from "./fal.server";

const StartSchema = z.object({
  visualPrompt: z.string().min(1),
  /** Publicly reachable image to animate (image-to-video); omitted = text-to-video. */
  imageUrl: z.string().url().optional(),
  durationSeconds: z.union([z.literal(5), z.literal(10)]).default(5),
});

export type SceneVideoStart = { ok: boolean; requestId?: string; error?: string };

/**
 * Starts a fal.ai generation for one scene's motion clip and returns the job id.
 * Generation takes 30s–3min, so the caller polls checkSceneVideo afterwards.
 */
export const startSceneVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => StartSchema.parse(data))
  .handler(async ({ data }): Promise<SceneVideoStart> => {
    const input: Record<string, unknown> = {
      prompt: data.visualPrompt,
      duration: String(data.durationSeconds),
      negative_prompt:
        "text, words, subtitles, captions, watermark, logo, blur, distorted faces, low quality",
      cfg_scale: 0.5,
    };
    if (data.imageUrl) {
      input["image_url"] = data.imageUrl;
    } else {
      input["aspect_ratio"] = "9:16";
    }
    try {
      const requestId = await falSubmit(input, data.imageUrl ? "image" : "text");
      return { ok: true, requestId };
    } catch (err) {
      console.error("Scene video start failed", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not reach the video engine.",
      };
    }
  });

const CheckSchema = z.object({ requestId: z.string().min(8) });

export type SceneVideoCheck = {
  status: "queued" | "running" | "done" | "failed";
  queuePosition?: number;
  videoUrl?: string;
  error?: string;
};

/** Polls one fal.ai generation once; call repeatedly until done or failed. */
export const checkSceneVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CheckSchema.parse(data))
  .handler(async ({ data }): Promise<SceneVideoCheck> => {
    try {
      const state = await falFetchStatus(data.requestId);
      if (state.status === "IN_QUEUE") {
        const queuePosition = state.queue_position;
        return typeof queuePosition === "number"
          ? { status: "queued" as const, queuePosition }
          : { status: "queued" as const };
      }
      if (state.status === "IN_PROGRESS") return { status: "running" };
      // COMPLETED is also the terminal state for failed runs — check for an error first.
      if (state.error) {
        return { status: "failed", error: describeFalExecutionError(state.error, state.error_type) };
      }
      const result = await falFetchResult(data.requestId);
      const url = result?.video?.url;
      if (!url) return { status: "failed", error: "The video engine finished without a video." };
      return { status: "done", videoUrl: url };
    } catch (err) {
      console.error("Scene video status check failed", err);
      return {
        status: "failed",
        error:
          err instanceof Error ? err.message : "We lost contact with the video engine.",
      };
    }
  });
