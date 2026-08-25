import { History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatCredits } from "@/lib/pricing";
import type { VideoGeneration } from "@/lib/supabase";

export function HistoryPanel({
  items,
  activeId,
  onSelect,
}: {
  items: VideoGeneration[];
  activeId?: string | null;
  onSelect: (item: VideoGeneration) => void;
}) {
  return (
    <aside className="card-soft flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        <History className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Generation history</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Your past ads will appear here and follow you across devices.
        </p>
      ) : (
        <ScrollArea className="max-h-[520px] pr-2">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onSelect(item)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    activeId === item.id ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <p className="truncate text-sm font-medium">{item.business_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.niche} · {item.campaign_goal}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {item.duration_seconds}s
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatCredits(Number(item.credits_used))} credits ·{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </aside>
  );
}
