import { useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Film,
  Loader2,
  RefreshCw,
  Share2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { AdScript } from "@/lib/script.functions";
import { CAPTION_FONTS, HIGHLIGHT_COLORS, type CaptionStyle } from "@/lib/render-video";
import {
  FPS_OPTIONS,
  QUALITY_PRESETS,
  RESOLUTION_PRESETS,
  SHOTSTACK_STATUS_LABEL,
  type QualityId,
  type ResolutionId,
  type ShotstackRenderStatus,
} from "@/lib/shotstack";
import { getShotstackRender, submitShotstackRender } from "@/lib/shotstack.functions";
import { uploadBackgroundAsset } from "@/lib/upload-asset";
import type { TimelineStage } from "@/lib/timeline";


export const GENERATION_STEPS = [
  "Scriptwriting",
  "Voiceover generation",
  "Caption styling",
  "Media assembly",
] as const;

export function ScriptStudio({
  script,
  busy,
  step,
  businessName,
  durationSeconds,
  isPaid,
  onStage,
}: {
  script: AdScript | null;
  busy: boolean;
  step: number;
  businessName: string;
  durationSeconds: number;
  isPaid: boolean;
  onStage?: (stage: TimelineStage, detail?: string) => void;
}) {
  const [style, setStyle] = useState<CaptionStyle>({
    fontFamily: CAPTION_FONTS[0]!.id,
    fontSize: 34,
    highlight: HIGHLIGHT_COLORS[0]!,
    textColor: "#ffffff",
    uppercase: true,
  });
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [backgrounds, setBackgrounds] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const [resolution, setResolution] = useState<ResolutionId>("fhd");
  const [quality, setQuality] = useState<QualityId>("medium");
  const [fps, setFps] = useState<number>(30);
  const [rendering, setRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  const scenes =
    script?.scenes.map((s, i) => ({ ...s, onScreenText: captions[i] ?? s.onScreenText })) ?? [];

  if (busy) {
    return (
      <div className="card-soft flex flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <h2 className="text-lg font-semibold">Compiling Ad Script…</h2>
        </div>
        <Progress value={((step + 1) / GENERATION_STEPS.length) * 100} />
        <ul className="space-y-3">
          {GENERATION_STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              {i < step ? (
                <Check className="size-4 text-primary" />
              ) : i === step ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <span className="size-4 rounded-full border border-border" />
              )}
              <span className={i <= step ? "font-medium" : "text-muted-foreground"}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="card-soft surface-glow flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="bg-brand flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
          <Film className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">Your ad preview lands here</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Fill in the brief on the left and we'll write a hook-body-outro script, style your
          captions and assemble a vertical 9:16 ad.
        </p>
      </div>
    );
  }

  const plainText = [
    script.title,
    "",
    ...scenes.map(
      (s) =>
        `${s.label} (${s.timecode})\nVO: ${s.voiceover}\nOn-screen: ${s.onScreenText}\nVisual: ${s.visual}`,
    ),
    "",
    `CTA: ${script.cta}`,
    script.hashtags.join(" "),
  ].join("\n\n");

  async function copyScript() {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    toast.success("Script copied");
    setTimeout(() => setCopied(false), 1800);
  }

  function downloadScript() {
    const blob = new Blob([plainText], { type: "text/plain" });
    triggerDownload(blob, `${businessName || "spotlightmaker"}-script.txt`);
  }

  async function handleUpload(index: number, file: File) {
    setUploading(index);
    const result = await uploadBackgroundAsset(file);
    setUploading(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBackgrounds((b) => ({ ...b, [index]: result.url }));
    toast.success("Background uploaded and hosted publicly");
  }

  function failRender(message: string) {
    setRendering(false);
    setRenderStatus(null);
    setRenderError(message);
    onStage?.("render", message);
    toast.error(message);
  }

  async function makeVideo() {
    const preset = RESOLUTION_PRESETS.find((r) => r.id === resolution)!;
    setRendering(true);
    setVideoUrl(null);
    setRenderError(null);
    setRenderStatus("Submitting render job to Shotstack…");
    onStage?.("captions", `${style.fontFamily.split(",")[0]} · ${style.fontSize}px`);

    const submitted = await submitShotstackRender({
      data: {
        title: script!.title,
        businessName,
        cta: script!.cta,
        durationSeconds,
        watermark: !isPaid,
        generateVoiceover: true,
        style,
        resolution,
        quality,
        fps,
        scenes: scenes.map((s, i) => ({
          label: s.label,
          caption: s.onScreenText,
          voiceover: s.voiceover,
          ...(backgrounds[i]?.trim() ? { backgroundUrl: backgrounds[i]!.trim() } : {}),
        })),
      },
    }).catch(() => ({
      ok: false as const,
      error: "Could not reach the render service. Check your connection and retry.",
    }));

    if (!submitted.ok || !("id" in submitted) || !submitted.id) {
      failRender(submitted.error ?? "Shotstack submission failed.");
      return;
    }

    const renderId = submitted.id;
    onStage?.("voiceover", "Voiceover synthesised for cloud render");

    let consecutiveFailures = 0;
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise((r) => setTimeout(r, 4000));
      let status: ShotstackRenderStatus;
      try {
        status = await getShotstackRender({ data: { id: renderId } });
        consecutiveFailures = 0;
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          failRender("Lost contact with the render service while checking progress.");
          return;
        }
        continue;
      }
      setRenderStatus(SHOTSTACK_STATUS_LABEL[status.status] ?? "Rendering…");
      if (status.status === "done" && status.url) {
        setVideoUrl(status.url);
        setRendering(false);
        setRenderStatus(null);
        onStage?.(
          "render",
          `${durationSeconds}s ${preset.width}×${preset.height} ${quality} MP4 rendered on Shotstack`,
        );
        toast.success(isPaid ? "MP4 ready — watermark-free" : "MP4 ready (free plan watermark)");
        return;
      }
      if (status.status === "failed") {
        failRender(
          status.error
            ? `Shotstack render failed: ${status.error}`
            : "Shotstack render failed. Check that all background URLs are public and try again.",
        );
        return;
      }
    }

    failRender("Render timed out after 6 minutes. Try a lower resolution or quality and retry.");
  }


  function downloadVideo() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${businessName || "spotlightmaker"}-ad-9x16.mp4`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
    onStage?.("export", "MP4 downloaded");
  }

  const shareText = `${script.hookLine} ${script.cta} ${script.hashtags.join(" ")}`;
  const socials = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&quote=${encodeURIComponent(shareText)}`,
    },
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "TikTok", href: "https://www.tiktok.com/upload" },
    { label: "YouTube", href: "https://studio.youtube.com/" },
  ];

  return (
    <div className="space-y-4">
      <div className="card-soft space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{script.title}</h2>
            <p className="text-sm text-muted-foreground">{script.hookLine}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyScript()}>
              {copied ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadScript}>
              <Download className="mr-1 size-4" /> Export
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {scenes.map((scene, i) => (
            <div key={scene.label + i} className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge className="bg-brand text-primary-foreground">{scene.label}</Badge>
                <span className="text-xs text-muted-foreground">{scene.timecode}</span>
              </div>
              <p className="text-sm">
                <span className="font-medium">VO:</span> {scene.voiceover}
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Visual:</span> {scene.visual}
              </p>
              <div className="mt-3 space-y-1">
                <Label className="text-xs">Caption text</Label>
                <Input
                  value={scene.onScreenText}
                  onChange={(e) => setCaptions((c) => ({ ...c, [i]: e.target.value }))}
                />
              </div>
              <div className="mt-3 space-y-1">
                <Label className="text-xs">Background image/video URL (optional)</Label>
                <Input
                  placeholder="https://…/clip.mp4 or image.jpg"
                  value={backgrounds[i] ?? ""}
                  onChange={(e) => setBackgrounds((b) => ({ ...b, [i]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">{script.cta}</p>
          <p className="mt-1 text-xs text-muted-foreground">{script.hashtags.join(" ")}</p>
        </div>
      </div>

      <div className="card-soft space-y-4 p-6">
        <h3 className="text-sm font-semibold">Caption styling</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Font</Label>
            <Select
              value={style.fontFamily}
              onValueChange={(v) => setStyle((s) => ({ ...s, fontFamily: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_FONTS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Caption size — {style.fontSize}px</Label>
            <Slider
              value={[style.fontSize]}
              min={22}
              max={60}
              step={2}
              onValueChange={([v]) => setStyle((s) => ({ ...s, fontSize: v ?? 34 }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Highlight colour</Label>
          <div className="flex flex-wrap gap-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Highlight ${c}`}
                onClick={() => setStyle((s) => ({ ...s, highlight: c }))}
                style={{ backgroundColor: c }}
                className={`size-8 rounded-full border-2 transition-transform ${
                  style.highlight === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
              />
            ))}
          </div>
        </div>
        <div
          className="flex min-h-28 items-center justify-center rounded-xl p-4"
          style={{ backgroundColor: "#101024" }}
        >
          <span
            style={{
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              backgroundColor: style.highlight,
              color: style.textColor,
              textTransform: style.uppercase ? "uppercase" : "none",
            }}
            className="rounded px-3 py-1 font-bold"
          >
            {scenes[0]?.onScreenText ?? "Caption preview"}
          </span>
        </div>
      </div>

      <div className="card-soft space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Export 9:16 video</h3>
          <Badge variant={isPaid ? "default" : "secondary"}>
            {isPaid ? "No watermark" : "Watermarked (free plan)"}
          </Badge>
        </div>
        <Button
          onClick={() => void makeVideo()}
          disabled={rendering}
          className="bg-brand text-primary-foreground"
        >
          {rendering ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" /> Rendering in the cloud…
            </>
          ) : (
            <>
              <Film className="mr-1 size-4" /> Render MP4 with Shotstack
            </>
          )}
        </Button>
        {rendering && renderStatus && (
          <p className="text-xs text-muted-foreground">{renderStatus}</p>
        )}
        {videoUrl && (
          <div className="space-y-3">
            <video
              src={videoUrl}
              controls
              playsInline
              className="mx-auto aspect-[9/16] w-full max-w-[260px] rounded-xl border border-border"
            />
            <Button variant="outline" onClick={downloadVideo} className="w-full">
              <Download className="mr-1 size-4" /> Download MP4
            </Button>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium">Final video URL</p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs text-primary underline"
              >
                {videoUrl}
              </a>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {socials.map((s) => (
            <Button key={s.label} variant="outline" size="sm" asChild>
              <a href={s.href} target="_blank" rel="noreferrer">
                <Share2 className="mr-1 size-3.5" /> {s.label}
              </a>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Your script, styled captions, background visuals and synthesised voiceover are assembled
          into a 1080×1920 MP4 by Shotstack's cloud renderer. Download it, then upload to Instagram,
          TikTok or YouTube with the buttons above.
        </p>
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
