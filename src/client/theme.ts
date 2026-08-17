import { STORAGE_KEYS } from "@lib/site";

function preferredTheme(): "dark" | "light" {
  let theme: string | null = null;
  try {
    theme = localStorage.getItem(STORAGE_KEYS.theme);
  } catch {
    // Storage can be blocked by browser privacy settings.
  }

  if (theme === "dark" || theme === "light") return theme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.setAttribute("data-theme", theme);
}

applyTheme(preferredTheme());

document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const nextTheme = preferredTheme() === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  try {
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  } catch {
    // Storage can be blocked by browser privacy settings.
  }
});
