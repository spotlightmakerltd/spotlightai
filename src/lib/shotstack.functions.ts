import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ShotstackRenderStatus } from "./shotstack";
import { synthesizeSpeech } from "./tts.server";


const SceneSchema = z.object({
  label: z.string(),
  caption: z.string(),
  voiceover: z.string(),
  visual: z.string().optional(),
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
  voice: z
    .enum(["en-NG-EzinneNeural", "en-NG-AbeoNeural", "en-US-AriaNeural", "en-US-ChristopherNeural"])
    .default("en-NG-EzinneNeural"),
});


type SubmitInput = z.infer<typeof SubmitSchema>;

const EDIT_BASE = "https://api.shotstack.io/edit/v1";
const CREATE_BASE = "https://api.shotstack.io/create/v1";

function headers(key: string) {
  return { "x-api-key": key, "Content-Type": "application/json" };
}

/** Generates a hosted voiceover audio URL for a line of script. */
async function synthesizeVoiceover(
  key: string,
  text: string,
  voice: string,
): Promise<string | undefined> {
  // Preferred path: hosted speech generation, uploaded to the render CDN.
  const speech = await synthesizeSpeech(text, voice);
  if (speech) {
    const hosted = await ingestToShotstack(key, speech.bytes, speech.mime);
    if (hosted) return hosted;
  }

  try {
    const res = await fetch(`${CREATE_BASE}/assets`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({
        provider: "shotstack",
        options: { type: "text-to-speech", text: text.slice(0, 900), voice },
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

const INGEST_BASE = "https://api.shotstack.io/ingest/v1";

/** Uploads raw bytes to Shotstack's hosted CDN and returns the public source URL. */
async function ingestToShotstack(key: string, bytes: Uint8Array, mime: string) {
  const create = await fetch(`${INGEST_BASE}/upload`, { method: "POST", headers: headers(key) });
  if (!create.ok) {
    console.error("Shotstack ingest upload request failed", create.status, await create.text());
    return undefined;
  }
  const json = (await create.json()) as { data?: { id?: string; attributes?: { id?: string; url?: string } } };
  const putUrl = json.data?.attributes?.url;
  const id = json.data?.attributes?.id ?? json.data?.id;
  if (!putUrl || !id) return undefined;

  const put = await fetch(putUrl, {
    method: "PUT",
    body: bytes as unknown as BodyInit,
    headers: { "Content-Type": mime },
  });
  if (!put.ok) {
    console.error("Shotstack signed upload failed", put.status);
    return undefined;
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`${INGEST_BASE}/sources/${id}`, { headers: headers(key) });
    if (!poll.ok) continue;
    const data = (await poll.json()) as {
      data?: { attributes?: { status?: string; source?: string } };
    };
    const status = data.data?.attributes?.status;
    if (status === "ready") return data.data?.attributes?.source;
    if (status === "failed" || status === "overwriting") return undefined;
  }
  return undefined;
}

/**
 * Generates a cinematic vertical background for a scene from its visual direction
 * so blank background fields never render as a flat/black screen.
 */
async function autoVisualForScene(
  shotstackKey: string,
  scene: { label: string; caption: string; voiceover: string; visual?: string | undefined },
  context: { businessName: string; title: string },
): Promise<string | undefined> {
  const aiKey = process.env["LOVABLE_API_KEY"];
  if (!aiKey) return undefined;
  try {
    const prompt = `Ultra high quality cinematic vertical 9:16 advertising background photo for a short-form social video ad.
Brand: ${context.businessName}. Campaign: ${context.title}.
Scene (${scene.label}) visual direction: ${scene.visual || scene.caption}.
Style: photoreal, rich colour grading, shallow depth of field, dramatic lighting, plenty of clean negative space in the middle for caption text.
Absolutely no text, no words, no logos, no watermarks, no UI overlays.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("Auto visual generation failed", res.status, await res.text());
      return undefined;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>;
    };
    const dataUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.includes(";base64,")) return undefined;
    const [meta, b64] = dataUrl.split(";base64,");
    const mime = meta?.replace("data:", "") || "image/png";
    const binary = atob(b64!);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return await ingestToShotstack(shotstackKey, bytes, mime);
  } catch (err) {
    console.error("Auto visual error", err);
    return undefined;
  }
}

const SIZES = {
  sd: { width: 540, height: 960 },
  hd: { width: 720, height: 1280 },
  fhd: { width: 1080, height: 1920 },
} as const;

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function buildTimeline(
  input: SubmitInput,
  voiceoverUrls: Array<string | undefined>,
  autoBackgrounds: Array<string | undefined>,
) {
  const per = input.durationSeconds / input.scenes.length;
  const size = SIZES[input.resolution];
  const scale = size.width / 1080;
  const background: Array<Record<string, unknown>> = [];
  const captionTrack: Array<Record<string, unknown>> = [];
  const labelTrack: Array<Record<string, unknown>> = [];
  const audioTrack: Array<Record<string, unknown>> = [];

  input.scenes.forEach((rawScene, i) => {
    const scene = { ...rawScene, backgroundUrl: rawScene.backgroundUrl ?? autoBackgrounds[i] };
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
        height: Math.round(340 * scale),
        html: `<div class="wrap"><span class="cap">${escapeHtml(caption)}</span></div>`,
        css: `.wrap { display:flex; align-items:flex-end; justify-content:center; width:${Math.round(900 * scale)}px; height:${Math.round(340 * scale)}px; } .cap { display:inline-block; font-family: '${input.style.fontFamily.replace(/'/g, "").split(",")[0]}', sans-serif; font-size: ${Math.round(input.style.fontSize * 1.8 * scale)}px; font-weight: 700; color: ${input.style.textColor}; background-color: ${input.style.highlight}; padding: ${Math.round(14 * scale)}px ${Math.round(24 * scale)}px; text-align: center; line-height: 1.15; }`,
        position: "bottom",
      },
      start,
      length,
      position: "bottom",
      offset: { x: 0, y: 0.18 },
      transition: { in: "slideUp", out: "fade" },
    });

    labelTrack.push({
      asset: {
        type: "title",
        text: scene.label.toUpperCase(),
        style: "minimal",
        size: "x-small",
        color: "#ffffff",
        position: "topLeft",
      },
      start,
      length,
      offset: { x: 0.04, y: -0.03 },
      opacity: 0.65,
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
      offset: { x: 0, y: 0.05 },
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
        position: "topRight",
      },
      start: 0,
      length: input.durationSeconds,
      offset: { x: -0.03, y: -0.03 },
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
    output: {
      format: "mp4",
      size: { width: size.width, height: size.height },
      fps: input.fps,
      quality: input.quality,
    },
  };
}

/** Turns a Shotstack API failure into a message a marketer can act on. */
function describeSubmitError(status: number, body: string): string {
  let detail = "";
  try {
    const json = JSON.parse(body) as {
      message?: string;
      response?: { message?: string; error?: string };
    };
    detail = json.response?.message ?? json.response?.error ?? json.message ?? "";
  } catch {
    detail = body.slice(0, 200);
  }
  if (status === 401 || status === 403) {
    return "Shotstack rejected the API key. Check that SHOTSTACK_API_KEY is valid for this environment (sandbox vs production).";
  }
  if (status === 402) return "Your Shotstack plan is out of render credits.";
  if (status === 429) return "Shotstack rate limit hit — wait a moment and retry the render.";
  if (status === 400) {
    return `Shotstack could not accept this timeline${detail ? `: ${detail}` : ""}. Check that every background URL is publicly reachable.`;
  }
  return `Shotstack render failed (${status})${detail ? `: ${detail}` : ""}.`;
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
        data.scenes.map((s) => (s.voiceoverUrl ? undefined : synthesizeVoiceover(key, s.voiceover, data.voice))),
      );
    }

    const autoBackgrounds = await Promise.all(
      data.scenes.map((s) =>
        s.backgroundUrl
          ? Promise.resolve(undefined)
          : autoVisualForScene(key, s, { businessName: data.businessName, title: data.title }),
      ),
    );

    const payload = buildTimeline(data, voiceoverUrls, autoBackgrounds);
    const res = await fetch(`${EDIT_BASE}/render`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("Shotstack render submit failed", res.status, text);
      return { ok: false, error: describeSubmitError(res.status, text) };
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
