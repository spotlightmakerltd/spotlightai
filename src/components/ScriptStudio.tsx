import { useState } from "react";
import { Check, Copy, Download, Film, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { AdScript } from "@/lib/script.functions";
import {
  CAPTION_FONTS,
  HIGHLIGHT_COLORS,
  renderAdVideo,
  type CaptionStyle,
} from "@/lib/render-video";

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
}: {
  script: AdScript | null;
  busy: boolean;
  step: number;
  businessName: string;
  durationSeconds: number;
  isPaid: boolean;
}) {
  const [style, setStyle] = useState<CaptionStyle>({
    fontFamily: CAPTION_FONTS[0]!.id,
    fontSize: 34,
    highlight: HIGHLIGHT_COLORS[0]!,
    textColor: "#ffffff",
    uppercase: true,
  });
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [rendering, setRendering] = useState(false);
  const [renderPct, setRenderPct] = useState(0);
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

  async function makeVideo() {
    setRendering(true);
    setRenderPct(0);
    try {
      const blob = await renderAdVideo({
        scenes,
        style,
        durationSeconds,
        watermark: !isPaid,
        businessName,
        onProgress: (p) => setRenderPct(Math.round(p * 100)),
      });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      toast.success(isPaid ? "Video ready — watermark-free" : "Video ready (free plan watermark)");
    } catch {
      toast.error("Your browser blocked video rendering. Try Chrome on desktop or Android.");
    } finally {
      setRendering(false);
    }
  }

  function downloadVideo() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${businessName || "spotlightmaker"}-ad-9x16.mp4`;
    a.click();
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
        <Button onClick={() => void makeVideo()} disabled={rendering} className="bg-brand text-primary-foreground">
          {rendering ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" /> Assembling {renderPct}%
            </>
          ) : (
            <>
              <Film className="mr-1 size-4" /> Render vertical ad
            </>
          )}
        </Button>
        {videoUrl && (
          <div className="space-y-3">
            <video
              src={videoUrl}
              controls
              playsInline
              className="mx-auto aspect-[9/16] w-full max-w-[260px] rounded-xl border border-border"
            />
            <Button variant="outline" onClick={downloadVideo} className="w-full">
              <Download className="mr-1 size-4" /> Download for mobile
            </Button>
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
          Render the video first, then upload the downloaded file to Instagram, TikTok or YouTube —
          the buttons open each uploader with your caption copied-ready.
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
