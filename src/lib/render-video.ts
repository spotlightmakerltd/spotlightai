import type { AdScene } from "./script.functions";

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

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type RenderOptions = {
  scenes: AdScene[];
  style: CaptionStyle;
  durationSeconds: number;
  watermark: boolean;
  businessName: string;
  onProgress?: (pct: number) => void;
};

/** Renders a 9:16 vertical ad preview video entirely in the browser. */
export async function renderAdVideo(opts: RenderOptions): Promise<Blob> {
  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(30);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
  });

  recorder.start();

  const total = opts.durationSeconds * 1000;
  const perScene = total / Math.max(1, opts.scenes.length);
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const draw = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(1, elapsed / total);
      opts.onProgress?.(pct);
      const index = Math.min(opts.scenes.length - 1, Math.floor(elapsed / perScene));
      const scene = opts.scenes[index]!;

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#0f0b23");
      grad.addColorStop(1, opts.style.highlight);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, width, height);

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "500 30px 'DM Sans', sans-serif";
      ctx.fillText(scene.label.toUpperCase(), width / 2, 140);

      const caption = opts.style.uppercase
        ? scene.onScreenText.toUpperCase()
        : scene.onScreenText;
      ctx.font = `700 ${opts.style.fontSize * 2}px ${opts.style.fontFamily}`;
      const lines = wrap(ctx, caption, width - 120);
      let y = height / 2 - (lines.length - 1) * opts.style.fontSize * 1.2;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        ctx.fillStyle = opts.style.highlight;
        ctx.fillRect(
          width / 2 - w / 2 - 24,
          y - opts.style.fontSize * 1.35,
          w + 48,
          opts.style.fontSize * 2.1,
        );
        ctx.fillStyle = opts.style.textColor;
        ctx.fillText(line, width / 2, y + opts.style.fontSize * 0.3);
        y += opts.style.fontSize * 2.6;
      }

      ctx.font = "400 26px 'DM Sans', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const vo = wrap(ctx, scene.voiceover, width - 140).slice(0, 4);
      let vy = height - 320;
      for (const line of vo) {
        ctx.fillText(line, width / 2, vy);
        vy += 36;
      }

      ctx.font = "600 30px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(opts.businessName, width / 2, height - 120);

      if (opts.watermark) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.font = "700 34px 'Space Grotesk', sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 9);
        ctx.fillText("SPOTLIGHTMAKER — FREE PLAN", 0, 0);
        ctx.restore();
      }

      if (pct >= 1) {
        resolve();
        return;
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });

  recorder.stop();
  return done;
}
