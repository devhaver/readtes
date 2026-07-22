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
  /**
   * Bumped on every activation-worthy event, including ones that don't
   * change `activeAnchor`/`anchorOrigin` themselves (re-clicking the same
   * anchor, or a version switch that reconciles which element the current
   * anchor now resolves to). `useHighlightedAnchor` watches this alongside
   * the anchor id so it re-fires on those changes too, not just id changes.
   */
  activationSeq: number;
}

export const initialReaderAnchorState = (): ReaderAnchorState => ({
  activeAnchor: null,
  anchorOrigin: null,
  activePane: "source",
  activationSeq: 0,
});

/**
 * Activating an anchor from a pane makes that pane the active one (drives
 * e.g. a mobile single-pane view in a later task) and records where the
 * anchor came from, so the other panes' `useHighlightedAnchor` know not to
 * re-highlight their own origin pane. Always bumps `activationSeq`, even
 * when re-activating the same id/origin, so a repeat click re-fires the
 * highlight.
 */
export const activateAnchorState = (
  state: ReaderAnchorState,
  id: string,
  origin: PaneId,
): ReaderAnchorState => ({
  activeAnchor: id,
  anchorOrigin: origin,
  activePane: origin,
  activationSeq: state.activationSeq + 1,
});

/** Clears the active anchor without touching which pane is "active" (e.g. for mobile mode). */
export const clearAnchorState = (
  state: ReaderAnchorState,
): ReaderAnchorState => ({
  ...state,
  activeAnchor: null,
  anchorOrigin: null,
});

/**
 * Bumps `activationSeq` without otherwise touching the state — for paths
 * that reconcile which element the *current* anchor now targets rather
 * than activating a new one (e.g. the missing-anchor toast's "Switch to
 * Hebrew", which changes the commentary version but not the active anchor
 * id/origin).
 */
export const reactivateAnchorState = (
  state: ReaderAnchorState,
): ReaderAnchorState => ({
  ...state,
  activationSeq: state.activationSeq + 1,
});

/**
 * Toggles one anchor id in study mode's set of inline-expanded commentary
 * disclosures (`useReaderState().expandedAnchors`) — unlike `activeAnchor`
 * (a single value), several anchors can be unfolded inline at once, so
 * this is a set, not a scalar. Always returns a new `Set` instance (never
 * mutates `expanded` in place) so a plain `ref<Set<string>>` re-render
 * correctly off a wholesale reassignment, the same immutable-update
 * approach as the rest of this module.
 */
export const toggleInlineAnchorSet = (
  expanded: ReadonlySet<string>,
  anchorId: string,
): Set<string> => {
  const next = new Set(expanded);
  if (next.has(anchorId)) {
    next.delete(anchorId);
  } else {
    next.add(anchorId);
  }
  return next;
};
