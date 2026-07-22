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

/**
 * Minimal `scrollend` polyfill for the IntersectionObserver-only fallback
 * path (Safari <17.4 — see `MobileSwipePanes`): without this, every ratio
 * change from `IntersectionObserver` would commit `activePane` immediately,
 * which fights a live touch-drag (each in-between ratio update "wins"
 * briefly) and can mis-commit on a multi-slide programmatic jump (the
 * observer sees the skipped middle slide's ratio pass through on the way to
 * the real target). `ping()` on every observer callback; `onSettle` fires
 * once `settleMs` has passed with no further `ping()` — the same
 * gesture-has-ended semantics the native `scrollend` event gives for free.
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
