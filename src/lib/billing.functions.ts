import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CREDIT_PACKS, getPack } from "@/lib/billing";

const SUPABASE_URL = "https://xhzmwcevyxaphsxibnxg.supabase.co";

const StartSchema = z.object({
  packId: z.string().min(1),
  provider: z.enum(["stripe", "paystack"]),
  accessToken: z.string().min(10),
  origin: z.string().url(),
});

const ConfirmSchema = z.object({
  reference: z.string().min(3),
  provider: z.enum(["stripe", "paystack"]),
  accessToken: z.string().min(10),
});

type AuthedUser = { id: string; email: string | null };

async function serverClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) throw new Error("MISSING_SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env["SUPABASE_URL"] ?? SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUser(accessToken: string): Promise<AuthedUser> {
  const admin = await serverClient();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return { id: data.user.id, email: data.user.email ?? null };
}

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StartSchema.parse(d))
  .handler(async ({ data }) => {
    const pack = getPack(data.packId);
    if (!pack) throw new Error("UNKNOWN_PACK");
    const user = await getUser(data.accessToken);
    const admin = await serverClient();

    if (data.provider === "stripe") {
      const secret = process.env["STRIPE_SECRET_KEY"];
      if (!secret) return { ok: false as const, error: "STRIPE_NOT_CONFIGURED" };

      const body = new URLSearchParams({
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(pack.usdMinor),
        "line_items[0][price_data][product_data][name]":
          `SpotlightMaker — ${pack.label} (${pack.credits} credits)`,
        success_url: `${data.origin}/dashboard?provider=stripe&reference={CHECKOUT_SESSION_ID}`,
        cancel_url: `${data.origin}/dashboard?billing=cancelled`,
        "metadata[pack_id]": pack.id,
        "metadata[user_id]": user.id,
      });
      if (user.email) body.set("customer_email", user.email);

      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
      if (!res.ok || !json.url || !json.id) {
        return { ok: false as const, error: json.error?.message ?? "Stripe checkout failed" };
      }

      await admin.from("credit_purchases").insert({
        user_id: user.id,
        provider: "stripe",
        reference: json.id,
        pack_id: pack.id,
        credits: pack.credits,
        amount_minor: pack.usdMinor,
        currency: "USD",
        tier: pack.tier,
        status: "pending",
      });

      return { ok: true as const, url: json.url };
    }

    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) return { ok: false as const, error: "PAYSTACK_NOT_CONFIGURED" };
    if (!user.email) return { ok: false as const, error: "Paystack requires an account email" };

    const reference = `sm_${user.id.slice(0, 8)}_${Date.now()}`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: pack.ngnMinor,
        currency: "NGN",
        reference,
        callback_url: `${data.origin}/dashboard?provider=paystack&reference=${reference}`,
        metadata: { pack_id: pack.id, user_id: user.id },
      }),
    });
    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string };
    };
    if (!res.ok || !json.status || !json.data?.authorization_url) {
      return { ok: false as const, error: json.message ?? "Paystack checkout failed" };
    }

    await admin.from("credit_purchases").insert({
      user_id: user.id,
      provider: "paystack",
      reference,
      pack_id: pack.id,
      credits: pack.credits,
      amount_minor: pack.ngnMinor,
      currency: "NGN",
      tier: pack.tier,
      status: "pending",
    });

    return { ok: true as const, url: json.data.authorization_url };
  });

export const confirmPurchase = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ConfirmSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await getUser(data.accessToken);
    const admin = await serverClient();

    const { data: purchase } = await admin
      .from("credit_purchases")
      .select("*")
      .eq("reference", data.reference)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!purchase) return { ok: false as const, error: "Purchase not found" };
    if (purchase.status === "completed") {
      return { ok: true as const, alreadyApplied: true, credits: Number(purchase.credits) };
    }

    let paid = false;
    if (data.provider === "stripe") {
      const secret = process.env["STRIPE_SECRET_KEY"];
      if (!secret) return { ok: false as const, error: "STRIPE_NOT_CONFIGURED" };
      const res = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      const json = (await res.json()) as { payment_status?: string };
      paid = res.ok && json.payment_status === "paid";
    } else {
      const secret = process.env["PAYSTACK_SECRET_KEY"];
      if (!secret) return { ok: false as const, error: "PAYSTACK_NOT_CONFIGURED" };
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      const json = (await res.json()) as { status?: boolean; data?: { status?: string } };
      paid = res.ok && json.status === true && json.data?.status === "success";
    }

    if (!paid) return { ok: false as const, error: "Payment not completed yet" };

    const { data: profile } = await admin
      .from("profiles")
      .select("credits, subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const nextCredits = Number(profile?.credits ?? 0) + Number(purchase.credits);
    const nextTier =
      purchase.tier === "pro" ? "pro" : ((profile?.subscription_tier as string) ?? "free");

    await admin
      .from("profiles")
      .update({ credits: nextCredits, subscription_tier: nextTier })
      .eq("id", user.id);

    await admin
      .from("credit_purchases")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("reference", data.reference);

    return {
      ok: true as const,
      alreadyApplied: false,
      credits: Number(purchase.credits),
      tier: nextTier,
    };
  });

export const billingStatus = createServerFn({ method: "GET" }).handler(async () => ({
  stripe: Boolean(process.env["STRIPE_SECRET_KEY"]),
  paystack: Boolean(process.env["PAYSTACK_SECRET_KEY"]),
  serviceRole: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]),
  packs: CREDIT_PACKS.map((p) => p.id),
}));
