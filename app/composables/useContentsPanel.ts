/**
 * Reader Contents panel (T90): the toolbar's Contents button opens the
 * whole volumes -> parts tree in one panel (`ReaderContentsPanel`) —
 * `MobilePanePill` hides itself while it's open, the same way it already
 * hides for `CommentarySheet` (`useCommentarySheet`), so the floating pill
 * never overlaps either overlay.
 *
 * Provide/inject singleton, same shape as `useReaderState`/`useReaderMode`/
 * `useCommentarySheet`: the reader page calls this first (ahead of
 * `ReaderShell`/`MobilePanePill`), so `ReaderToolbar`'s later call just
 * injects that same instance.
 *
 * Unlike `useCommentarySheet`, this isn't gated to a narrow viewport — the
 * Contents button is available at every breakpoint (see `ReaderToolbar`),
 * so `open` just flips the flag.
 */
import type { InjectionKey, Ref } from "vue";

export interface ContentsPanelState {
  isOpen: Ref<boolean>;
  open: () => void;
  close: () => void;
}

const CONTENTS_PANEL_KEY: InjectionKey<ContentsPanelState> =
  Symbol("contents-panel");

const createContentsPanel = (): ContentsPanelState => {
  const isOpen = ref(false);

  return {
    isOpen,
    open: () => {
      isOpen.value = true;
    },
    close: () => {
      isOpen.value = false;
    },
  };
};

export const useContentsPanel = (): ContentsPanelState => {
  const existing = inject(CONTENTS_PANEL_KEY, null);
  if (existing) return existing;

  const state = createContentsPanel();
  provide(CONTENTS_PANEL_KEY, state);
  return state;
};
