import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — SpotlightMaker Ad Studio" },
      {
        name: "description",
        content:
          "Create a free SpotlightMaker account and get 5 credits to launch your first high-converting video ad.",
      },
      { property: "og:title", content: "Sign in — SpotlightMaker" },
      {
        property: "og:description",
        content: "Sign up free and launch video ads that bring in customers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success("Welcome back");
    void navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (!data.session) {
      toast.success("Check your inbox to confirm your email, then log in.");
      return;
    }
    toast.success("Account created — 5 free credits added");
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="surface-glow flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-xl font-bold">SpotlightMaker</span>
        </Link>

        <div className="card-soft p-6">
          <Tabs defaultValue="signup">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Sign up</TabsTrigger>
              <TabsTrigger value="login">Log in</TabsTrigger>
            </TabsList>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <EmailPassword
                  email={email}
                  password={password}
                  setEmail={setEmail}
                  setPassword={setPassword}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-brand w-full text-primary-foreground"
                >
                  {busy && <Loader2 className="mr-1 size-4 animate-spin" />} Create free account
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Includes 5 free credits · no card required
                </p>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <EmailPassword
                  email={email}
                  password={password}
                  setEmail={setEmail}
                  setPassword={setPassword}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-brand w-full text-primary-foreground"
                >
                  {busy && <Loader2 className="mr-1 size-4 animate-spin" />} Log in
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

function EmailPassword({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </>
  );
}
