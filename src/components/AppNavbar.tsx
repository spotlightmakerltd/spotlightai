import { Link } from "@tanstack/react-router";
import { Moon, Sun, LogOut, Sparkles, Zap, Mail, Settings, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BuyCreditsDialog } from "@/components/BuyCreditsDialog";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { formatCredits } from "@/lib/pricing";

export function AppNavbar() {
  const { profile, user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const name = profile?.full_name || user?.email?.split("@")[0] || "Creator";
  const initials = (profile?.full_name || user?.email || "S").slice(0, 2).toUpperCase();
  const tier = profile?.subscription_tier ?? "free";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">SpotlightMaker</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden gap-1 px-3 py-1.5 text-sm font-semibold sm:flex">
            <Zap className="size-3.5 text-primary" />
            {formatCredits(profile?.credits ?? 0)} credits
          </Badge>

          <BuyCreditsDialog />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to Cloud theme" : "Switch to Midnight theme"}
            title={theme === "dark" ? "Cloud" : "Midnight"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-9 border border-border">
                  <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-0">
              <div className="flex items-center gap-3 border-b border-border p-4">
                <Avatar className="size-11 border border-border">
                  <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Credits left</p>
                  <p className="mt-1 flex items-center gap-1 text-lg font-bold">
                    <Zap className="size-4 text-primary" />
                    {formatCredits(profile?.credits ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Account status</p>
                  <p className="mt-1 text-lg font-bold capitalize">{tier}</p>
                </div>
              </div>

              <DropdownMenuSeparator className="my-0" />
              <div className="p-1">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <Settings className="mr-2 size-4" /> Studio settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/reset-password">
                    <KeyRound className="mr-2 size-4" /> Change password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 size-4" /> Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
