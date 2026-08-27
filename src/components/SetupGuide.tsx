import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SetupIssue } from "@/lib/setup-check";

export function SetupGuide({
  issues,
  onRecheck,
  checking,
}: {
  issues: SetupIssue[];
  onRecheck: () => void;
  checking: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPath() {
    await navigator.clipboard.writeText("supabase-setup.sql");
    setCopied(true);
    toast.success("Filename copied");
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="card-soft space-y-6 p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Finish your Supabase setup</h1>
            <p className="text-sm text-muted-foreground">
              The dashboard needs a few database objects that aren&apos;t in your project yet.
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {issues.map((issue) => (
            <li
              key={issue.key}
              className="rounded-lg border border-border bg-muted/40 p-3 text-sm"
            >
              <p className="font-medium">{issue.label}</p>
              <p className="text-xs text-muted-foreground">{issue.hint}</p>
            </li>
          ))}
        </ul>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Open your Supabase project → <span className="font-medium text-foreground">SQL Editor</span>.
          </li>
          <li>
            Paste the contents of{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">supabase-setup.sql</code>{" "}
            from this project&apos;s root folder.
          </li>
          <li>Run it — it is idempotent and safe to run again.</li>
          <li>Come back here and re-check.</li>
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onRecheck} disabled={checking} className="bg-brand text-primary-foreground">
            <RefreshCw className={`mr-1 size-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Re-check setup"}
          </Button>
          <Button variant="outline" onClick={() => void copyPath()}>
            {copied ? <Check className="mr-1 size-4" /> : <Copy className="mr-1 size-4" />}
            Copy file name
          </Button>
        </div>
      </div>
    </div>
  );
}
