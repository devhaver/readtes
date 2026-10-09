/**
 * Pure computation for `ProgressRail`: how far through the chapter's
 * scrollable content the reader has scrolled, as a 0..1 fraction. Kept
 * separate from the DOM measurements (`scrollTop`/`innerHeight`/
 * `scrollHeight`) so the arithmetic — including the "nothing to scroll"
 * edge case — is unit-testable without a real layout.
 */
export const computeReadingProgress = (params: {
  scrollTop: number;
  viewportHeight: number;
  contentHeight: number;
}): number => {
  const scrollable = params.contentHeight - params.viewportHeight;

  // A chapter shorter than the viewport has nothing to scroll, so there is
  // no progress to show: an instantly-full stripe would claim the reader had
  // read something they have not yet reached.
  if (scrollable <= 0) return 0;

  return Math.min(Math.max(params.scrollTop / scrollable, 0), 1);
};
