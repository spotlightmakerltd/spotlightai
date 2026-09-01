import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppNavbar } from "@/components/AppNavbar";
import { GenerateForm, type AdFormValues } from "@/components/GenerateForm";
import { HistoryPanel } from "@/components/HistoryPanel";
import { GENERATION_STEPS, ScriptStudio } from "@/components/ScriptStudio";
import { useAuth } from "@/hooks/use-auth";
import { supabase, type VideoGeneration } from "@/lib/supabase";
import { generateAdScript, type AdScript } from "@/lib/script.functions";
import { SetupGuide } from "@/components/SetupGuide";
import { GenerationTimeline } from "@/components/GenerationTimeline";
import { runSetupCheck, type SetupIssue } from "@/lib/setup-check";
import {
  fetchGenerationEvents,
  logGenerationEvent,
  type GenerationEvent,
  type TimelineStage,
} from "@/lib/timeline";
import { confirmPurchase } from "@/lib/billing.functions";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — SpotlightMaker Ad Studio" },
      {
        name: "description",
        content:
          "Generate, style and export AI short-form video ad scripts with hook, body and outro scenes.",
      },
      { property: "og:title", content: "SpotlightMaker Dashboard" },
      {
        property: "og:description",
        content: "Your AI ad studio: scripts, captions and 9:16 exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, session, loading, refreshProfile } = useAuth();
  const [history, setHistory] = useState<VideoGeneration[]>([]);
  const [script, setScript] = useState<AdScript | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState({ businessName: "", durationSeconds: 30 });
  const [events, setEvents] = useState<GenerationEvent[]>([]);
  const [issues, setIssues] = useState<SetupIssue[] | null>(null);
  const [checking, setChecking] = useState(false);

  const checkSetup = useCallback(async () => {
    setChecking(true);
    try {
      setIssues(await runSetupCheck());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (user) void checkSetup();
  }, [user, checkSetup]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  // Clear all screen state when the session ends.
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setScript(null);
      setActiveId(null);
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("video_generations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as VideoGeneration[]) ?? []);
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const loadEvents = useCallback(async (generationId: string | null) => {
    if (!generationId) {
      setEvents([]);
      return;
    }
    setEvents(await fetchGenerationEvents(generationId));
  }, []);

  useEffect(() => {
    void loadEvents(activeId);
  }, [activeId, loadEvents]);

  // Return trip from Stripe / Paystack checkout — verify, credit, refresh balance.
  useEffect(() => {
    if (!session?.access_token) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    const provider = params.get("provider");
    if (params.get("billing") === "cancelled") {
      toast.info("Checkout cancelled — no charge was made.");
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (!reference || (provider !== "stripe" && provider !== "paystack")) return;
    window.history.replaceState({}, "", "/dashboard");
    void (async () => {
      const res = await confirmPurchase({
        data: { reference, provider, accessToken: session.access_token },
      });
      if (res.ok) {
        await refreshProfile();
        toast.success(
          res.alreadyApplied
            ? "This purchase was already applied."
            : `Payment confirmed — ${res.credits} credits added.`,
        );
      } else {
        toast.error(res.error ?? "We could not confirm that payment.");
      }
    })();
  }, [session, refreshProfile]);

  // Optimistically paint the timeline, then persist the event in the background.
  const recordStage = useCallback(
    (
      stage: TimelineStage,
      detail?: string,
      status: "completed" | "failed" | "running" = "completed",
      generationId?: string,
    ) => {
      const target = generationId ?? activeId;
      if (!user || !target) return;
      setEvents((prev) => {
        const next = prev.filter((e) => e.stage !== stage);
        next.push({
          id: `local-${stage}-${Date.now()}`,
          generation_id: target,
          user_id: user.id,
          stage,
          status,
          detail: detail ?? null,
          created_at: new Date().toISOString(),
        });
        return next;
      });
      void logGenerationEvent({ generationId: target, userId: user.id, stage, status, detail });
    },
    [user, activeId],
  );

  async function handleGenerate(values: AdFormValues, cost: number) {
    if (!user) return;
    setBusy(true);
    setStep(0);
    setScript(null);
    setMeta({ businessName: values.businessName, durationSeconds: values.durationSeconds });

    const prompt = `${values.businessName} | ${values.niche} | ${values.campaignGoal} | ${values.targetAudience} | ${values.durationSeconds}s`;

    const { data: row, error: insertError } = await supabase
      .from("video_generations")
      .insert({
        user_id: user.id,
        business_name: values.businessName,
        niche: values.niche,
        campaign_goal: values.campaignGoal,
        target_audience: values.targetAudience,
        duration_seconds: values.durationSeconds,
        credits_used: cost,
        prompt_input: prompt,
        status: "processing",
      })
      .select("*")
      .single();

    if (insertError || !row) {
      setBusy(false);
      toast.error(insertError?.message ?? "Could not start generation");
      return;
    }

    const { error: creditError } = await supabase.rpc("deduct_credits", { amount: cost });
    if (creditError) {
      await supabase
        .from("video_generations")
        .update({ status: "failed" })
        .eq("id", (row as VideoGeneration).id);
      setBusy(false);
      toast.error(
        creditError.message.includes("INSUFFICIENT")
          ? "Not enough credits for this ad length."
          : creditError.message,
      );
      void loadHistory();
      return;
    }
    void refreshProfile();

    const generationId = (row as VideoGeneration).id;
    setActiveId(generationId);
    setEvents([]);
    recordStage("script", "Writing your hook, body and outro…", "running", generationId);

    const timers = GENERATION_STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 900),
    );

    try {
      const result = await generateAdScript({
        data: {
          businessName: values.businessName,
          niche: values.niche,
          campaignGoal: values.campaignGoal,
          targetAudience: values.targetAudience,
          durationSeconds: values.durationSeconds,
        },
      });
      timers.forEach(clearTimeout);
      setStep(GENERATION_STEPS.length - 1);
      await supabase
        .from("video_generations")
        .update({ status: "completed", script: result })
        .eq("id", (row as VideoGeneration).id);
      setScript(result);
      recordStage("script", `${result.scenes.length} scenes`, "completed", generationId);
      toast.success("Ad script ready");
    } catch {
      timers.forEach(clearTimeout);
      recordStage("script", "Script generation failed", "failed", generationId);
      await supabase
        .from("video_generations")
        .update({ status: "failed" })
        .eq("id", (row as VideoGeneration).id);
      toast.error("Generation failed. Your credits were used for the attempt — contact support.");
    } finally {
      setBusy(false);
      void loadHistory();
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading your studio…
      </div>
    );
  }

  if (issues && issues.length > 0) {
    return (
      <div className="min-h-screen">
        <AppNavbar />
        <SetupGuide issues={issues} onRecheck={() => void checkSetup()} checking={checking} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNavbar />
      <main className="surface-glow mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <h1 className="sr-only">SpotlightMaker dashboard</h1>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:grid-cols-[280px_minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="order-3 xl:order-1">
            <HistoryPanel
              items={history}
              activeId={activeId}
              onSelect={(item) => {
                setActiveId(item.id);
                setScript((item.script as AdScript) ?? null);
                setMeta({
                  businessName: item.business_name,
                  durationSeconds: item.duration_seconds,
                });
              }}
            />
          </div>
          <div className="order-1 xl:order-2">
            <GenerateForm
              onSubmit={handleGenerate}
              busy={busy}
              credits={Number(profile?.credits ?? 0)}
            />
          </div>
          <div className="order-2 xl:order-3">
            <ScriptStudio
              script={script}
              busy={busy}
              step={step}
              businessName={meta.businessName}
              durationSeconds={meta.durationSeconds}
              isPaid={(profile?.subscription_tier ?? "free") !== "free"}
              onStage={(stage, detail, status) => recordStage(stage, detail, status)}
            />
            {activeId && (
              <div className="mt-6">
                <GenerationTimeline events={events} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
