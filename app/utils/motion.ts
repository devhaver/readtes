/**
 * Shared `prefers-reduced-motion` check. Extracted from
 * `useHighlightedAnchor` (T7) so the mobile swipe track and the commentary
 * sheet/reading-preferences modal (T9) — which each need to skip their own
 * "smooth" transitions the same way — read one implementation instead of
 * copy-pasting the `matchMedia` call.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  "matchMedia" in window &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
