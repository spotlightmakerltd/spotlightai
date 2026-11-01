import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  describeFalExecutionError,
  falFetchResult,
  falFetchStatus,
  falSubmit,
} from "./fal.server";
import { MOTION_CREDITS_PER_SCENE } from "./pricing";

const SUPABASE_URL = "https://xhzmwcevyxaphsxibnxg.supabase.co";

const StartSchema = z.object({
  visualPrompt: z.string().min(1),
  /** Publicly reachable image to animate (image-to-video); omitted = text-to-video. */
  imageUrl: z.string().url().optional(),
  durationSeconds: z.union([z.literal(5), z.literal(10)]).default(5),
  /** Supabase access token — motion scenes are billed and gated server-side. */
  accessToken: z.string().min(10),
});

export type SceneVideoStart = {
  ok: boolean;
  requestId?: string;
  creditsLeft?: number;
  error?: string;
};

/** Authenticated profile lookup with the service-role client. */
async function billedProfile(accessToken: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const key =
    process.env["SPOTLIGHT_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) return { error: "Billing is not configured yet — try again shortly." as string };
  const admin = createClient(process.env["SUPABASE_URL"] ?? SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !userData.user) return { error: "Your session expired — sign in again." };
  const { data: profile } = await admin
    .from("profiles")
    .select("id, credits, subscription_tier")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile) return { error: "Account profile not found — sign in again." };
  return { profile };
}

/**
 * Starts a fal.ai generation for one scene's motion clip and returns the job id.
 * Pro tier only: every 5-second motion scene is billed up front
 * (MOTION_CREDITS_PER_SCENE credits) because the engine bills us per second.
 * Generation takes 30s–3min, so the caller polls checkSceneVideo afterwards.
 */
export const startSceneVideo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => StartSchema.parse(data))
  .handler(async ({ data }): Promise<SceneVideoStart> => {
    const billed = await billedProfile(data.accessToken);
    if ("error" in billed) return { ok: false, error: billed.error };
    const profile = billed.profile!;

    if (profile.subscription_tier !== "pro") {
      return {
        ok: false,
        error:
          "Real motion video is a Pro feature — upgrade to a Pro or Studio pack to unlock it.",
      };
    }
    if (Number(profile.credits) < MOTION_CREDITS_PER_SCENE) {
      return {
        ok: false,
        error: `Not enough credits — each motion scene uses ${MOTION_CREDITS_PER_SCENE} credits. Top up to continue.`,
      };
    }

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

      // Charged only after the engine accepted the job. Compare-and-set guards
      // against two concurrent spends spending the same credits twice.
      const current = Number(profile.credits);
      const { createClient } = await import("@supabase/supabase-js");
      const adminKey =
        process.env["SPOTLIGHT_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
      const admin = createClient(process.env["SUPABASE_URL"] ?? SUPABASE_URL, adminKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: updated } = await admin
        .from("profiles")
        .update({ credits: current - MOTION_CREDITS_PER_SCENE })
        .eq("id", profile.id)
        .eq("credits", current)
        .select("credits")
        .maybeSingle();
      if (!updated) {
        return {
          ok: false,
          error: `Not enough credits — each motion scene uses ${MOTION_CREDITS_PER_SCENE} credits. Top up to continue.`,
        };
      }
      return {
        ok: true,
        requestId,
        creditsLeft: Number((updated as { credits: number }).credits),
      };
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
