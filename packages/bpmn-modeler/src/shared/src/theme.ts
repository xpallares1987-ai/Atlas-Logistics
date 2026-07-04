import { Theme } from "./types";

export function getSystemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function loadTheme(storageKey: string = "theme"): Theme {
  if (typeof localStorage === "undefined") return "light";
  const saved = localStorage.getItem(storageKey) as Theme;
  return saved || getSystemTheme();
}

export function saveTheme(theme: Theme, storageKey: string = "theme"): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey, theme);
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}
