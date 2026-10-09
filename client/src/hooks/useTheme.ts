import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be blocked (private mode); fall back to the system preference.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark theme shared by every layout: toggles `.dark` on <html> and remembers the choice. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* not persisted when storage is blocked */ }
  }, [theme]);
  return { theme, setTheme, toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")) };
}
