import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xhzmwcevyxaphsxibnxg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoem13Y2V2eXhhcGhzeGlibnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzgzODYsImV4cCI6MjEwMzI1NDM4Nn0.szGYvPI-OquOs9g5ED48_6d-ziQ9L4pxDN7xRVMldrc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "spotlightmaker-auth",
  },
});

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  credits: number;
  subscription_tier: "free" | "pro";
  created_at: string;
};

export type VideoGeneration = {
  id: string;
  user_id: string;
  business_name: string;
  niche: string;
  campaign_goal: string;
  target_audience: string;
  duration_seconds: number;
  credits_used: number;
  prompt_input: string;
  status: string;
  script: unknown;
  created_at: string;
};
