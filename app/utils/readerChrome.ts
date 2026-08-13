/**
 * Pure stacking arithmetic for mobile panes mode's chrome overlay
 * (`useReaderChromeOverlay`, issue 113). Kept out of the composable for the
 * same reason `~/utils/autoHidingChrome` is: the rules are worth testing
 * without mounting a reader.
 *
 * The model is one vertical stack, top to bottom, laid over a pane body that
 * never moves. A piece's `top` is everything above it; the stack's height is
 * what the pane body pads its content by; and hiding translates every piece
 * by that same total, which is the smallest shift that clears the top edge
 * for the *lowest* piece — and therefore clears it for all of them.
 */

/** The chrome pieces, in the order they stack. */
export const READER_CHROME_PIECES = [
  "navbar",
  "toolbar",
  "pane-header",
] as const;
export type ReaderChromePiece = (typeof READER_CHROME_PIECES)[number];

export type ReaderChromeHeights = Record<ReaderChromePiece, number>;

export const emptyChromeHeights = (): ReaderChromeHeights => ({
  navbar: 0,
  toolbar: 0,
  "pane-header": 0,
});

/** Distance from the top of the pane area to `piece`'s own top edge. */
export const chromeOffsetOf = (
  heights: ReaderChromeHeights,
  piece: ReaderChromePiece,
): number =>
  READER_CHROME_PIECES.slice(0, READER_CHROME_PIECES.indexOf(piece)).reduce(
    (sum, earlier) => sum + heights[earlier],
    0,
  );

/** Total stack height — the pane body's content padding. */
export const chromeStackHeight = (heights: ReaderChromeHeights): number =>
  READER_CHROME_PIECES.reduce((sum, piece) => sum + heights[piece], 0);

/**
 * The shared transform: `0` while visible, `-stackHeight` while hidden.
 *
 * One value for every piece, deliberately. Translating each piece by only
 * its own height would clear the navbar but leave the pane header — the
 * lowest and most visible piece — sitting most of the way down where it
 * started, which is the bug this function exists to make impossible to
 * write by accident.
 */
export const chromeShift = (
  heights: ReaderChromeHeights,
  visible: boolean,
): number => (visible ? 0 : -chromeStackHeight(heights));
