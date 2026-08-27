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

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter top-up",
    credits: 20,
    usdMinor: 900,
    ngnMinor: 1400000,
    tier: "free",
    blurb: "≈ 4 full 60s ads. Keeps your current plan.",
  },
  {
    id: "pro",
    label: "Pro pack",
    credits: 75,
    usdMinor: 2900,
    ngnMinor: 4500000,
    tier: "pro",
    blurb: "Unlocks Pro: watermark-free exports, no limits.",
    popular: true,
  },
  {
    id: "studio",
    label: "Studio pack",
    credits: 200,
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
