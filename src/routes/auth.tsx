import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
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
          "Create a free SpotlightMaker account and start building high-converting video ads in minutes.",
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4.01-3.09z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.18 15.23 0 12 0A12 12 0 0 0 1.28 6.63l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          required
          className="pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
  }

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
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
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
    toast.success("Account created — welcome to SpotlightMaker");
    void navigate({ to: "/dashboard", replace: true });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast.success("Reset link sent — check your inbox.");
    setForgot(false);
  }

  const googleButton = (
    <>
      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => void handleGoogle()}>
        <GoogleIcon /> Continue with Google
      </Button>
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );

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
          {forgot ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h1 className="font-display text-xl font-bold">Reset your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll email you a secure link to set a new password.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="bg-brand w-full text-primary-foreground">
                {busy && <Loader2 className="mr-1 size-4 animate-spin" />} Send reset link
              </Button>
              <button
                type="button"
                onClick={() => {
                  setForgot(false);
                  setError(null);
                }}
                className="w-full text-center text-xs text-muted-foreground underline"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <Tabs defaultValue="signup">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="login">Log in</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 pt-4">
                  {googleButton}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <PasswordField
                    id="signup-password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
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
                    Free to sign up · no card required
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  {googleButton}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <PasswordField
                    id="login-password"
                    label="Password"
                    value={password}
                    onChange={setPassword}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForgot(true);
                      setError(null);
                    }}
                    className="text-xs font-medium text-primary underline"
                  >
                    Forgot password?
                  </button>
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
          )}
        </div>
      </div>
    </main>
  );
}
