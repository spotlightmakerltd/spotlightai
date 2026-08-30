import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ShotstackRenderStatus } from "./shotstack";

const SceneSchema = z.object({
  label: z.string(),
  caption: z.string(),
  voiceover: z.string(),
  backgroundUrl: z.string().url().optional(),
  voiceoverUrl: z.string().url().optional(),
});

const SubmitSchema = z.object({
  title: z.string(),
  businessName: z.string(),
  cta: z.string(),
  durationSeconds: z.number().min(5).max(120),
  watermark: z.boolean(),
  scenes: z.array(SceneSchema).min(1),
  style: z.object({
    fontFamily: z.string(),
    fontSize: z.number(),
    highlight: z.string(),
    textColor: z.string(),
    uppercase: z.boolean(),
  }),
  resolution: z.enum(["sd", "hd", "fhd"]).default("fhd"),
  quality: z.enum(["low", "medium", "high"]).default("medium"),
  fps: z.number().default(30),
  generateVoiceover: z.boolean().default(true),
});


type SubmitInput = z.infer<typeof SubmitSchema>;

const EDIT_BASE = "https://api.shotstack.io/edit/v1";
const CREATE_BASE = "https://api.shotstack.io/create/v1";

function headers(key: string) {
  return { "x-api-key": key, "Content-Type": "application/json" };
}

