/**
 * The reader's cross-pane anchor sync state. The actual provider is
 * `layouts/reader.vue`: its unconditional `useAutoHidingChrome()` call
 * reaches in and calls `useReaderState()` first, and since that layout
 * renders as an ancestor of every reader page, that's the instance
 * `ReaderShell` and every pane beneath it (however deeply slotted) end up
 * injecting via provide/inject — no event bus, no cross-pane DOM reach.
 * Each pane's own `useHighlightedAnchor(paneId, containerRef)` watches
 * `activeAnchor`/`anchorOrigin` and only reacts when it isn't the origin
 * pane.
 *
 * `activePane` is wired by T9's mobile panes swipe mode (`MobileSwipePanes`/
 * `MobilePanePill`): tab/pill taps and the swipe track's own scroll-sync
 * call `setActivePane` directly, and `useHighlightedAnchor` also calls it
 * whenever it actually finds and highlights the current anchor in its own
 * pane — see `setActivePaneState`'s doc comment for why that, not
 * `activateAnchorState`'s `activePane: origin`, is what makes a
 * source-origin activation land on the *commentary* slide. Desktop panes
 * and study mode never read it.
 */
import type { InjectionKey, Ref } from "vue";
import {
  activateAnchorState,
  clearAnchorState,
  initialReaderAnchorState,
  reactivateAnchorState,
  setActivePaneState,
  toggleInlineAnchorSet,
  type PaneId,
} from "~/utils/readerAnchorState";

export interface ReaderState {
  activeAnchor: Ref<string | null>;
  anchorOrigin: Ref<PaneId | null>;
  activePane: Ref<PaneId>;
  /**
   * Bumped by `activateAnchor` and `reactivateAnchor`. Watch this alongside
   * `activeAnchor` (see `useHighlightedAnchor`) to re-fire on events that
   * don't change the anchor id/origin themselves — a repeat click, or a
   * version switch that changes which element the current anchor resolves
   * to.
   */
  activationSeq: Ref<number>;
  activateAnchor: (id: string, origin: PaneId) => void;
  /** Re-fires the highlight/scroll for the *current* anchor without changing it. */
  reactivateAnchor: () => void;
  clearAnchor: () => void;
  /**
   * Sets `activePane` directly (mobile swipe track sync + the "found it"
   * corrective call from `useHighlightedAnchor` — see
   * `setActivePaneState`). Desktop panes and study mode never call this.
   */
  setActivePane: (pane: PaneId) => void;
  /**
   * Study mode's set of anchor ids whose commentary is currently unfolded
   * inline (`InlineCommentary`/`StudyStream`) — panes mode never reads
   * this. Several anchors can be open at once, so this is a set, not a
   * scalar like `activeAnchor`.
   */
  expandedAnchors: Ref<ReadonlySet<string>>;
  /** Opens `anchorId`'s inline disclosure if closed, closes it if open. */
  toggleInline: (anchorId: string) => void;
}

const READER_STATE_KEY: InjectionKey<ReaderState> = Symbol("reader-state");

const createReaderState = (): ReaderState => {
  const initial = initialReaderAnchorState();
  const activeAnchor = ref<string | null>(initial.activeAnchor);
  const anchorOrigin = ref<PaneId | null>(initial.anchorOrigin);
  const activePane = ref<PaneId>(initial.activePane);
  const activationSeq = ref<number>(initial.activationSeq);
  const expandedAnchors = ref<ReadonlySet<string>>(new Set());

  const activateAnchor = (id: string, origin: PaneId) => {
    const next = activateAnchorState(
      {
        activeAnchor: activeAnchor.value,
        anchorOrigin: anchorOrigin.value,
        activePane: activePane.value,
        activationSeq: activationSeq.value,
      },
      id,
      origin,
    );
    activeAnchor.value = next.activeAnchor;
    anchorOrigin.value = next.anchorOrigin;
    activePane.value = next.activePane;
    activationSeq.value = next.activationSeq;
  };

  const reactivateAnchor = () => {
    const next = reactivateAnchorState({
      activeAnchor: activeAnchor.value,
      anchorOrigin: anchorOrigin.value,
      activePane: activePane.value,
      activationSeq: activationSeq.value,
    });
    activationSeq.value = next.activationSeq;
  };

  const clearAnchor = () => {
    const next = clearAnchorState({
      activeAnchor: activeAnchor.value,
      anchorOrigin: anchorOrigin.value,
      activePane: activePane.value,
      activationSeq: activationSeq.value,
    });
    activeAnchor.value = next.activeAnchor;
    anchorOrigin.value = next.anchorOrigin;
  };

  const toggleInline = (anchorId: string) => {
    expandedAnchors.value = toggleInlineAnchorSet(
      expandedAnchors.value,
      anchorId,
    );
  };

  const setActivePane = (pane: PaneId) => {
    const next = setActivePaneState(
      {
        activeAnchor: activeAnchor.value,
        anchorOrigin: anchorOrigin.value,
        activePane: activePane.value,
        activationSeq: activationSeq.value,
      },
      pane,
    );
    activePane.value = next.activePane;
  };

  return {
    activeAnchor,
    anchorOrigin,
    activePane,
    activationSeq,
    activateAnchor,
    reactivateAnchor,
    clearAnchor,
    setActivePane,
    expandedAnchors,
    toggleInline,
  };
};

/**
 * The real provider is `layouts/reader.vue` (see the module doc above);
 * `ReaderShell` and every pane beneath it just inject that same instance.
 * The fresh-instance fallback below only exists for a caller mounted
 * without that layout as an ancestor (an isolated test, a future misuse)
 * — since that means the expected provider never ran, it warns in dev so
 * the mistake doesn't go silent.
 */
export const useReaderState = (): ReaderState => {
  const existing = inject(READER_STATE_KEY, null);
  if (existing) return existing;

  if (import.meta.dev) {
    console.warn(
      "[useReaderState] no provided reader state found in the component " +
        "tree — creating a fresh instance instead. Expected " +
        "`layouts/reader.vue` (via its useAutoHidingChrome() call) to have " +
        "provided one higher up.",
    );
  }

  const state = createReaderState();
  provide(READER_STATE_KEY, state);
  return state;
};
