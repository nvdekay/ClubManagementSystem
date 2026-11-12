import { useEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

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

/**
 * Applies the saved theme before React renders, so pages without a theme toggle (login, workspace picker)
 * follow the user's choice and no page flashes light before switching to dark. Called once in main.tsx.
 */
export function applyInitialTheme() {
  document.documentElement.classList.toggle("dark", initialTheme() === "dark");
}

/** Light/dark theme shared by every layout: toggles `.dark` on <html> and remembers the choice. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* not persisted when storage is blocked */ }
  }, [theme]);

  /**
   * Switches theme with a circular wipe anchored on the toggle (View Transitions API): going dark, the new
   * theme grows out of the toggle; going light, the dark page shrinks back into it, so the two directions
   * mirror each other. Browsers without the API, and users who ask for reduced motion, get the plain switch.
   */
  function toggleTheme(event?: MouseEvent<HTMLElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      setTheme(next);
      return;
    }
    // Keyboard activation reports (0, 0): start from the middle of the control instead.
    const rect = event?.currentTarget.getBoundingClientRect();
    const x = event && event.detail > 0 ? event.clientX : rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = event && event.detail > 0 ? event.clientY : rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;
    // The wipe itself is a CSS animation on the snapshot pseudo-elements (index.css), so its first frame is
    // already clipped; driving it from JS after `ready` left one frame of the full new page (a dark flash).
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);
    root.dataset.themeWipe = next === "light" ? "collapse" : "expand";
    const transition = document.startViewTransition(() => {
      // The snapshot of the "new" page is taken right after this callback, so the class must already be on <html>.
      root.classList.toggle("dark", next === "dark");
      flushSync(() => setTheme(next));
    });
    void transition.finished.finally(() => {
      delete root.dataset.themeWipe;
      for (const name of ["--theme-x", "--theme-y", "--theme-r"]) root.style.removeProperty(name);
    });
  }

  return { theme, setTheme, toggleTheme };
}
