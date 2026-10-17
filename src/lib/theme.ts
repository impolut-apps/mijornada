export type Theme = "light" | "dark" | "system";
const KEY = "fichaje-theme";

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Llamar una vez al arrancar (antes del render idealmente). */
export function initTheme() {
  applyTheme(getStoredTheme());
}
