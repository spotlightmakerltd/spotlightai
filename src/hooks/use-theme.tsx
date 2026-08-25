import { useCallback, useEffect, useState } from "react";

export const THEMES = [
  { id: "light", label: "Cloud" },
  { id: "theme-mist", label: "Mist" },
  { id: "theme-cream", label: "Cream" },
  { id: "dark", label: "Midnight" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "spotlightmaker-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored) applyTheme(stored);
    setThemeState(stored ?? "light");
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}

function applyTheme(next: ThemeId) {
  const root = document.documentElement;
  THEMES.forEach((t) => root.classList.remove(t.id));
  if (next !== "light") root.classList.add(next);
}
