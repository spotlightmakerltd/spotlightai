export const DURATION_OPTIONS = [
  { seconds: 10, credits: 2 },
  { seconds: 20, credits: 3.5 },
  { seconds: 30, credits: 4.5 },
  { seconds: 40, credits: 5.5 },
  { seconds: 50, credits: 6.5 },
  { seconds: 60, credits: 8 },
] as const;

export function creditsFor(seconds: number): number {
  return DURATION_OPTIONS.find((d) => d.seconds === seconds)?.credits ?? 2;
}

export function formatCredits(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export const CAMPAIGN_GOALS = [
  "Drive Sales",
  "Book Appointments",
  "Brand Awareness",
] as const;
