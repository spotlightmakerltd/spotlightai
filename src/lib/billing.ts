export type CreditPack = {
  id: string;
  label: string;
  credits: number;
  /** Amount in the smallest currency unit (cents / kobo). */
  usdMinor: number;
  ngnMinor: number;
  tier: "free" | "pro";
  blurb: string;
  popular?: boolean;
};

/**
 * Credit value ≈ $0.63–0.90 per credit across packs. Against the real engine
 * cost (motion ≈ $0.07/second, base render ≈ $0.20/ad) this keeps every
 * combination in the 80–90% gross-margin band:
 *  - base render: 15s = 2cr · 30s = 3cr · 45s = 4cr · 60s = 5cr
 *  - real motion: +3 credits per 5-second scene (Pro tier)
 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter top-up",
    credits: 10,
    usdMinor: 900,
    ngnMinor: 1400000,
    tier: "free",
    blurb: "≈ 5 short 15s ads or 3 full 30s ads. Keeps your current plan.",
  },
  {
    id: "pro",
    label: "Pro pack",
    credits: 40,
    usdMinor: 2900,
    ngnMinor: 4500000,
    tier: "pro",
    blurb: "Unlocks Pro: AI motion scenes, watermark-free exports.",
    popular: true,
  },
  {
    id: "studio",
    label: "Studio pack",
    credits: 110,
    usdMinor: 6900,
    ngnMinor: 10500000,
    tier: "pro",
    blurb: "Best value for agencies running weekly campaigns.",
  },
];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function formatMoney(pack: CreditPack, provider: "stripe" | "paystack"): string {
  return provider === "paystack"
    ? `₦${(pack.ngnMinor / 100).toLocaleString("en-NG")}`
    : `$${(pack.usdMinor / 100).toFixed(2)}`;
}
