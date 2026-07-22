/**
 * Pure state-transition logic for the reader's cross-pane anchor sync
 * (`useReaderState`). Kept free of Vue reactivity so the activate/clear
 * rules are unit-testable without mounting anything.
 */

/** The three aligned reader panes an anchor can originate from / target. */
export type PaneId = "summary" | "source" | "commentary";

export interface ReaderAnchorState {
  activeAnchor: string | null;
  anchorOrigin: PaneId | null;
  activePane: PaneId;
}

export const initialReaderAnchorState = (): ReaderAnchorState => ({
  activeAnchor: null,
  anchorOrigin: null,
  activePane: "source",
});

/**
 * Activating an anchor from a pane makes that pane the active one (drives
 * e.g. a mobile single-pane view in a later task) and records where the
 * anchor came from, so the other panes' `useHighlightedAnchor` know not to
 * re-highlight their own origin pane.
 */
export const activateAnchorState = (
  _state: ReaderAnchorState,
  id: string,
  origin: PaneId,
): ReaderAnchorState => ({
  activeAnchor: id,
  anchorOrigin: origin,
  activePane: origin,
});

/** Clears the active anchor without touching which pane is "active" (e.g. for mobile mode). */
export const clearAnchorState = (
  state: ReaderAnchorState,
): ReaderAnchorState => ({
  ...state,
  activeAnchor: null,
  anchorOrigin: null,
});
