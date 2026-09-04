import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Clapperboard,
  MessageSquareQuote,
  Play,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DURATION_OPTIONS, formatCredits } from "@/lib/pricing";
import productPreview from "@/assets/ad-preview-product.jpg";
import testimonialPreview from "@/assets/ad-preview-testimonial.jpg";
import salePreview from "@/assets/ad-preview-sale.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpotlightMaker — Video Ads That Win Customers" },
      {
        name: "description",
        content:
          "Create high-converting short-form video ads for your business or product in minutes. Grow reach, win customers, start with 5 free credits.",
      },
      { property: "og:title", content: "SpotlightMaker — Video Ads That Win Customers" },
      {
        property: "og:description",
        content: "Scroll-stopping vertical ads for your business or product, ready to post. Start free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const adStyles = [
  {
    id: "showcase",
    label: "Product showcase",
    eyebrow: "Made to stand out",
    headline: "Small sound.\nBig energy.",
    caption: "Studio-grade creative for products people remember.",
    image: productPreview,
    accent: "cyan",
  },
  {
    id: "testimonial",
    label: "Customer story",
    eyebrow: "Real results",
    headline: "Your glow-up\nstarts here.",
    caption: "Trust-building stories shaped for social feeds.",
    image: testimonialPreview,
    accent: "violet",
  },
  {
    id: "sale",
    label: "Flash sale",
    eyebrow: "48 hours only",
    headline: "Move fast.\nLook faster.",
    caption: "Urgency, offer and action in one polished ad.",
    image: salePreview,
    accent: "coral",
  },
] as const;

const features = [
  {
    icon: WandSparkles,
    title: "Copy that earns attention",
    body: "Turn a simple brief into hooks, scenes and offers shaped to keep buyers watching.",
    stat: "Built for retention",
  },
  {
    icon: MessageSquareQuote,
    title: "A voice for every market",
    body: "Pair natural voiceovers with perfectly timed captions and polished brand styling.",
    stat: "Ready to be heard",
  },
  {
    icon: Clapperboard,
    title: "Made for every feed",
    body: "Produce sharp 9:16 creative for TikTok, Reels, Shorts and WhatsApp without an editor.",
    stat: "One brief. Every channel.",
  },
];

