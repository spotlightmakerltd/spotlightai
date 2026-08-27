import { useState } from "react";
import { CreditCard, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { CREDIT_PACKS, formatMoney } from "@/lib/billing";
import { startCheckout } from "@/lib/billing.functions";

type Provider = "stripe" | "paystack";

export function BuyCreditsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("stripe");
  const [pending, setPending] = useState<string | null>(null);

  async function buy(packId: string) {
    const token = session?.access_token;
    if (!token) {
      toast.error("Please sign in again");
      return;
    }
    setPending(packId);
    try {
      const res = await startCheckout({
        data: { packId, provider, accessToken: token, origin: window.location.origin },
      });
      if (!res.ok) {
        toast.error(
          res.error === "STRIPE_NOT_CONFIGURED"
            ? "Stripe isn't connected yet — add your Stripe secret key."
            : res.error === "PAYSTACK_NOT_CONFIGURED"
              ? "Paystack isn't connected yet — add your Paystack secret key."
              : res.error,
        );
        return;
      }
      window.location.href = res.url;
    } catch {
      toast.error("Could not start checkout. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="bg-brand text-primary-foreground">
            <Zap className="mr-1 size-3.5" /> Buy credits
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Top up your credits</DialogTitle>
          <DialogDescription>
            One click, instant balance refresh. You&apos;re on the{" "}
            <span className="font-medium capitalize">{profile?.subscription_tier ?? "free"}</span>{" "}
            plan.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={provider} onValueChange={(v) => setProvider(v as Provider)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stripe">Stripe (USD)</TabsTrigger>
            <TabsTrigger value="paystack">Paystack (NGN)</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{pack.label}</p>
                  {pack.popular && (
                    <Badge className="bg-brand text-primary-foreground text-[10px]">Popular</Badge>
                  )}
                  {pack.tier === "pro" && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Sparkles className="mr-1 size-3" /> Pro tier
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {pack.credits} credits · {pack.blurb}
                </p>
              </div>
              <Button
                size="sm"
                disabled={pending !== null}
                onClick={() => void buy(pack.id)}
                className="shrink-0"
              >
                {pending === pack.id ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : (
                  <CreditCard className="mr-1 size-3.5" />
                )}
                {formatMoney(pack, provider)}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Payments are processed by {provider === "stripe" ? "Stripe" : "Paystack"}. Your balance
          and plan refresh automatically when you return.
        </p>
      </DialogContent>
    </Dialog>
  );
}
