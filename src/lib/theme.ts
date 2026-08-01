import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "cs2cm-theme";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

let currentTheme: Theme = initialTheme();
const listeners = new Set<() => void>();

// Apply the persisted/default theme as soon as this module loads (dark by default).
if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("dark", currentTheme === "dark");
}

function setTheme(theme: Theme) {
  currentTheme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(STORAGE_KEY, theme);
  for (const listener of listeners) listener();
}

function toggleTheme() {
  setTheme(currentTheme === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Shared theme hook (dark default): toggles the `dark` class on <html> and
 * persists the choice in localStorage. State lives in a tiny module-level
 * store so every consumer (shell toggle, Toaster, ...) stays in sync.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const theme = useSyncExternalStore(subscribe, () => currentTheme);
  return { theme, toggleTheme };
}
