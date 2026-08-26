import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Zap, Wand2, Clapperboard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DURATION_OPTIONS, formatCredits } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpotlightMaker — AI Short-Form Video Ad Generator" },
      {
        name: "description",
        content:
          "Generate high-converting short-form video ad scripts, hooks and 9:16 production layouts in seconds. 5 free credits on signup.",
      },
      { property: "og:title", content: "SpotlightMaker — AI Short-Form Video Ad Generator" },
      {
        property: "og:description",
        content:
          "Hooks, scripts and vertical ad layouts generated instantly for your business. Start free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-bold">SpotlightMaker</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="surface-glow">
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-5">
            Best-in-class AI routing · no model picking
          </Badge>
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
            Turn your business into a{" "}
            <span className="bg-brand bg-clip-text text-transparent">scroll-stopping ad</span> in
            60 seconds
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            SpotlightMaker writes the hook, body and outro, styles your captions and assembles a
            vertical 9:16 ad ready for TikTok, Reels, Shorts and WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-brand text-primary-foreground shadow-[var(--shadow-glow)]">
              <Link to="/auth">
                Start free with 5 credits <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-3">
          {[
            { icon: Wand2, title: "Auto-routed AI", body: "We pick the top-performing model for every brief — instantly." },
            { icon: Clapperboard, title: "Scene-by-scene", body: "Hook, Body and Outro with timecodes, visuals and captions." },
            { icon: Zap, title: "Export anywhere", body: "9:16 MP4 download plus Instagram, TikTok, YouTube and WhatsApp." },
          ].map((f) => (
            <div key={f.title} className="card-soft p-6">
              <f.icon className="mb-3 size-5 text-primary" />
              <h2 className="text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24">
          <div className="card-soft p-6">
            <h2 className="text-lg font-semibold">Credit pricing</h2>
            <p className="text-sm text-muted-foreground">Pay only for the length you publish.</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DURATION_OPTIONS.map((d) => (
                <li
                  key={d.seconds}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{d.seconds}s</span>
                  <span className="text-muted-foreground"> — {formatCredits(d.credits)} credits</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Free plan exports carry a SpotlightMaker watermark. Paid plans export clean.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