function Landing() {
  const [activeStyle, setActiveStyle] = useState<(typeof adStyles)[number]["id"]>("showcase");
  const activeAd = adStyles.find((style) => style.id === activeStyle) ?? adStyles[0];

  return (
    <div className="landing-dark min-h-screen overflow-hidden bg-landing text-landing-foreground">
      <header className="relative z-50 border-b border-landing-border bg-landing/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="SpotlightMaker home">
            <span className="landing-logo flex size-9 items-center justify-center rounded-lg text-landing-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-lg font-bold">SpotlightMaker</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-landing-muted hover:bg-landing-panel hover:text-landing-foreground">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="landing-cta">
              <Link to="/auth">Start free <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero relative min-h-[calc(100svh-4rem)] px-4 pb-12 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="relative z-10 max-w-3xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-landing-border bg-landing-panel/70 px-3 py-1.5 text-xs font-semibold text-landing-muted backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-landing-cyan shadow-[var(--shadow-cyan-dot)]" />
                5 free credits. No card required.
              </div>
              <h1 className="font-display text-5xl font-bold leading-[0.98] sm:text-6xl lg:text-7xl xl:text-8xl">
                Turn any idea into an ad people <span className="landing-gradient-text">can’t ignore.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-landing-muted sm:text-lg">
                Create scroll-stopping scripts, natural voiceovers and polished vertical videos that grow reach and turn attention into customers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="landing-cta h-12 px-6 text-base">
                  <Link to="/auth">Start free with 5 credits <ArrowRight className="size-4" /></Link>
                </Button>
                <a href="#ad-styles" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-landing-border bg-landing-panel/50 px-6 text-sm font-semibold text-landing-foreground backdrop-blur-md transition-colors hover:bg-landing-panel">
                  <Play className="size-4 fill-current" /> See it in action
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-landing-subtle">
                {["Ready in minutes", "Built for 9:16", "Export as MP4"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5"><Check className="size-3.5 text-landing-cyan" />{item}</span>
                ))}
              </div>
            </div>

            <div className="landing-stage relative mx-auto w-full max-w-[560px] lg:mr-0">
              <div className="landing-orbit landing-orbit-one" />
              <div className="landing-orbit landing-orbit-two" />
              <div className="landing-phone relative mx-auto aspect-[9/16] w-[min(70vw,310px)] overflow-hidden rounded-[2rem] border border-landing-border-strong bg-landing-panel shadow-[var(--shadow-phone)] transition-transform duration-500 hover:-rotate-1 hover:scale-[1.015]">
                <img src={activeAd.image} alt={`${activeAd.label} vertical ad preview`} width={768} height={1365} className="h-full w-full object-cover" />
                <div className="landing-preview-shade absolute inset-0" />
                <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[10px] font-bold uppercase text-landing-foreground">
                  <span className="rounded-full border border-landing-border-strong bg-landing/50 px-2.5 py-1 backdrop-blur-md">Spotlight</span>
                  <span>00:12</span>
                </div>
                <div className="absolute inset-x-5 bottom-7">
                  <p className={`mb-2 text-[10px] font-bold uppercase landing-accent-${activeAd.accent}`}>{activeAd.eyebrow}</p>
                  <p className="whitespace-pre-line font-display text-3xl font-bold leading-none text-landing-foreground">{activeAd.headline}</p>
                  <p className="mt-3 border-l-2 border-landing-cyan pl-3 text-xs leading-5 text-landing-foreground/85">{activeAd.caption}</p>
                  <div className="mt-5 h-1 overflow-hidden rounded-full bg-landing-foreground/20"><div className="landing-progress h-full w-2/3 rounded-full" /></div>
                </div>
              </div>
              <div className="absolute -right-2 top-1/4 hidden rounded-lg border border-landing-border bg-landing-panel/70 px-3 py-2 text-xs font-semibold text-landing-muted shadow-[var(--shadow-glass)] backdrop-blur-md sm:block">
                <Zap className="mr-1.5 inline size-3.5 text-landing-coral" /> Hook locked
              </div>
              <div className="absolute -left-4 bottom-1/4 hidden rounded-lg border border-landing-border bg-landing-panel/70 px-3 py-2 text-xs font-semibold text-landing-muted shadow-[var(--shadow-glass)] backdrop-blur-md sm:block">
                Captions synced <Check className="ml-1.5 inline size-3.5 text-landing-cyan" />
              </div>
            </div>
          </div>
          <a href="#ad-styles" aria-label="Explore ad styles" className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 text-landing-subtle transition-colors hover:text-landing-foreground lg:block">Scroll ↓</a>
        </section>

        <section id="ad-styles" className="border-y border-landing-border bg-landing-panel/20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl">
              <p className="landing-kicker">Ad styles that sell</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">One offer. Multiple ways to stop the scroll.</h2>
              <p className="mt-4 text-landing-muted">Switch the creative angle and see how SpotlightMaker shapes your message for the moment.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="space-y-3">
                {adStyles.map((style, index) => (
                  <Button key={style.id} variant="ghost" onClick={() => setActiveStyle(style.id)} className={`h-auto w-full justify-between rounded-lg border p-5 text-left transition-all ${activeStyle === style.id ? "border-landing-violet bg-landing-panel text-landing-foreground shadow-[var(--shadow-violet)]" : "border-landing-border bg-landing-panel/30 text-landing-muted hover:border-landing-border-strong hover:bg-landing-panel hover:text-landing-foreground"}`}>
                    <span><span className="mr-3 text-xs text-landing-subtle">0{index + 1}</span>{style.label}</span>
                    <ArrowRight className={`size-4 transition-transform ${activeStyle === style.id ? "translate-x-0" : "-translate-x-2 opacity-0"}`} />
                  </Button>
                ))}
              </div>
              <div className="landing-glass group grid min-h-[360px] overflow-hidden rounded-xl border border-landing-border md:grid-cols-[0.8fr_1.2fr]">
                <div className="flex flex-col justify-between p-7 sm:p-9">
                  <div><p className="landing-kicker">{activeAd.eyebrow}</p><h3 className="mt-4 whitespace-pre-line font-display text-4xl font-bold leading-none">{activeAd.headline}</h3><p className="mt-5 text-sm leading-6 text-landing-muted">{activeAd.caption}</p></div>
                  <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-landing-muted"><Play className="size-4 text-landing-cyan" /> Preview ready to publish</div>
                </div>
                <div className="relative min-h-72 overflow-hidden">
                  <img src={activeAd.image} alt="Selected ad style preview" width={768} height={1365} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="landing-preview-side absolute inset-0" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="landing-kicker">From brief to broadcast</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-5xl">Everything your next winning ad needs.</h2></div>
              <p className="max-w-sm text-sm leading-6 text-landing-muted">Less production drag. More creative ready to test, learn from and scale.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature, index) => (
                <article key={feature.title} className="landing-card group relative overflow-hidden rounded-lg border border-landing-border p-7 transition-all duration-300 hover:-translate-y-1 hover:border-landing-violet/60 hover:shadow-[var(--shadow-violet)]">
                  <div className="mb-12 flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-lg border border-landing-border bg-landing-panel text-landing-cyan"><feature.icon className="size-5" /></span><span className="text-xs text-landing-subtle">0{index + 1}</span></div>
                  <h3 className="font-display text-xl font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-landing-muted">{feature.body}</p>
                  <p className="mt-7 border-t border-landing-border pt-4 text-xs font-semibold text-landing-subtle transition-colors group-hover:text-landing-cyan">{feature.stat}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-landing-border bg-landing-panel/20 px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center"><p className="landing-kicker">Simple credit pricing</p><h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">Pay for the ad you publish.</h2><p className="mx-auto mt-4 max-w-xl text-landing-muted">Choose your runtime. Longer stories use more credits. No confusing production fees.</p></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DURATION_OPTIONS.map((duration, index) => (
                <Link key={duration.seconds} to="/auth" className={`landing-price group rounded-lg border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-landing-cyan/70 hover:shadow-[var(--shadow-cyan)] ${index === 1 ? "border-landing-violet bg-landing-panel shadow-[var(--shadow-violet)]" : "border-landing-border bg-landing-panel/50"}`}>
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-landing-subtle">Vertical ad</span><ArrowRight className="size-4 -translate-x-2 text-landing-cyan opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" /></div>
                  <p className="mt-8 font-display text-3xl font-bold">{duration.seconds}<span className="text-base text-landing-muted">s</span></p>
                  <p className="mt-1 text-sm text-landing-muted">{formatCredits(duration.credits)} credits</p>
                </Link>
              ))}
            </div>
            <div className="mt-14 text-center">
              <h3 className="font-display text-2xl font-bold sm:text-3xl">Your first campaign starts on us.</h3>
              <p className="mx-auto mt-3 max-w-lg text-sm text-landing-muted">Create, refine and publish with 5 free credits. Upgrade only when you’re ready to make more.</p>
              <Button asChild size="lg" className="landing-cta mt-7 h-12 px-7 text-base"><Link to="/auth">Start free with 5 credits <ArrowRight className="size-4" /></Link></Button>
              <p className="mt-4 text-xs text-landing-subtle">Free exports include a SpotlightMaker watermark.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 py-8 text-center text-xs text-landing-subtle sm:px-6">© 2026 SpotlightMaker. Make attention count.</footer>
    </div>
  );
}