/** Generates a Shotstack text-to-speech asset and waits for its hosted URL. */
async function synthesizeVoiceover(key: string, text: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${CREATE_BASE}/assets`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({
        provider: "shotstack",
        options: { type: "text-to-speech", text: text.slice(0, 900), voice: "Matthew" },
      }),
    });
    if (!res.ok) {
      console.error("Shotstack TTS create failed", res.status, await res.text());
      return undefined;
    }
    const created = (await res.json()) as { data?: { id?: string } };
    const id = created.data?.id;
    if (!id) return undefined;

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(`${CREATE_BASE}/assets/${id}`, { headers: headers(key) });
      if (!poll.ok) continue;
      const json = (await poll.json()) as {
        data?: { attributes?: { status?: string; url?: string } };
      };
      const status = json.data?.attributes?.status;
      if (status === "done" || status === "ready") return json.data?.attributes?.url;
      if (status === "failed") return undefined;
    }
  } catch (err) {
    console.error("Shotstack TTS error", err);
  }
  return undefined;
}

const SIZES = {
  sd: { width: 540, height: 960 },
  hd: { width: 720, height: 1280 },
  fhd: { width: 1080, height: 1920 },
} as const;

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function buildTimeline(input: SubmitInput, voiceoverUrls: Array<string | undefined>) {
  const per = input.durationSeconds / input.scenes.length;
  const size = SIZES[input.resolution];
  const scale = size.width / 1080;
  const background: Array<Record<string, unknown>> = [];
  const captionTrack: Array<Record<string, unknown>> = [];
  const labelTrack: Array<Record<string, unknown>> = [];
  const audioTrack: Array<Record<string, unknown>> = [];

  input.scenes.forEach((scene, i) => {
    const start = Number((i * per).toFixed(2));
    const length = Number(per.toFixed(2));

    background.push(
      scene.backgroundUrl
        ? {
            asset: isVideoUrl(scene.backgroundUrl)
              ? { type: "video", src: scene.backgroundUrl, volume: 0 }
              : { type: "image", src: scene.backgroundUrl },
            start,
            length,
            fit: "cover",
            scale: 1,
            ...(isVideoUrl(scene.backgroundUrl)
              ? {}
              : { effect: i % 2 === 0 ? "zoomIn" : "slideLeft" }),
            transition: { in: "fade", out: "fade" },
          }
        : {
            asset: {
              type: "html",
              width: size.width,
              height: size.height,
              html: `<div></div>`,
              css: `div { width:${size.width}px; height:${size.height}px; background: linear-gradient(160deg, #0f0b23 0%, ${input.style.highlight} 100%); }`,
            },
            start,
            length,
            fit: "cover",
            transition: { in: "fade", out: "fade" },
          },
    );



    const caption = input.style.uppercase ? scene.caption.toUpperCase() : scene.caption;
    captionTrack.push({
      asset: {
        type: "html",
        width: Math.round(900 * scale),
        height: Math.round(500 * scale),
        html: `<div class="cap">${escapeHtml(caption)}</div>`,
        css: `.cap { font-family: '${input.style.fontFamily.replace(/'/g, "").split(",")[0]}', sans-serif; font-size: ${Math.round(input.style.fontSize * 2 * scale)}px; font-weight: 700; color: ${input.style.textColor}; background-color: ${input.style.highlight}; padding: ${Math.round(18 * scale)}px ${Math.round(28 * scale)}px; text-align: center; line-height: 1.2; }`,

        position: "center",
      },
      start,
      length,
      position: "center",
      transition: { in: "slideUp", out: "fade" },
    });

    labelTrack.push({
      asset: {
        type: "title",
        text: scene.label.toUpperCase(),
        style: "minimal",
        size: "x-small",
        color: "#ffffff",
        position: "top",
      },
      start,
      length,
      opacity: 0.8,
    });

    const vo = scene.voiceoverUrl ?? voiceoverUrls[i];
    if (vo) audioTrack.push({ asset: { type: "audio", src: vo, volume: 1 }, start, length });
  });

  const overlays: Array<Record<string, unknown>> = [
    {
      asset: {
        type: "title",
        text: `${input.businessName} — ${input.cta}`,
        style: "future",
        size: "small",
        color: "#ffffff",
        position: "bottom",
      },
      start: Math.max(0, input.durationSeconds - Math.min(4, input.durationSeconds / 3)),
      length: Math.min(4, input.durationSeconds / 3),
      transition: { in: "fade", out: "fade" },
    },
  ];

  if (input.watermark) {
    overlays.push({
      asset: {
        type: "title",
        text: "SPOTLIGHTMAKER — FREE PLAN",
        style: "chunk",
        size: "x-small",
        color: "#ffffff",
        position: "center",
      },
      start: 0,
      length: input.durationSeconds,
      opacity: 0.45,
    });
  }

  const tracks = [
    { clips: overlays },
    { clips: labelTrack },
    { clips: captionTrack },
    { clips: background },
  ];
  if (audioTrack.length) tracks.push({ clips: audioTrack });

  return {
    timeline: { background: "#0f0b23", tracks },
    output: { format: "mp4", size: { width: 1080, height: 1920 }, fps: 30 },
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export const submitShotstackRender = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SubmitSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const key = process.env["SHOTSTACK_API_KEY"];
    if (!key) {
      return {
        ok: false,
        error: "Cloud rendering is not configured yet — add your Shotstack API key.",
      };
    }

    let voiceoverUrls: Array<string | undefined> = [];
    if (data.generateVoiceover) {
      voiceoverUrls = await Promise.all(
        data.scenes.map((s) => (s.voiceoverUrl ? undefined : synthesizeVoiceover(key, s.voiceover))),
      );
    }

    const payload = buildTimeline(data, voiceoverUrls);
    const res = await fetch(`${EDIT_BASE}/render`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Shotstack render submit failed", res.status, text);
      return { ok: false, error: `Shotstack rejected the render (${res.status}).` };
    }
    const json = JSON.parse(text) as { response?: { id?: string } };
    if (!json.response?.id) return { ok: false, error: "Shotstack did not return a render id." };
    return { ok: true, id: json.response.id };
  });

export const getShotstackRender = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<ShotstackRenderStatus> => {
    const key = process.env["SHOTSTACK_API_KEY"];
    if (!key) return { ok: false, status: "failed", error: "Missing Shotstack API key." };

    const res = await fetch(`${EDIT_BASE}/render/${data.id}`, { headers: headers(key) });
    if (!res.ok) {
      return { ok: false, status: "failed", error: `Status check failed (${res.status}).` };
    }
    const json = (await res.json()) as {
      response?: { status?: string; url?: string; poster?: string; error?: string };
    };
    const status = (json.response?.status ?? "queued") as ShotstackRenderStatus["status"];
    return {
      ok: status !== "failed",
      status,
      url: json.response?.url,
      poster: json.response?.poster,
      error: json.response?.error,
    };
  });
