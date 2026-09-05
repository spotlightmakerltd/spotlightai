import { useCallback, useEffect, useState } from "react";

export const THEMES = [
  { id: "light", label: "Cloud" },
  { id: "dark", label: "Midnight" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "spotlightmaker-theme";
const LEGACY = ["theme-mist", "theme-cream"];

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: ThemeId = stored === "dark" ? "dark" : "light";
    applyTheme(next);
    setThemeState(next);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme };
}

function applyTheme(next: ThemeId) {
  const root = document.documentElement;
  [...LEGACY, "dark", "light"].forEach((c) => root.classList.remove(c));
  if (next === "dark") root.classList.add("dark");
}
