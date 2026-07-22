/**
 * Pure gesture math for `CommentarySheet`'s swipe-down-to-dismiss drag
 * (plain pointer events, no gesture library — see that component). Kept
 * free of any DOM/event-listener wiring so the dismiss threshold and the
 * "don't let the sheet drag upward past its resting position" clamp are
 * unit-testable without mounting anything.
 */

/** How far down (px) a drag must travel before release counts as "dismiss". */
export const DISMISS_DRAG_THRESHOLD_PX = 80;

/**
 * The sheet only ever drags *down* (toward dismiss) — an upward drag is
 * clamped to 0 rather than letting the sheet overshoot past fully open.
 */
export const clampSheetDragOffset = (deltaY: number): number =>
  Math.max(0, deltaY);

/** Whether a released drag travelled far enough down to dismiss the sheet. */
export const shouldDismissSheetDrag = (
  deltaY: number,
  threshold: number = DISMISS_DRAG_THRESHOLD_PX,
): boolean => clampSheetDragOffset(deltaY) >= threshold;
