import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_GOALS, DURATION_OPTIONS, creditsFor, formatCredits } from "@/lib/pricing";

export type AdFormValues = {
  businessName: string;
  niche: string;
  campaignGoal: string;
  targetAudience: string;
  durationSeconds: number;
};

const STORAGE_KEY = "spotlightmaker-form-draft";

const EMPTY: AdFormValues = {
  businessName: "",
  niche: "",
  campaignGoal: "Drive Sales",
  targetAudience: "",
  durationSeconds: 30,
};

type Errors = Partial<Record<keyof AdFormValues, string>>;

function validate(values: AdFormValues): Errors {
  const errors: Errors = {};
  if (values.businessName.trim().length < 2) errors.businessName = "Enter your business name.";
  if (values.niche.trim().length < 2) errors.niche = "Tell us your industry or niche.";
  if (!values.campaignGoal) errors.campaignGoal = "Pick a campaign goal.";
  if (values.targetAudience.trim().length < 3)
    errors.targetAudience = "Describe who this ad is for.";
  return errors;
}

export function GenerateForm({
  onSubmit,
  busy,
  credits,
}: {
  onSubmit: (values: AdFormValues, cost: number) => void;
  busy: boolean;
  credits: number;
}) {
  const [values, setValues] = useState<AdFormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setValues({ ...EMPTY, ...(JSON.parse(raw) as AdFormValues) });
        setRestored(true);
      } catch {
        /* ignore malformed draft */
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  const cost = creditsFor(values.durationSeconds);
  const insufficient = credits < cost;

  function set<K extends keyof AdFormValues>(key: K, value: AdFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) setErrors(validate(next));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({
      businessName: true,
      niche: true,
      campaignGoal: true,
      targetAudience: true,
    });
    if (Object.keys(found).length > 0) return;
    onSubmit(values, cost);
  }

  const field = (key: keyof AdFormValues) =>
    errors[key] ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <form onSubmit={submit} className="card-soft flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">Create your ad</h2>
        <p className="text-sm text-muted-foreground">
          {restored ? "Draft restored — your inputs autosave as you type." : "Inputs autosave automatically."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          value={values.businessName}
          className={field("businessName")}
          onBlur={() => {
            setTouched((t) => ({ ...t, businessName: true }));
            setErrors(validate(values));
          }}
          onChange={(e) => set("businessName", e.target.value)}
          placeholder="Bloom Dental Studio"
        />
        {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="niche">Industry / niche</Label>
        <Input
          id="niche"
          value={values.niche}
          className={field("niche")}
          onBlur={() => {
            setTouched((t) => ({ ...t, niche: true }));
            setErrors(validate(values));
          }}
          onChange={(e) => set("niche", e.target.value)}
          placeholder="Cosmetic dentistry"
        />
        {errors.niche && <p className="text-xs text-destructive">{errors.niche}</p>}
      </div>

      <div className="space-y-2">
        <Label>Campaign goal</Label>
        <Select value={values.campaignGoal} onValueChange={(v) => set("campaignGoal", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a goal" />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_GOALS.map((goal) => (
              <SelectItem key={goal} value={goal}>
                {goal}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audience">Target audience</Label>
        <Input
          id="audience"
          value={values.targetAudience}
          className={field("targetAudience")}
          onBlur={() => {
            setTouched((t) => ({ ...t, targetAudience: true }));
            setErrors(validate(values));
          }}
          onChange={(e) => set("targetAudience", e.target.value)}
          placeholder="Busy professionals aged 28-45"
        />
        {errors.targetAudience && (
          <p className="text-xs text-destructive">{errors.targetAudience}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Ad length</Label>
        <Select
          value={String(values.durationSeconds)}
          onValueChange={(v) => set("durationSeconds", Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((d) => (
              <SelectItem key={d.seconds} value={String(d.seconds)}>
                {d.seconds}s — {formatCredits(d.credits)} credits
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pricing: 10s = 2 · 20s = 3.5 · 30s = 4.5 · 40s = 5.5 · 50s = 6.5 · 60s = 8 credits.
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={busy || insufficient}
        className="bg-brand w-full text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
      >
        <Zap className="mr-1 size-4" />
        {busy ? "Generating…" : `Generate Ad (${formatCredits(cost)} Credits)`}
      </Button>
      {insufficient && (
        <p className="text-center text-xs text-destructive">
          You need {formatCredits(cost)} credits for a {values.durationSeconds}s ad.
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Scripts are routed automatically to the best-performing model — no provider picking needed.
      </p>
    </form>
  );
}
