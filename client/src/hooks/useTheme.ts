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
   * Switches theme with a circular reveal that grows from the toggle (View Transitions API): the new theme
   * spreads over the old one instead of the whole screen flipping at once. Browsers without the API, and
   * users who ask for reduced motion, get the plain instant switch.
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
    const transition = document.startViewTransition(() => {
      // The snapshot of the "new" page is taken right after this callback, so the class must already be on <html>.
      document.documentElement.classList.toggle("dark", next === "dark");
      flushSync(() => setTheme(next));
    });
    void transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  return { theme, setTheme, toggleTheme };
}
