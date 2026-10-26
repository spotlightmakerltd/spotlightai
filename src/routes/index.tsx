import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { CREDIT_PACKS, formatMoney } from "@/lib/billing";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Menu,
  Pause,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import productPreview from "@/assets/ad-preview-product.jpg";
import testimonialPreview from "@/assets/ad-preview-testimonial.jpg";
import salePreview from "@/assets/ad-preview-sale.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpotlightMaker — Vertical Ads Built to Convert" },
      {
        name: "description",
        content: "Turn a brief into a polished vertical video ad with scripts, voice, captions and production in one workflow.",
      },
      { property: "og:title", content: "SpotlightMaker — Vertical Ads Built to Convert" },
      { property: "og:description", content: "Five production stages. One finished vertical ad. Start with 5 free credits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const stages = [
  {
    number: "01",
    name: "Brief",
    time: "~8s",
    title: "A sharp brief built around your buyer",
    body: "Your offer, audience and goal are shaped into a clear production direction before the first line is written.",
    image: productPreview,
    label: "DTC skincare",
    caption: "Three drops. Fourteen days. Zero filter.",
  },
  {
    number: "02",
    name: "Script",
    time: "~14s",
    title: "Hook, body and outro written for the scroll",
    body: "Get compelling opening lines built around proven retention patterns. Swap any line and the rest re-flows.",
    image: testimonialPreview,
    label: "Gym franchise",
    caption: "The 6am class nobody wants to leave.",
  },
  {
    number: "03",
    name: "Captions",
    time: "~11s",
    title: "Captions that land exactly when they should",
    body: "Choose a visual system, type treatment and lower-third position that stays readable on every feed.",
    image: salePreview,
    label: "Local restaurant",
    caption: "We only make 80 of these a night.",
  },
  {
    number: "04",
    name: "Assemble",
    time: "~18s",
    title: "Every scene, voice and transition brought together",
    body: "Your chosen footage, natural voice and timed captions become one cohesive, conversion-ready vertical cut.",
    image: productPreview,
    label: "Product launch",
    caption: "Meet the ritual your shelf was missing.",
  },
  {
    number: "05",
    name: "Publish",
    time: "~7s",
    title: "A finished ad ready for every vertical feed",
    body: "Review the final frame, download the MP4 and send it straight to TikTok, Reels, Shorts or WhatsApp.",
    image: testimonialPreview,
    label: "Campaign ready",
    caption: "Built to stop thumbs. Ready to ship.",
  },
] as const;


const plans = [
  { name: "Free", price: "$0", detail: "5 credits, no card", features: ["5 starter credits", "All 5 production stages", "Watermarked exports"], cta: "Start free", featured: false },
  { name: "Studio", price: "$29", detail: "50 credits per month", features: ["50 monthly credits", "Watermark-free exports", "Priority production"], cta: "Choose Studio", featured: true },
  { name: "Scale", price: "$79", detail: "160 credits per month", features: ["160 monthly credits", "Campaign-ready output", "Volume credit savings"], cta: "Choose Scale", featured: false },
] as const;

