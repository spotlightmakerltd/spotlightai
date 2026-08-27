import { supabase } from "@/lib/supabase";

export type SetupIssue = {
  key: string;
  label: string;
  hint: string;
};

const REQUIRED_TABLES: { table: string; label: string }[] = [
  { table: "profiles", label: "profiles table" },
  { table: "video_generations", label: "video_generations table" },
  { table: "generation_events", label: "generation_events table (timeline)" },
  { table: "credit_purchases", label: "credit_purchases table (billing)" },
];

/**
 * Probes the connected Supabase project for the schema this app needs.
 * Distinguishes "missing table" from "blocked by RLS / missing grants".
 */
export async function runSetupCheck(): Promise<SetupIssue[]> {
  const issues: SetupIssue[] = [];

  for (const { table, label } of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (!error) continue;
    const message = error.message.toLowerCase();
    if (
      message.includes("does not exist") ||
      message.includes("could not find the table") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      issues.push({ key: table, label, hint: `${label} is missing from the database.` });
    } else if (message.includes("permission denied") || error.code === "42501") {
      issues.push({
        key: `${table}-grants`,
        label: `${label} permissions`,
        hint: `${label} exists but the app role has no access — GRANT statements or RLS policies are missing.`,
      });
    }
  }

  const { error: rpcError } = await supabase.rpc("deduct_credits", { amount: 0 });
  if (
    rpcError &&
    (rpcError.message.toLowerCase().includes("could not find") || rpcError.code === "PGRST202")
  ) {
    issues.push({
      key: "deduct_credits",
      label: "deduct_credits() function",
      hint: "The atomic credit deduction function has not been created.",
    });
  }

  return issues;
}
