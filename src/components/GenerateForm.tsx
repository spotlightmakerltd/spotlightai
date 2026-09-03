import { useEffect, useRef, useState } from "react";
import { Building2, ImagePlus, Loader2, Package, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMPAIGN_GOALS, DURATION_OPTIONS, creditsFor, formatCredits } from "@/lib/pricing";
import { INDUSTRIES, OTHER_INDUSTRY } from "@/lib/industries";
import { AUDIENCES, OTHER_AUDIENCE } from "@/lib/audiences";
import { clearForeignDrafts, draftKey } from "@/lib/drafts";
import { uploadBackgroundAsset } from "@/lib/upload-asset";

export type AdMode = "business" | "product";

export type AdFormValues = {
  mode: AdMode;
  businessName: string;
  niche: string;
  campaignGoal: string;
  targetAudience: string;
  durationSeconds: number;
  imageUrl: string;
};

type FormState = {
  mode: AdMode;
  businessName: string;
  industry: string;
  industryOther: string;
  productName: string;
  productDetails: string;
  campaignGoal: string;
  audience: string;
  audienceOther: string;
  durationSeconds: number;
  imageUrl: string;
};

const EMPTY: FormState = {
  mode: "business",
  businessName: "",
  industry: "",
  industryOther: "",
  productName: "",
  productDetails: "",
  campaignGoal: "Drive Sales",
  audience: "",
  audienceOther: "",
  durationSeconds: 30,
  imageUrl: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function resolvedIndustry(v: FormState): string {
  return v.industry === OTHER_INDUSTRY ? v.industryOther.trim() : v.industry;
}

function resolvedAudience(v: FormState): string {
  return v.audience === OTHER_AUDIENCE ? v.audienceOther.trim() : v.audience;
}

function validate(v: FormState): Errors {
  const errors: Errors = {};
  if (v.mode === "business") {
    if (v.businessName.trim().length < 2) errors.businessName = "Enter your business name.";
    if (resolvedIndustry(v).length < 2) errors.industry = "Choose or type your industry.";
  } else {
    if (v.productName.trim().length < 2) errors.productName = "Enter your product name.";
    if (v.productDetails.trim().length < 10)
      errors.productDetails = "Describe the product and its key benefits.";
  }
  if (!v.campaignGoal) errors.campaignGoal = "Pick a campaign goal.";
  if (resolvedAudience(v).length < 3) errors.audience = "Choose or type your target audience.";
  return errors;
}

export function GenerateForm({
  onSubmit,
  busy,
  credits,
  userId,
}: {
  onSubmit: (values: AdFormValues, cost: number) => void;
  busy: boolean;
  credits: number;
  userId: string;
}) {
  const [values, setValues] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Drafts are bound to the signed-in account; everything else is wiped on load.
  useEffect(() => {
    clearForeignDrafts(userId);
    const raw = window.localStorage.getItem(draftKey(userId));
    setValues(raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<FormState>) } : EMPTY);
    setErrors({});
    setTouched({});
  }, [userId]);

  useEffect(() => {
    window.localStorage.setItem(draftKey(userId), JSON.stringify(values));
  }, [values, userId]);

  const cost = creditsFor(values.durationSeconds);
  const insufficient = credits < cost;
  const isProduct = values.mode === "product";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) setErrors(validate(next));
  }

  function blur(key: keyof FormState) {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validate(values));
  }

  async function upload(file: File) {
    setUploading(true);
    const result = await uploadBackgroundAsset(file);
    setUploading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    set("imageUrl", result.url);
    toast.success("Photo added to your ad");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    setTouched({
      businessName: true,
      industry: true,
      productName: true,
      productDetails: true,
      campaignGoal: true,
      audience: true,
    });
    if (Object.keys(found).length > 0) return;
    onSubmit(
      {
        mode: values.mode,
        businessName: isProduct ? values.productName.trim() : values.businessName.trim(),
        niche: isProduct ? values.productDetails.trim() : resolvedIndustry(values),
        campaignGoal: values.campaignGoal,
        targetAudience: resolvedAudience(values),
        durationSeconds: values.durationSeconds,
        imageUrl: values.imageUrl,
      },
      cost,
    );
  }

  const field = (key: keyof FormState) =>
    errors[key] ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <form onSubmit={submit} className="card-soft flex flex-col gap-6 p-6 sm:p-7">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Make an ad that sells today
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us who you are and who should buy. We handle the script, captions and the finished
          video.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/60 p-1">
        {(
          [
            { id: "business", label: "Business", icon: Building2 },
            { id: "product", label: "Product", icon: Package },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => set("mode", tab.id)}
            aria-pressed={values.mode === tab.id}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              values.mode === tab.id
                ? "bg-card text-foreground shadow-[var(--shadow-soft)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isProduct ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="productName">Product name</Label>
            <Input
              id="productName"
              value={values.productName}
              className={field("productName")}
              onBlur={() => blur("productName")}
              onChange={(e) => set("productName", e.target.value)}
              placeholder="GlowDrop Vitamin C Serum"
            />
            {errors.productName && <p className="text-xs text-destructive">{errors.productName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productDetails">Product details & features</Label>
            <Textarea
              id="productDetails"
              rows={4}
              value={values.productDetails}
              className={field("productDetails")}
              onBlur={() => blur("productDetails")}
              onChange={(e) => set("productDetails", e.target.value)}
              placeholder="30ml serum, brightens skin in 2 weeks, cruelty free, ₦12,500 with free delivery"
            />
            {errors.productDetails && (
              <p className="text-xs text-destructive">{errors.productDetails}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={values.businessName}
              className={field("businessName")}
              onBlur={() => blur("businessName")}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="Bloom Dental Studio"
            />
            {errors.businessName && (
              <p className="text-xs text-destructive">{errors.businessName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Industry / niche</Label>
            <Select value={values.industry} onValueChange={(v) => set("industry", v)}>
              <SelectTrigger className={field("industry")}>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {values.industry === OTHER_INDUSTRY && (
              <Input
                autoFocus
                value={values.industryOther}
                className={field("industry")}
                onBlur={() => blur("industry")}
                onChange={(e) => set("industryOther", e.target.value)}
                placeholder="Type your industry"
              />
            )}
            {errors.industry && <p className="text-xs text-destructive">{errors.industry}</p>}
          </div>
        </>
      )}

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
          onBlur={() => blur("targetAudience")}
          onChange={(e) => set("targetAudience", e.target.value)}
          placeholder="Busy professionals aged 28-45"
        />
        {errors.targetAudience && (
          <p className="text-xs text-destructive">{errors.targetAudience}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{isProduct ? "Product photo" : "Brand photo"}</Label>
        <div className="flex items-center gap-3">
          {values.imageUrl ? (
            <img
              src={values.imageUrl}
              alt={isProduct ? "Uploaded product" : "Uploaded brand visual"}
              className="size-16 rounded-xl border border-border object-cover"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
              <ImagePlus className="size-5" />
            </span>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="mr-1 size-3.5" />
                )}
                {values.imageUrl ? "Replace photo" : "Upload photo"}
              </Button>
              {values.imageUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("imageUrl", "")}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Real photos convert best. Optional — we create the visuals when you skip this.
            </p>
          </div>
        </div>
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
          10s = 2 · 20s = 3.5 · 30s = 4.5 · 40s = 5.5 · 50s = 6.5 · 60s = 8 credits.
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={busy || insufficient}
        className="bg-brand h-12 w-full text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
      >
        <Zap className="mr-1 size-4" />
        {busy ? "Building your ad…" : `Create my ad (${formatCredits(cost)} credits)`}
      </Button>
      {insufficient && (
        <p className="text-center text-xs text-destructive">
          You need {formatCredits(cost)} credits for a {values.durationSeconds}s ad — top up to keep
          publishing.
        </p>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Your brief autosaves privately to your account. Nothing is shared between accounts.
      </p>
    </form>
  );
}
