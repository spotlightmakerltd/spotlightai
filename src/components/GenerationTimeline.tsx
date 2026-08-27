import { Check, Clock, Loader2, X } from "lucide-react";
import { TIMELINE_STAGES, type GenerationEvent } from "@/lib/timeline";

export function GenerationTimeline({ events }: { events: GenerationEvent[] }) {
  const byStage = new Map<string, GenerationEvent>();
  for (const e of events) byStage.set(e.stage, e);

  return (
    <div className="card-soft space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Production timeline</h3>
      </div>
      <ol className="relative space-y-4 border-l border-border pl-6">
        {TIMELINE_STAGES.map((stage) => {
          const event = byStage.get(stage.id);
          const state = event?.status ?? "pending";
          return (
            <li key={stage.id} className="relative">
              <span
                className={`absolute -left-[31px] flex size-5 items-center justify-center rounded-full border ${
                  state === "completed"
                    ? "bg-brand border-transparent text-primary-foreground"
                    : state === "failed"
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : state === "running"
                        ? "border-primary bg-card text-primary"
                        : "border-border bg-card text-muted-foreground"
                }`}
              >
                {state === "completed" ? (
                  <Check className="size-3" />
                ) : state === "failed" ? (
                  <X className="size-3" />
                ) : state === "running" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : null}
              </span>
              <p
                className={`text-sm ${state === "pending" ? "text-muted-foreground" : "font-medium"}`}
              >
                {stage.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {event
                  ? `${event.detail ? `${event.detail} · ` : ""}${new Date(event.created_at).toLocaleTimeString()}`
                  : "Not yet"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