function Landing() {
  const [activeStage, setActiveStage] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const stage = stages[activeStage] ?? stages[0];
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // OAuth and email-confirmation links return to the origin — send signed-in
  // users straight to the dashboard once the session is detected.
  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActiveStage((current) => (current + 1) % stages.length), 3200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const selectStage = (index: number) => {
    setActiveStage(index);
    setPlaying(false);
  };

  return (
    <div className="spotlight-site min-h-screen overflow-hidden bg-landing text-landing-foreground">
      <header className="sticky top-0 z-50 border-b border-landing-border bg-landing/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-landing-muted md:flex" aria-label="Main navigation">
            <a href="#workflow" className="transition-colors hover:text-landing-foreground">Workflow</a>
            <a href="#pricing" className="transition-colors hover:text-landing-foreground">Pricing</a>
            <Link to="/auth" className="transition-colors hover:text-landing-foreground">Sign in</Link>
            <Button asChild className="landing-primary h-10 rounded-full px-5"><Link to="/auth">Start free</Link></Button>
          </nav>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen((open) => !open)} className="size-12 rounded-full border border-landing-border-strong bg-landing-panel/60 text-landing-foreground hover:bg-landing-panel hover:text-landing-foreground md:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="border-t border-landing-border bg-landing-panel/95 px-5 py-5 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[{ href: "#workflow", label: "Workflow" }, { href: "#pricing", label: "Pricing" }].map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="border-b border-landing-border py-4 text-lg font-bold">{item.label}</a>
              ))}
              <Button asChild className="landing-primary mt-4 h-12 rounded-full"><Link to="/auth">Start free with 5 credits</Link></Button>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="landing-hero relative px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:pb-32 lg:pt-24">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-24">
            <div className="relative z-10 max-w-3xl">
              <p className="hero-enter hero-enter-1 mb-7 flex items-center gap-2 text-xs font-bold uppercase text-landing-muted"><span className="size-2 rounded-full bg-landing-violet shadow-[var(--shadow-violet-dot)]" /> Five stages. One finished ad.</p>
              <h1 className="hero-enter hero-enter-2 text-4xl font-extrabold leading-[1.05] tracking-tight [text-wrap:balance] sm:text-6xl sm:leading-[0.98] md:text-7xl lg:text-[clamp(3.9rem,5.25vw,4.2rem)] lg:leading-[1.04]">
                Turn your business into a <span className="landing-gradient-text landing-underline relative inline-block"><span className="whitespace-nowrap">scroll-stopping</span> ad</span> in 60 seconds
              </h1>
              <p className="hero-enter hero-enter-3 mt-8 max-w-2xl text-lg leading-8 text-landing-muted sm:text-xl">
                SpotlightMaker writes the hook, shapes every scene, styles your captions and assembles a vertical 9:16 ad ready for TikTok, Reels, Shorts and WhatsApp.
              </p>
              <div className="hero-enter hero-enter-4 mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="landing-primary h-14 flex-1 rounded-full px-7 text-base font-bold"><Link to="/auth">Start free with 5 credits <ArrowRight className="size-5" /></Link></Button>
                <Button variant="ghost" size="lg" onClick={() => document.querySelector("#workflow")?.scrollIntoView({ behavior: "smooth" })} className="h-14 flex-1 rounded-full border border-landing-border-strong bg-landing-panel/40 text-base font-bold text-landing-foreground hover:bg-landing-panel hover:text-landing-foreground"><Play className="size-4 fill-current" /> See the workflow</Button>
              </div>
            </div>

            <div className="landing-stage relative mx-auto w-full max-w-xl">
              <div className="landing-phone group relative mx-auto aspect-[9/16] w-[min(79vw,370px)] overflow-hidden rounded-[2.4rem] border border-landing-border-strong bg-landing-panel shadow-[var(--shadow-phone)]">
                <img src={stage.image} alt={`${stage.label} vertical ad preview`} width={768} height={1365} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
                <div className="landing-preview-shade absolute inset-0" />
                <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                  <span className="rounded-full border border-landing-border-strong bg-landing/55 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">{stage.label}</span>
                  <span className="flex size-11 items-center justify-center rounded-full border border-landing-border bg-landing-foreground/15 backdrop-blur-md"><Play className="size-4 fill-current" /></span>
                </div>
                <p className="absolute inset-x-6 bottom-8 text-3xl font-extrabold leading-tight">{stage.caption}</p>
              </div>
              <div className="landing-chip absolute -right-1 top-[23%] hidden items-center gap-2 sm:flex"><Sparkles className="size-4 text-landing-violet" /> Best hook routed</div>
              <div className="landing-chip absolute -left-2 bottom-[21%] hidden items-center gap-2 sm:flex"><Check className="size-4 text-landing-lime" /> Captions timed</div>
            </div>
          </div>
        </section>

        <section id="workflow" className="workflow-glow border-y border-landing-border px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="landing-kicker">The production line</p>
              <h2 className="mt-5 text-4xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">Five stages between your brief and a finished ad</h2>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-landing-muted">Each stage is its own focused job, so you can refine one without rebuilding the others. Step through the workflow to see exactly what comes back.</p>
            </div>

            <div className="mt-16 grid items-start gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
              <div className="lg:sticky lg:top-28">
                <div className="mb-8 min-h-48 transition-all duration-300">
                  <p className="text-3xl font-extrabold leading-tight sm:text-4xl">{stage.title}</p>
                  <p className="mt-5 text-base leading-7 text-landing-muted">{stage.body}</p>
                </div>
                <div className="mb-9 flex gap-3">
                  <Button variant="ghost" size="icon" onClick={() => selectStage((activeStage + stages.length - 1) % stages.length)} className="stage-control"><ArrowLeft /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setPlaying((value) => !value)} className="stage-control" aria-label={playing ? "Pause workflow" : "Play workflow"}>{playing ? <Pause /> : <Play className="fill-current" />}</Button>
                  <Button variant="ghost" size="icon" onClick={() => selectStage((activeStage + 1) % stages.length)} className="stage-control"><ArrowRight /></Button>
                </div>
                <div className="space-y-4">
                  {stages.map((item, index) => (
                    <Button key={item.name} variant="ghost" onClick={() => selectStage(index)} className={`workflow-step h-auto w-full rounded-none px-0 py-3 text-left ${activeStage === index ? "is-active" : ""}`}>
                      <span className="w-7 text-xs font-bold">{item.number}</span><span className="flex-1 text-lg font-bold">{item.name}</span><span className="text-xs text-landing-subtle">{item.time}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="landing-glass overflow-hidden rounded-[2rem] border border-landing-border-strong shadow-[var(--shadow-panel)]">
                <div className="flex items-center justify-between border-b border-landing-border px-6 py-5 sm:px-8">
                  <div className="flex items-center gap-3"><span className="font-bold text-landing-violet">{stage.number}</span><span className="text-lg font-bold">{stage.name}</span></div>
                  <span className="text-sm text-landing-subtle">{stage.time}</span>
                </div>
                <div className="p-5 sm:p-8">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-landing-border">
                    <img key={stage.number} src={stage.image} alt={`${stage.name} stage preview`} width={768} height={1024} className="stage-image h-full w-full object-cover" />
                    <div className="landing-preview-shade absolute inset-0" />
                    <span className="absolute left-5 top-5 rounded-full border border-landing-border bg-landing/55 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">{stage.label}</span>
                    <p className="absolute inset-x-5 bottom-7 text-center text-xl font-extrabold sm:text-3xl">{stage.caption}</p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-landing-foreground/70 bg-landing-foreground/5 p-4 text-sm font-bold">Bold Pop</div>
                    <div className="rounded-xl border border-landing-border bg-landing-violet/10 p-4 text-sm font-semibold text-landing-muted">Clean Sub</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="showcase" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="landing-kicker">Made in SpotlightMaker</p>
              <h2 className="mt-5 text-4xl font-extrabold leading-none sm:text-6xl lg:text-7xl">Ads that ran, and what they did</h2>
              <p className="mt-7 text-lg leading-8 text-landing-muted">Every frame below came out of the same five-stage workflow. No agency, no editor, no re-shoot.</p>
            </div>
            <div className="mt-16 grid gap-12 md:grid-cols-3 md:items-start">
              {showcases.map((item, index) => (
                <article key={item.brand} className={`showcase-item group ${index === 1 ? "md:mt-24" : index === 2 ? "md:mt-48" : ""}`}>
                  <div className="relative aspect-[9/14] overflow-hidden rounded-[2rem] border border-landing-border-strong bg-landing-panel shadow-[var(--shadow-panel)]">
                    <img src={item.image} alt={`${item.brand} vertical advertisement`} width={768} height={1195} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    <div className="landing-preview-shade absolute inset-0" />
                    <span className="absolute left-5 top-5 rounded-full border border-landing-border bg-landing/55 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">{item.tag}</span>
                    <span className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-full bg-landing-foreground/15 backdrop-blur-md"><Play className="size-4 fill-current" /></span>
                    <p className="absolute inset-x-6 bottom-7 text-2xl font-extrabold leading-tight">{item.caption}</p>
                  </div>
                  <div className="mt-7 flex items-start gap-5">
                    <strong className="text-5xl font-extrabold text-landing-violet">{item.metric}</strong>
                    <p className="pt-1 text-sm leading-6 text-landing-muted"><b className="block text-base text-landing-foreground">{item.brand}</b>{item.result}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-landing-border bg-landing-panel/25 px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div><p className="landing-kicker">A complete production team</p><h2 className="mt-5 max-w-3xl text-4xl font-extrabold leading-none sm:text-6xl lg:text-7xl">The parts you’d otherwise hire for</h2><p className="mt-7 max-w-2xl text-lg leading-8 text-landing-muted">A copywriter, an editor, a voice actor and a media buyer’s checklist — folded into the workflow instead of bolted on as features.</p></div>
            <div className="grid grid-cols-2 border-t border-landing-border pt-8">
              <div><p className="text-sm text-landing-muted">Median production</p><p className="mt-3 text-5xl font-extrabold">58s</p></div>
              <div><p className="text-sm text-landing-muted">Ads shipped</p><p className="mt-3 text-5xl font-extrabold">412k</p></div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center"><p className="landing-kicker">Simple credit pricing</p><h2 className="mt-5 text-4xl font-extrabold leading-none sm:text-6xl lg:text-7xl">One credit system. No production surprises.</h2><p className="mt-7 text-lg leading-8 text-landing-muted">Drafts and refinements are free. Credits are used when your finished ad enters production.</p></div>
            <div className="mt-16 grid gap-5 lg:grid-cols-3 lg:items-start">
              {plans.map((plan) => (
                <article key={plan.name} className={`pricing-card relative rounded-[2rem] border p-7 sm:p-9 ${plan.featured ? "is-featured lg:-mt-5 lg:pb-14 lg:pt-11" : "border-landing-border bg-landing-panel/35"}`}>
                  {plan.featured && <span className="absolute right-7 top-7 rounded-full bg-landing-violet px-3 py-1 text-xs font-bold">Most popular</span>}
                  <p className="text-xl font-bold">{plan.name}</p>
                  <div className="mt-9 flex items-end gap-2"><span className="text-6xl font-extrabold">{plan.price}</span>{plan.name !== "Free" && <span className="pb-2 text-landing-muted">/month</span>}</div>
                  <p className="mt-3 text-landing-muted">{plan.detail}</p>
                  <ul className="my-9 space-y-4 border-y border-landing-border py-7">
                    {plan.features.map((feature) => <li key={feature} className="flex items-center gap-3 text-sm text-landing-muted"><Check className="size-5 text-landing-lime" />{feature}</li>)}
                  </ul>
                  <Button asChild className={`h-13 w-full rounded-full text-base font-bold ${plan.featured ? "landing-primary" : "bg-landing-foreground text-landing hover:bg-landing-foreground/85"}`}><Link to="/auth">{plan.cta}<ChevronRight className="size-4" /></Link></Button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-landing-border px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div><Brand /><p className="mt-6 max-w-sm text-sm leading-7 text-landing-muted">Vertical ads for ambitious businesses, written, styled and assembled in about a minute.</p></div>
          <div><p className="text-xs font-bold uppercase text-landing-foreground">Product</p><div className="mt-5 flex flex-col gap-4 text-sm text-landing-muted"><a href="#workflow">Workflow</a><a href="#showcase">Results</a><a href="#pricing">Pricing</a></div></div>
          <div><p className="text-xs font-bold uppercase text-landing-foreground">Account</p><div className="mt-5 flex flex-col gap-4 text-sm text-landing-muted"><Link to="/auth">Sign in</Link><Link to="/auth">Create account</Link></div></div>
        </div>
        <p className="mx-auto mt-14 max-w-7xl border-t border-landing-border pt-6 text-xs text-landing-subtle">© 2026 SpotlightMaker. Make attention count.</p>
      </footer>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="SpotlightMaker home">
      <span className="landing-logo flex size-11 items-center justify-center rounded-xl text-landing-foreground"><Sparkles className="size-5" /></span>
      <span className="text-xl font-extrabold sm:text-2xl">SpotlightMaker</span>
    </Link>
  );
}