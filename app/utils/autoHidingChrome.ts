/**
 * Pure state machine for the study mode's auto-hiding chrome
 * (`useAutoHidingChrome`): the reader toolbar (and, on mobile, the site
 * navbar) translates away on scroll-down and returns on scroll-up, so the
 * reading stream gets the full viewport without chrome ever being
 * unreachable. Kept free of the DOM so the transition rules are
 * unit-testable without mounting anything — the composable only measures
 * `scrollTop` and forwards it here.
 */
export interface ChromeVisibilityState {
  visible: boolean;
  lastScrollTop: number;
}

export const initialChromeVisibilityState = (): ChromeVisibilityState => ({
  visible: true,
  lastScrollTop: 0,
});

/** Sub-pixel/momentum-scroll jitter smaller than this never toggles visibility. */
const HIDE_THRESHOLD_PX = 8;

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

  if (scrollTop <= NEAR_TOP_PX) {
    return { visible: true, lastScrollTop: scrollTop };
  }

  if (hasOpenDisclosure && scrollTop <= NEAR_TOP_WITH_DISCLOSURE_PX) {
    return { visible: true, lastScrollTop: scrollTop };
  }

  const delta = scrollTop - state.lastScrollTop;
  if (Math.abs(delta) < HIDE_THRESHOLD_PX) {
    return { ...state, lastScrollTop: scrollTop };
  }

  // Scrolling down (positive delta) hides; scrolling up shows.
  return { visible: delta < 0, lastScrollTop: scrollTop };
};
