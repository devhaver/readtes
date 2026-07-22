import { describe, expect, it } from "vitest";

describe("computeReadingProgress", () => {
  it("is 0 at the very top of a scrollable chapter", () => {
    expect(
      computeReadingProgress({
        scrollTop: 0,
        viewportHeight: 800,
        contentHeight: 3000,
      }),
    ).toBe(0);
  });

  it("is 1 at the very bottom of a scrollable chapter", () => {
    expect(
      computeReadingProgress({
        scrollTop: 2200,
        viewportHeight: 800,
        contentHeight: 3000,
      }),
    ).toBe(1);
  });

  it("is proportional partway through", () => {
    expect(
      computeReadingProgress({
        scrollTop: 1100,
        viewportHeight: 800,
        contentHeight: 3000,
      }),
    ).toBe(0.5);
  });

  it("is 1 (fully read) when the chapter is shorter than the viewport", () => {
    expect(
      computeReadingProgress({
        scrollTop: 0,
        viewportHeight: 800,
        contentHeight: 400,
      }),
    ).toBe(1);
  });

  it("clamps to 1 even if scrollTop overshoots (e.g. elastic/bounce scrolling)", () => {
    expect(
      computeReadingProgress({
        scrollTop: 5000,
        viewportHeight: 800,
        contentHeight: 3000,
      }),
    ).toBe(1);
  });

  it("clamps to 0 for a negative scrollTop (elastic overscroll at the top)", () => {
    expect(
      computeReadingProgress({
        scrollTop: -50,
        viewportHeight: 800,
        contentHeight: 3000,
      }),
    ).toBe(0);
  });
});
