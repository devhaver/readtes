import { describe, expect, it } from "vitest";

/** Feeds a run of deltas through the machine, the way a scroll actually arrives. */
const scrollBy = (
  state: ChromeVisibilityState,
  deltas: number[],
  hasOpenDisclosure = false,
) => {
  let current = state;
  for (const delta of deltas) {
    current = nextChromeVisibilityState(current, {
      scrollTop: current.lastScrollTop + delta,
      hasOpenDisclosure,
    });
  }
  return current;
};

const reading = (overrides: Partial<ChromeVisibilityState> = {}) => ({
  ...initialChromeVisibilityState(),
  lastScrollTop: 400,
  ...overrides,
});

describe("initialChromeVisibilityState", () => {
  it("starts visible, at the top, with nothing accumulated", () => {
    expect(initialChromeVisibilityState()).toEqual({
      visible: true,
      lastScrollTop: 0,
      travel: 0,
    });
  });
});

describe("nextChromeVisibilityState", () => {
  it("hides on a clear scroll-down past the near-top band", () => {
    const next = nextChromeVisibilityState(reading({ lastScrollTop: 100 }), {
      scrollTop: 200,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(false);
    expect(next.lastScrollTop).toBe(200);
  });

  it("shows again on a clear scroll-up", () => {
    const next = nextChromeVisibilityState(reading({ visible: false }), {
      scrollTop: 300,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(true);
  });

  it("stays visible within the near-top band regardless of direction", () => {
    const next = nextChromeVisibilityState(initialChromeVisibilityState(), {
      scrollTop: 20,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(true);
  });

  it("ignores sub-pixel jitter without toggling visibility", () => {
    const next = nextChromeVisibilityState(reading({ visible: false }), {
      scrollTop: 401,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(false);
    expect(next.lastScrollTop).toBe(401);
  });

  it("never hides while a disclosure is open near the top, even past the plain near-top band", () => {
    const next = nextChromeVisibilityState(reading({ lastScrollTop: 60 }), {
      scrollTop: 200,
      hasOpenDisclosure: true,
    });

    expect(next.visible).toBe(true);
  });

  it("still hides on scroll-down once far enough past the disclosure-open band", () => {
    const next = nextChromeVisibilityState(reading({ lastScrollTop: 250 }), {
      scrollTop: 400,
      hasOpenDisclosure: true,
    });

    expect(next.visible).toBe(false);
  });
});

// Why this machine accumulates travel instead of reading the sign of the
// last delta. Every sequence below is a real one, traced off a 412x915
// device — under the per-delta rule they made the chrome bounce through its
// whole range mid-gesture instead of settling once.
describe("nextChromeVisibilityState — a finger, not a wheel", () => {
  it("does not resurface the chrome on the small corrections in a downward read", () => {
    const afterHiding = scrollBy(reading(), [14, 20, 26, 22]);
    expect(afterHiding.visible).toBe(false);

    const wobbling = scrollBy(afterHiding, [-9, -12, 18, 24, 20, -10, -14, 16]);

    expect(wobbling.visible).toBe(false);
  });

  it("still gets there through the tremor, rather than being held up by it", () => {
    // The exact trace that used to make it bounce. It must end hidden:
    // refusing to ever hide is the opposite failure, not a fix.
    const state = scrollBy(reading(), [26, 22, -9, -12, 18, 24, 20]);

    expect(state.visible).toBe(false);
  });

  it("keeps the chrome up through the corrections in an upward read", () => {
    const atTop = scrollBy(reading(), [-14, -20, -12]);
    expect(atTop.visible).toBe(true);

    const wobbling = scrollBy(atTop, [8, 11, -16, -20, 9, 12, -14]);

    expect(wobbling.visible).toBe(true);
  });

  it("banks nothing in the direction that is already satisfied", () => {
    // Scrolling up while the chrome is already up must not build credit
    // toward hiding it, and vice versa — otherwise a long read in one
    // direction makes the first flick back feel dead.
    const afterLongUp = scrollBy(
      reading({ lastScrollTop: 2000 }),
      [-300, -300, -300],
    );
    expect(afterLongUp.visible).toBe(true);
    expect(afterLongUp.travel).toBe(0);

    const afterLongDown = scrollBy(
      reading({ visible: false }),
      [300, 300, 300],
    );
    expect(afterLongDown.visible).toBe(false);
    expect(afterLongDown.travel).toBe(0);
    // One ordinary upward stroke, not a page of unwinding.
    expect(scrollBy(afterLongDown, [-20, -22]).visible).toBe(true);
  });

  it("still commits on a deliberate stroke in one direction", () => {
    expect(scrollBy(reading(), [24, 24, 24]).visible).toBe(false);

    const hidden = scrollBy(reading({ visible: false }), [24, 24, 24]);
    expect(hidden.visible).toBe(false);
    expect(scrollBy(hidden, [-20, -20]).visible).toBe(true);
  });

  it("needs its own full run to flip back, never riding leftover momentum", () => {
    // The stroke that hides the chrome banks nothing: an immediate small
    // bounce upward must not undo it.
    const hidden = scrollBy(reading(), [30, 30, 30]);
    expect(hidden.visible).toBe(false);
    expect(hidden.travel).toBe(0);

    expect(scrollBy(hidden, [-12, -12]).visible).toBe(false);
  });
});
