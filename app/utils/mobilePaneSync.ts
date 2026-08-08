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

/**
 * Reading order of the swipe slides — also the DOM order `MobileSwipePanes`
 * renders them in (see that component for why RTL must not reverse it).
 * Inner Observation is absent for five parts (see AGENTS.md / the content
 * model skill), so callers pass their own `order` (this full list, or it
 * filtered down to `["source", "commentary"]`) rather than this module
 * assuming all three always exist.
 */
export const PANE_ORDER: readonly PaneId[] = [
  "source",
  "commentary",
  "inner-observation",
];

export type PaneVisibilityRatios = Partial<Record<PaneId, number>>;

/**
 * Picks whichever pane has the highest intersection ratio; `order` breaks
 * ties (e.g. mid-swipe, two slides straddling the midpoint at equal ratios)
 * so the result never flip-flops on equal input. Returns `current`
 * unchanged when every ratio is zero/absent — nothing has been observed as
 * visible yet, so there's nothing to switch to.
 */
export const resolveActivePane = (
  ratios: PaneVisibilityRatios,
  current: PaneId,
  order: readonly PaneId[] = PANE_ORDER,
): PaneId => {
  let best: PaneId | null = null;
  let bestRatio = 0;

  for (const pane of order) {
    const ratio = ratios[pane] ?? 0;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = pane;
    }
  }

  return best ?? current;
};

/**
 * Minimal `scrollend` polyfill used as the single commit debounce for pane
 * switching (see `MobileSwipePanes`): it fires `onSettle` once `settleMs`
 * has passed with no further `ping()`, giving the same
 * gesture-has-ended semantics the native `scrollend` event gives for free.
 *
 * The native `scrollend` event itself cannot be the commit button: it fires
 * the instant the gesture stops, one rendering step ahead of the final
 * `IntersectionObserver` ratio batch, so resolving `activePane` at that
 * moment would reuse the pre-swipe ratios and leave the pill stuck on the
 * stale tab (there is no later scroll event to re-commit). Debouncing the
 * observer callbacks instead means the commit always happens after the
 * settled frame's ratios have been observed.
 *
 * `ping()` on every observer callback; also called from the `scrollend`
 * listener (an extra early ping, harmless — it just restarts the same
 * countdown).
 *
 * `hasSettled` is the pure piece (the threshold check itself); the timer
 * wrapper around it is a thin, conventional debounce — unit-tested with
 * fake timers rather than claimed to be "pure".
 */
export const DEFAULT_SETTLE_MS = 100;

export const hasSettled = (
  elapsedMs: number,
  settleMs: number = DEFAULT_SETTLE_MS,
): boolean => elapsedMs >= settleMs;

export interface ScrollSettleTimer {
  /** Call on every scroll-related event (e.g. each IntersectionObserver callback) — (re)starts the settle countdown. */
  ping: () => void;
  /** Cancels any pending settle without firing `onSettle` — for component cleanup. */
  cancel: () => void;
}

export const createScrollSettleTimer = (
  onSettle: () => void,
  settleMs: number = DEFAULT_SETTLE_MS,
): ScrollSettleTimer => {
  let handle: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (handle === null) return;
    clearTimeout(handle);
    handle = null;
  };

  const ping = () => {
    cancel();
    handle = setTimeout(() => {
      handle = null;
      onSettle();
    }, settleMs);
  };

  return { ping, cancel };
};
