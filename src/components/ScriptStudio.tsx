import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Film,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
  Upload,
  Volume2,
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
  VOICE_OPTIONS,
  DEFAULT_VOICE,
  type QualityId,
  type ResolutionId,
  type ShotstackRenderStatus,
  type VoiceId,
} from "@/lib/shotstack";
import { getShotstackRender, submitShotstackRender } from "@/lib/shotstack.functions";
import {
  checkSceneVideo,
  startSceneVideo,
  type SceneVideoCheck,
  type SceneVideoStart,
} from "@/lib/fal.functions";
import { previewVoice } from "@/lib/voice.functions";
import { uploadBackgroundAsset } from "@/lib/upload-asset";

import type { TimelineStage } from "@/lib/timeline";


export const GENERATION_STEPS = [
  "Writing your ad copy",
  "Recording the voice track",
  "Styling your captions",
  "Assembling your video",
] as const;

export function ScriptStudio({
  script,
  busy,
  step,
  businessName,
  durationSeconds,
  isPaid,
  productImageUrl,
  onStage,
}: {
  script: AdScript | null;
  busy: boolean;
  step: number;
  businessName: string;
  durationSeconds: number;
  isPaid: boolean;
  productImageUrl?: string;
  onStage?: (
    stage: TimelineStage,
    detail?: string,
    status?: "completed" | "failed" | "running",
  ) => void;
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
  const [voice, setVoice] = useState<VoiceId>(DEFAULT_VOICE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  type ClipState = {
    status: "queued" | "running" | "done" | "failed";
    requestId?: string;
    videoUrl?: string;
    error?: string;
  };
  const [clips, setClips] = useState<Record<number, ClipState>>({});

  // Fresh script, fresh clips — old motion previews never leak into a new ad.
  useEffect(() => {
    setClips({});
  }, [script]);

  const [rendering, setRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


  const scenes =
    script?.scenes?.map((s, i) => ({ ...s, onScreenText: captions[i] ?? s.onScreenText })) ?? [];

  async function handleVoicePreview() {
    setPreviewing(true);
    setPreviewUrl(null);
    try {
      const sample =
        scenes[0]?.voiceover?.slice(0, 240) ||
        `Here is how ${businessName || "your brand"} sounds in your next ad.`;
      const res = await previewVoice({ data: { text: sample, voice } });
      if (!res.ok || !res.audioUrl) {
        toast.error(res.error ?? "Voice preview is unavailable right now.");
        return;
      }
      setPreviewUrl(res.audioUrl);
    } catch {
      toast.error("Voice preview is unavailable right now.");
    } finally {
      setPreviewing(false);
    }
  }


  if (busy) {
    return (
      <div className="card-soft flex flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <h2 className="text-lg font-semibold">Building your ad…</h2>
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
        <h2 className="text-xl font-bold tracking-tight">Your next best-selling ad lands here</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Fill in the brief on the left. You get a hook, story and offer, styled captions and a
          ready-to-post vertical video your customers actually watch.
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
    (script.hashtags ?? []).join(" "),
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
    toast.success("Visual added to this scene");
  }

  function isImageUrl(url?: string) {
    return !!url && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url);
  }

  /** Generates a real motion video clip for one scene via the fal.ai video engine. */
  async function generateSceneVisual(index: number) {
    const scene = scenes[index];
    if (!scene) return;
    const per = Math.max(5, Math.round(durationSeconds / Math.max(1, scenes.length)));
    const duration = per >= 8 ? 10 : 5;
    const pasted = backgrounds[index]?.trim();
    const imageUrl = isImageUrl(pasted)
      ? pasted!
      : isImageUrl(productImageUrl)
        ? productImageUrl!
        : undefined;

    setClips((c) => ({ ...c, [index]: { status: "queued" } }));
    onStage?.("render", "Directing video scenes…", "running");

    const started: SceneVideoStart = await startSceneVideo({
      data: {
        visualPrompt: `Cinematic vertical advertising shot for a short-form social video ad. Scene "${scene.label}" for ${businessName || "the brand"}. ${scene.visual || scene.caption}. Photoreal, rich colour grading, dramatic lighting, smooth single camera move, plenty of clean space for caption text.`,
        ...(imageUrl ? { imageUrl } : {}),
        durationSeconds: duration,
      },
    }).catch(
      (): SceneVideoStart => ({
        ok: false,
        error: "Could not reach the video engine. Check your connection and retry.",
      }),
    );

    if (!started.ok || !started.requestId) {
      setClips((c) => ({
        ...c,
        [index]: { status: "failed", error: started.error ?? "Could not start video generation." },
      }));
      return;
    }

    setClips((c) => ({ ...c, [index]: { status: "queued", requestId: started.requestId } }));
    let transient = 0;
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res: SceneVideoCheck | null = await checkSceneVideo({
        data: { requestId: started.requestId! },
      }).catch(() => null);
      if (!res) {
        transient++;
        if (transient >= 4) {
          setClips((c) => ({
            ...c,
            [index]: { status: "failed", error: "We lost contact with the video engine. Try again." },
          }));
          return;
        }
        continue;
      }
      if (res.status === "queued" || res.status === "running") {
        setClips((c) => ({ ...c, [index]: { status: res.status, requestId: started.requestId } }));
        continue;
      }
      if (res.status === "done" && res.videoUrl) {
        setClips((c) => ({ ...c, [index]: { status: "done", videoUrl: res.videoUrl } }));
        toast.success(`Scene ${index + 1} motion clip is ready`);
        return;
      }
      setClips((c) => ({
        ...c,
        [index]: { status: "failed", error: res.error ?? "Video generation failed." },
      }));
      return;
    }
    setClips((c) => ({
      ...c,
      [index]: { status: "failed", error: "Video generation timed out. Try again." },
    }));
  }

  async function generateAllVisuals() {
    await Promise.all(scenes.map((_, i) => generateSceneVisual(i)));
  }

  const anyClipBusy = Object.values(clips).some((c) => c.status === "queued" || c.status === "running");

  function failRender(message: string) {
    setRendering(false);
    setRenderStatus(null);
    setRenderError(message);
    onStage?.("render", message, "failed");
    toast.error(message);
  }

  async function makeVideo() {
    const preset = RESOLUTION_PRESETS.find((r) => r.id === resolution)!;
    setRendering(true);
    setVideoUrl(null);
    setRenderError(null);
    setRenderStatus("Sending your ad into production…");
    onStage?.("captions", `${style.fontFamily.split(",")[0]} · ${style.fontSize}px`);
    onStage?.(
      "voiceover",
      `Recording with ${VOICE_OPTIONS.find((v) => v.id === voice)?.label ?? "your chosen voice"}…`,
      "running",
    );
    onStage?.("render", "Sending your ad into production…", "running");

    const submitted = await submitShotstackRender({
      data: {
        title: script!.title,
        businessName,
        cta: script!.cta,
        durationSeconds,
        watermark: !isPaid,
        generateVoiceover: true,
        voice,
        style,
        resolution,
        quality,
        fps,
        scenes: scenes.map((s, i) => ({
          label: s.label,
          caption: s.onScreenText,
          voiceover: s.voiceover,
          visual: s.visual,
          // Generated motion clips take precedence, then user pastes/uploads.
          ...(clips[i]?.videoUrl || backgrounds[i]?.trim() || productImageUrl
            ? {
                backgroundUrl: (clips[i]?.videoUrl || backgrounds[i]?.trim() || productImageUrl)!,
              }
            : {}),
        })),
      },
    }).catch(() => ({
      ok: false as const,
      error: "Could not reach the render service. Check your connection and retry.",
    }));

    if (!submitted.ok || !("id" in submitted) || !submitted.id) {
      failRender(submitted.error ?? "We could not start production. Please try again.");
      return;
    }

    const renderId = submitted.id;
    onStage?.("voiceover", "Voice track recorded", "completed");
    onStage?.("render", "Producing your video…", "running");

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
          failRender("We lost contact while producing your video. Please retry.");
          return;
        }
        continue;
      }
      const label = SHOTSTACK_STATUS_LABEL[status.status] ?? "Rendering…";
      setRenderStatus(label);
      if (status.status !== "done" && status.status !== "failed") {
        onStage?.("render", label, "running");
      }
      if (status.status === "done" && status.url) {
        setVideoUrl(status.url);
        setRendering(false);
        setRenderStatus(null);
        onStage?.(
          "render",
          `${durationSeconds}s ${preset.width}×${preset.height} ${quality} video produced`,
          "completed",
        );
        toast.success(isPaid ? "Your ad is ready — watermark free" : "Your ad is ready (free plan watermark)");
        return;
      }
      if (status.status === "failed") {
        failRender(
          status.error
            ? `Production failed: ${status.error}`
            : "Production failed. Check that any media links you pasted are public and try again.",
        );
        return;
      }
    }

    failRender("Production timed out after 6 minutes. Try a lower resolution or quality and retry.");
  }


  function downloadVideo() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${businessName || "spotlightmaker"}-ad-9x16.mp4`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
    onStage?.("export", "MP4 downloaded", "completed");
  }

  const shareText = `${script.hookLine} ${script.cta} ${(script.hashtags ?? []).join(" ")}`;
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Scenes
          </h3>
          <Button
            size="sm"
            variant="outline"
            disabled={anyClipBusy}
            onClick={() => void generateAllVisuals()}
          >
            {anyClipBusy ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 size-4" />
            )}
            {anyClipBusy ? "Directing your scenes…" : "Generate motion for every scene"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Real motion video per scene, generated from your script and product photo with your
          fal.ai credits (about $0.07 per second of clip).
        </p>

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
              <div className="mt-3 space-y-2">
                <Label className="text-xs">Background image/video</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste a public URL or upload a file"
                    value={backgrounds[i] ?? ""}
                    onChange={(e) => setBackgrounds((b) => ({ ...b, [i]: e.target.value }))}
                  />
                  <input
                    ref={(el) => {
                      fileInputs.current[i] = el;
                    }}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void handleUpload(i, file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading === i}
                    onClick={() => fileInputs.current[i]?.click()}
                  >
                    {uploading === i ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">Upload</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Or paste a public image/video URL. Uploads are hosted securely for production.
                  Max 50MB.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Motion video</Label>
                {(() => {
                  const clip = clips[i];
                  if (clip?.status === "done" && clip.videoUrl) {
                    return (
                      <div className="flex items-center gap-3">
                        <video
                          src={clip.videoUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="aspect-[9/16] w-20 rounded-lg border border-border object-cover"
                        />
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            This scene will use this motion clip in the final ad.
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={anyClipBusy}
                            onClick={() => void generateSceneVisual(i)}
                          >
                            <RefreshCw className="mr-1 size-3.5" /> Regenerate
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={anyClipBusy}
                        onClick={() => void generateSceneVisual(i)}
                      >
                        {clip?.status === "queued" || clip?.status === "running" ? (
                          <Loader2 className="mr-1 size-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-1 size-4" />
                        )}
                        {clip?.status === "queued"
                          ? "In the video queue…"
                          : clip?.status === "running"
                            ? "Directing your scene…"
                            : "Generate motion video"}
                      </Button>
                      {clip?.status === "failed" && (
                        <p className="text-xs text-destructive">{clip.error}</p>
                      )}
                    </div>
                  );
                })()}
              </div>

            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-medium">{script.cta}</p>
          <p className="mt-1 text-xs text-muted-foreground">{(script.hashtags ?? []).join(" ")}</p>
        </div>
      </div>

      <div className="card-soft space-y-4 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Caption styling</h3>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Caption text colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Caption text colour"
                value={style.textColor}
                onChange={(e) => setStyle((s) => ({ ...s, textColor: e.target.value }))}
                className="size-9 cursor-pointer rounded-md border border-border bg-transparent"
              />
              <span className="text-xs text-muted-foreground">{style.textColor}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <Label className="text-xs">Uppercase captions</Label>
            <Switch
              checked={style.uppercase}
              onCheckedChange={(v) => setStyle((s) => ({ ...s, uppercase: v }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">9:16 preview — verify before rendering</Label>
          <div
            className="relative mx-auto flex aspect-[9/16] w-full max-w-[240px] flex-col justify-end overflow-hidden rounded-2xl border border-border p-4 pb-[18%]"
            style={{
              background: backgrounds[0]?.trim() || productImageUrl
                ? undefined
                : `linear-gradient(160deg, #0f0b23 0%, ${style.highlight} 100%)`,
            }}
          >
            {(backgrounds[0]?.trim() || productImageUrl) && (
              <img
                src={backgrounds[0]?.trim() || productImageUrl}
                alt="Scene 1 background preview"
                className="absolute inset-0 size-full object-cover"
              />
            )}
            <span
              style={{
                fontFamily: style.fontFamily,
                fontSize: Math.round(style.fontSize * 0.55),
                backgroundColor: style.highlight,
                color: style.textColor,
                textTransform: style.uppercase ? "uppercase" : "none",
              }}
              className="relative mx-auto rounded px-2 py-1 text-center font-bold"
            >
              {scenes[0]?.onScreenText ?? "Caption preview"}
            </span>
            {scenes[0] && (
              <span className="absolute left-3 top-3 text-[9px] font-semibold uppercase tracking-widest text-white/70">
                {scenes[0].label}
              </span>
            )}
            {!isPaid && (
              <span className="absolute right-3 top-3 text-[9px] font-semibold tracking-widest text-white/70">
                SPOTLIGHTMAKER — FREE PLAN
              </span>
            )}
          </div>
        </div>

      </div>

      <div className="card-soft space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Publish-ready video</h3>
          <Badge variant={isPaid ? "default" : "secondary"}>
            {isPaid ? "No watermark" : "Watermarked (free plan)"}
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Resolution (9:16)</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_PRESETS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Output quality</Label>
            <Select value={quality} onValueChange={(v) => setQuality(v as QualityId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_PRESETS.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Voice</Label>
            <Select
              value={voice}
              onValueChange={(v) => {
                setVoice(v as VoiceId);
                setPreviewUrl(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={previewing}
                onClick={handleVoicePreview}
              >
                {previewing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Volume2 className="mr-2 h-4 w-4" />
                )}
                {previewing ? "Preparing sample…" : "Hear this voice"}
              </Button>
              {previewUrl ? (
                <audio className="h-9 flex-1" controls autoPlay src={previewUrl} />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Listen before you produce the full ad.
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Frame rate</Label>
            <Select value={String(fps)} onValueChange={(v) => setFps(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FPS_OPTIONS.map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    {f} fps
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => void makeVideo()}
          disabled={rendering}
          className="bg-brand text-primary-foreground"
        >
          {rendering ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" /> Producing your video…
            </>
          ) : (
            <>
              <Film className="mr-1 size-4" /> Produce my video
            </>
          )}
        </Button>
        {rendering && renderStatus && (
          <p className="text-xs text-muted-foreground">{renderStatus}</p>
        )}
        {renderError && !rendering && (
          <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Production failed</p>
                <p className="mt-1 text-xs text-muted-foreground">{renderError}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void makeVideo()}>
              <RefreshCw className="mr-1 size-3.5" /> Try again
            </Button>
          </div>
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
          Your copy, captions, visuals and voice track are produced into a crisp vertical video
          built for reach. Download it and post to Instagram, TikTok, YouTube or WhatsApp to start
          bringing in customers today.
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
