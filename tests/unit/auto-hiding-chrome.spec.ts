import { describe, expect, it } from "vitest";

describe("initialChromeVisibilityState", () => {
  it("starts visible, at the top", () => {
    expect(initialChromeVisibilityState()).toEqual({
      visible: true,
      lastScrollTop: 0,
    });
  });
});

describe("nextChromeVisibilityState", () => {
  it("hides on a clear scroll-down past the near-top band", () => {
    const state = { visible: true, lastScrollTop: 100 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 200,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(false);
    expect(next.lastScrollTop).toBe(200);
  });

  it("shows again on a clear scroll-up", () => {
    const state = { visible: false, lastScrollTop: 400 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 300,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(true);
  });

  it("stays visible within the near-top band regardless of direction", () => {
    const state = { visible: true, lastScrollTop: 0 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 20,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(true);
  });

  it("ignores sub-threshold jitter without toggling visibility", () => {
    const state = { visible: false, lastScrollTop: 500 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 503,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(false);
    expect(next.lastScrollTop).toBe(503);
  });

  it("never hides while a disclosure is open near the top, even past the plain near-top band", () => {
    const state = { visible: true, lastScrollTop: 60 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 200,
      hasOpenDisclosure: true,
    });

    expect(next.visible).toBe(true);
  });

  it("still hides on scroll-down once far enough past the disclosure-open band", () => {
    const state = { visible: true, lastScrollTop: 250 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 400,
      hasOpenDisclosure: true,
    });

    expect(next.visible).toBe(false);
  });

  it("hides normally on scroll-down once the disclosure closes", () => {
    const state = { visible: true, lastScrollTop: 100 };
    const next = nextChromeVisibilityState(state, {
      scrollTop: 200,
      hasOpenDisclosure: false,
    });

    expect(next.visible).toBe(false);
  });
});
