/**
 * Pure state machine for the reader's auto-hiding chrome
 * (`useAutoHidingChrome`): the reader toolbar and, on mobile, the site
 * navbar translate away on scroll-down and return on scroll-up, so the
 * reading stream gets the full viewport without chrome ever being
 * unreachable. Kept free of the DOM so the transition rules are
 * unit-testable without mounting anything — the composable only measures
 * `scrollTop` and forwards it here.
 *
 * ## Why this decides on accumulated travel, not on the last delta
 *
 * The first version flipped on the sign of a single scroll delta, past an
 * 8px threshold. A finger does not move that way. Real reading scroll is
 * mostly-down with constant small corrections — traced on a 412x915 device,
 * a normal downward read produced deltas like
 * `+14 +20 +26 +22 -9 -12 +18 +24 +20 -10 -14 …`, and every one of those
 * corrections read as "the reader wants the chrome back", so the chrome
 * spent the whole gesture retargeting a 200ms transition mid-flight instead
 * of ever settling — its top edge bouncing
 * `-168 -29 -187 -115 -159 -232 -69 -212 …` when it had a tall stack to
 * throw around. No amount of tuning a per-event threshold fixes it: a 12px
 * correction is a real 12px correction.
 *
 * So the state machine accumulates **net travel toward the next flip** and
 * only commits when the reader has clearly meant it. A correction costs the
 * gesture a little of its progress rather than flipping anything, and travel
 * in the direction that is already satisfied banks nothing at all — which
 * is what stops a wobble from moving the chrome, without letting a
 * mostly-downward read be held up forever by its own tremor.
 *
 * The thresholds are asymmetric on purpose: reaching for chrome that is
 * gone is a deliberate act and should feel prompt, while hiding it should
 * take enough sustained reading motion that it never happens by accident.
 */
export interface ChromeVisibilityState {
  visible: boolean;
  lastScrollTop: number;
  /**
   * Signed distance banked toward the next flip. Positive is downward.
   * Clamped so it never accumulates in the direction that cannot commit,
   * and reset to zero whenever visibility does commit — so the next flip
   * needs its own full stroke rather than riding on leftover momentum.
   */
  travel: number;
}

export const initialChromeVisibilityState = (): ChromeVisibilityState => ({
  visible: true,
  lastScrollTop: 0,
  travel: 0,
});

/** Sub-pixel/rounding noise smaller than this is not movement at all. */
const NOISE_PX = 2;

/**
 * Sustained downward travel before the chrome hides. Roughly two lines of
 * body text at the default reading scale — long enough that no correction
 * or momentum bounce reaches it, short enough that a deliberate scroll
 * clears the chrome on the first stroke.
 */
const HIDE_AFTER_PX = 72;

/**
 * Sustained upward travel before it returns. Shorter than the hide
 * threshold: a reader scrolling back up is usually reaching for the chrome
 * (the language switcher, the mode toggle, prev/next), and making them work
 * for it is worse than showing it a little eagerly.
 */
const SHOW_AFTER_PX = 40;

/** Always visible within this many px of the very top of the stream. */
const NEAR_TOP_PX = 48;

/**
 * A wider "always visible" band used only while a disclosure is open —
 * hiding the chrome out from under an inline commentary card the reader
 * just opened near the top of the stream would read as content jumping
 * under them; the plain `NEAR_TOP_PX` band alone isn't generous enough to
 * cover that case.
 */
const NEAR_TOP_WITH_DISCLOSURE_PX = 240;

export const nextChromeVisibilityState = (
  state: ChromeVisibilityState,
  params: { scrollTop: number; hasOpenDisclosure: boolean },
): ChromeVisibilityState => {
  const { scrollTop, hasOpenDisclosure } = params;

  if (
    scrollTop <= NEAR_TOP_PX ||
    (hasOpenDisclosure && scrollTop <= NEAR_TOP_WITH_DISCLOSURE_PX)
  ) {
    return { visible: true, lastScrollTop: scrollTop, travel: 0 };
  }

  const delta = scrollTop - state.lastScrollTop;
  if (Math.abs(delta) < NOISE_PX) {
    return { ...state, lastScrollTop: scrollTop };
  }

  const travel = state.travel + delta;

  // Only intent that could still change something is banked. While the
  // chrome is up, downward travel accumulates and upward travel is floored
  // at zero; while it is down, the reverse. Corrections therefore cost a
  // gesture a little progress instead of discarding it — a mostly-downward
  // read still reaches the threshold through its tremor — and a run in the
  // direction that is already satisfied banks nothing, so the *next* flip
  // always needs its own full stroke rather than unwinding a page of
  // momentum first.
  if (state.visible) {
    if (travel >= HIDE_AFTER_PX) {
      return { visible: false, lastScrollTop: scrollTop, travel: 0 };
    }
    return { ...state, lastScrollTop: scrollTop, travel: Math.max(travel, 0) };
  }

  if (travel <= -SHOW_AFTER_PX) {
    return { visible: true, lastScrollTop: scrollTop, travel: 0 };
  }
  return { ...state, lastScrollTop: scrollTop, travel: Math.min(travel, 0) };
};
