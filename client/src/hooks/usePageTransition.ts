import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

/**
 * Softens client-side navigation: when the path changes, the page area scrolls back to the top and
 * fades/slides in. It animates the existing element instead of remounting it, so page state
 * (filters, drafts) survives, and it does nothing on the first render or under reduced motion.
 */
export function usePageTransition<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // #root owns scrolling (see index.css), so a new page would otherwise open mid-way down.
    document.getElementById("root")?.scrollTo({ top: 0 });
    const node = ref.current;
    if (!node || typeof node.animate !== "function"
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.animate(
      [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
      { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }, [pathname]);

  return ref;
}
