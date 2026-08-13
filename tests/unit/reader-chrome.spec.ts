// Mobile panes mode's chrome stacking (issue 113). The measured numbers
// below are the real ones from a 412x915 viewport: navbar 60, toolbar 137,
// pane header 48.
import { describe, expect, it } from "vitest";
import {
  chromeOffsetOf,
  chromeShift,
  chromeStackHeight,
  emptyChromeHeights,
  READER_CHROME_PIECES,
  type ReaderChromeHeights,
} from "~/utils/readerChrome";

const MEASURED: ReaderChromeHeights = {
  navbar: 60,
  toolbar: 137,
  "pane-header": 48,
};

describe("chromeOffsetOf", () => {
  it("puts each piece directly below the one above it", () => {
    expect(chromeOffsetOf(MEASURED, "navbar")).toBe(0);
    expect(chromeOffsetOf(MEASURED, "toolbar")).toBe(60);
    expect(chromeOffsetOf(MEASURED, "pane-header")).toBe(197);
  });

  it("leaves no gap and no overlap anywhere in the stack", () => {
    for (const [index, piece] of READER_CHROME_PIECES.entries()) {
      const next = READER_CHROME_PIECES[index + 1];
      if (!next) continue;
      expect(chromeOffsetOf(MEASURED, next)).toBe(
        chromeOffsetOf(MEASURED, piece) + MEASURED[piece],
      );
    }
  });
});

describe("chromeStackHeight", () => {
  it("is what the pane body pads its content by", () => {
    expect(chromeStackHeight(MEASURED)).toBe(245);
  });

  it("is zero before anything has been measured", () => {
    expect(chromeStackHeight(emptyChromeHeights())).toBe(0);
  });
});

describe("chromeShift", () => {
  it("is nothing while the chrome is visible", () => {
    expect(chromeShift(MEASURED, true)).toBe(0);
  });

  it("clears the top edge for every piece, not just the first", () => {
    // The failure this guards: shifting each piece by its own height hides
    // the navbar and leaves the pane header 197px down the screen, still
    // covering the text it was meant to give back.
    const shift = chromeShift(MEASURED, false);

    for (const piece of READER_CHROME_PIECES) {
      const bottomEdge = chromeOffsetOf(MEASURED, piece) + MEASURED[piece];
      expect(bottomEdge + shift).toBeLessThanOrEqual(0);
    }
  });

  it("moves the lowest piece exactly clear, never further", () => {
    const lowest = READER_CHROME_PIECES[READER_CHROME_PIECES.length - 1]!;
    const bottomEdge = chromeOffsetOf(MEASURED, lowest) + MEASURED[lowest];

    expect(bottomEdge + chromeShift(MEASURED, false)).toBe(0);
  });
});
