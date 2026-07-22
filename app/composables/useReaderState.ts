/**
 * The reader's cross-pane anchor sync state, shared by `ReaderShell` and
 * every pane beneath it via provide/inject — no event bus, no cross-pane
 * DOM reach. Each pane's own `useHighlightedAnchor(paneId, containerRef)`
 * watches `activeAnchor`/`anchorOrigin` and only reacts when it isn't the
 * origin pane.
 *
 * `activePane` exists (even though this task is desktop-first, all three
 * panes always visible) so a later single-pane mobile mode (T8) can plug
 * into the same state without a desktop-only assumption baked in here.
 */
import type { InjectionKey, Ref } from "vue";
import {
  activateAnchorState,
  clearAnchorState,
  initialReaderAnchorState,
  type PaneId,
} from "~/utils/readerAnchorState";

export interface ReaderState {
  activeAnchor: Ref<string | null>;
  anchorOrigin: Ref<PaneId | null>;
  activePane: Ref<PaneId>;
  activateAnchor: (id: string, origin: PaneId) => void;
  clearAnchor: () => void;
}

const READER_STATE_KEY: InjectionKey<ReaderState> = Symbol("reader-state");

const createReaderState = (): ReaderState => {
  const initial = initialReaderAnchorState();
  const activeAnchor = ref<string | null>(initial.activeAnchor);
  const anchorOrigin = ref<PaneId | null>(initial.anchorOrigin);
  const activePane = ref<PaneId>(initial.activePane);

  const activateAnchor = (id: string, origin: PaneId) => {
    const next = activateAnchorState(
      {
        activeAnchor: activeAnchor.value,
        anchorOrigin: anchorOrigin.value,
        activePane: activePane.value,
      },
      id,
      origin,
    );
    activeAnchor.value = next.activeAnchor;
    anchorOrigin.value = next.anchorOrigin;
    activePane.value = next.activePane;
  };

  const clearAnchor = () => {
    const next = clearAnchorState({
      activeAnchor: activeAnchor.value,
      anchorOrigin: anchorOrigin.value,
      activePane: activePane.value,
    });
    activeAnchor.value = next.activeAnchor;
    anchorOrigin.value = next.anchorOrigin;
  };

  return {
    activeAnchor,
    anchorOrigin,
    activePane,
    activateAnchor,
    clearAnchor,
  };
};

/**
 * Called by `ReaderShell` (provides a fresh state) and by every pane beneath
 * it (injects the same instance) — whichever component calls this first in
 * a given reader page's tree creates and provides the state.
 */
export const useReaderState = (): ReaderState => {
  const existing = inject(READER_STATE_KEY, null);
  if (existing) return existing;

  const state = createReaderState();
  provide(READER_STATE_KEY, state);
  return state;
};
