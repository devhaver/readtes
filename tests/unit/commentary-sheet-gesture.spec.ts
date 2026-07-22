import { describe, expect, it } from "vitest";
import {
  clampSheetDragOffset,
  DISMISS_DRAG_THRESHOLD_PX,
  shouldDismissSheetDrag,
} from "~/utils/commentarySheetGesture";

describe("clampSheetDragOffset", () => {
  it("passes a downward drag through unchanged", () => {
    expect(clampSheetDragOffset(40)).toBe(40);
  });

  it("clamps an upward drag to 0 — the sheet never overshoots past open", () => {
    expect(clampSheetDragOffset(-30)).toBe(0);
  });

  it("clamps exactly 0 to 0", () => {
    expect(clampSheetDragOffset(0)).toBe(0);
  });
});

describe("shouldDismissSheetDrag", () => {
  it("doesn't dismiss for a short drag below the threshold", () => {
    expect(shouldDismissSheetDrag(DISMISS_DRAG_THRESHOLD_PX - 1)).toBe(false);
  });

  it("dismisses once the drag reaches the threshold", () => {
    expect(shouldDismissSheetDrag(DISMISS_DRAG_THRESHOLD_PX)).toBe(true);
  });

  it("dismisses for a drag well past the threshold", () => {
    expect(shouldDismissSheetDrag(300)).toBe(true);
  });

  it("never dismisses on an upward drag, however large", () => {
    expect(shouldDismissSheetDrag(-500)).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(shouldDismissSheetDrag(50, 40)).toBe(true);
    expect(shouldDismissSheetDrag(30, 40)).toBe(false);
  });
});
