/**
 * Pure scroll-position -> `activePane` resolution for `MobileSwipePanes`'
 * horizontal scroll-snap track.
 *
 * Deliberately geometry-based (IntersectionObserver ratios), not
 * `scrollLeft`-arithmetic: `scrollLeft`'s sign convention for RTL content
 * disagreed across browsers before Safari 17, so computing "which slide is
 * this index" from a signed scroll offset would need a browser-sniffing
 * branch. Ratios from an `IntersectionObserver` describe actual rendered
 * overlap instead, which is direction-agnostic by construction — the same
 * resolution rule below works unmodified in LTR and RTL, on every browser.
 */
import type { PaneId } from "./readerAnchorState";

/** Reading order of the three swipe slides — also the DOM order `MobileSwipePanes` renders them in (see that component for why RTL must not reverse it). */
export const PANE_ORDER: readonly PaneId[] = [
  "summary",
  "source",
  "commentary",
];

export type PaneVisibilityRatios = Partial<Record<PaneId, number>>;

/**
 * Picks whichever pane has the highest intersection ratio; `PANE_ORDER`
 * breaks ties (e.g. mid-swipe, two slides straddling the midpoint at equal
 * ratios) so the result never flip-flops on equal input. Returns `current`
 * unchanged when every ratio is zero/absent — nothing has been observed as
 * visible yet, so there's nothing to switch to.
 */
export const resolveActivePane = (
  ratios: PaneVisibilityRatios,
  current: PaneId,
): PaneId => {
  let best: PaneId | null = null;
  let bestRatio = 0;

  for (const pane of PANE_ORDER) {
    const ratio = ratios[pane] ?? 0;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = pane;
    }
  }

  return best ?? current;
};
