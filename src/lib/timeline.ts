import { supabase } from "@/lib/supabase";

export const TIMELINE_STAGES = [
  { id: "script", label: "Ad copy written" },
  { id: "voiceover", label: "Voice track recorded" },
  { id: "captions", label: "Captions styled" },
  { id: "render", label: "Video produced" },
  { id: "export", label: "Ready to publish" },
] as const;

export type TimelineStage = (typeof TIMELINE_STAGES)[number]["id"];

export type GenerationEvent = {
  id: string;
  generation_id: string;
  user_id: string;
  stage: string;
  status: string;
  detail: string | null;
  created_at: string;
};

export async function logGenerationEvent(input: {
  generationId: string;
  userId: string;
  stage: TimelineStage;
  status?: "completed" | "failed" | "running";
  detail?: string | undefined;
}): Promise<void> {
  await supabase.from("generation_events").insert({
    generation_id: input.generationId,
    user_id: input.userId,
    stage: input.stage,
    status: input.status ?? "completed",
    detail: input.detail ?? null,
  });
}

export async function fetchGenerationEvents(generationId: string): Promise<GenerationEvent[]> {
  const { data } = await supabase
    .from("generation_events")
    .select("*")
    .eq("generation_id", generationId)
    .order("created_at", { ascending: true });
  return (data as GenerationEvent[]) ?? [];
}
