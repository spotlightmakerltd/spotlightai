/**
 * Credit pricing tuned against the real production engine cost
 * (motion video ≈ $0.07/second of generated clip) so every option
 * keeps an 80–90% gross margin.
 *
 * Every ad is cut from 5-second scenes — exactly the clip length the
 * motion engine produces — so ad lengths come in multiples of 15s
 * (3 scenes: hook, body, outro).
 */

export const SCENE_SECONDS = 5;

/** Cost of one ad render (script, captions, voice, assembly) in credits. */
export const DURATION_OPTIONS = [
  { seconds: 15, credits: 2 },
  { seconds: 30, credits: 3 },
  { seconds: 45, credits: 4 },
  { seconds: 60, credits: 5 },
] as const;

export function creditsFor(seconds: number): number {
  return DURATION_OPTIONS.find((d) => d.seconds === seconds)?.credits ?? 2;
}

export function formatCredits(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export const CAMPAIGN_GOALS = [
  "Drive Sales",
  "Book Appointments",
  "Brand Awareness",
] as const;

/** Real motion scenes cost extra per 5-second clip (Pro tier only). */
export const MOTION_CREDITS_PER_SCENE = 3;

export function scenesFor(seconds: number): number {
  return Math.max(1, Math.round(seconds / SCENE_SECONDS));
}

export function motionCreditsFor(seconds: number): number {
  return scenesFor(seconds) * MOTION_CREDITS_PER_SCENE;
}
