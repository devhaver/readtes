/**
 * Mobile panes swipe mode's `CommentarySheet` open/closed state (T9):
 * tapping a source paragraph (`SourcePane`'s `useSeifTapActivation`) calls
 * `open(seifN)`; the reader page reads `openSeif` to compute that seif's
 * commentary items (`commentaryItemsForSeif`) and pass them to
 * `CommentarySheet`; `MobilePanePill` reads `isOpen` to hide itself while
 * the sheet is up, so the two floating surfaces never overlap.
 *
 * Provide/inject singleton, same shape as `useReaderState`/`useReaderMode`:
 * the reader page calls this first (ahead of `ReaderShell`/`SourcePane`/
 * `MobilePanePill`), so its later injectors share the one instance.
 *
 * `open` itself owns the "only in mobile panes swipe mode" gate (via the
 * same narrow-viewport media query `MobileSwipePanes`/`useReaderMode` use)
 * rather than making every caller re-check it — on a desktop-width
 * viewport the commentary pane is already visible alongside source, so a
 * sheet would be redundant chrome, and tapping a paragraph there is simply
 * a no-op.
 */
import { useMediaQuery } from "@vueuse/core";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import { STUDY_MODE_MEDIA_QUERY } from "~/utils/readerMode";

export interface CommentarySheetState {
  openSeif: Ref<number | null>;
  isOpen: ComputedRef<boolean>;
  open: (seifN: number) => void;
  close: () => void;
}

const COMMENTARY_SHEET_KEY: InjectionKey<CommentarySheetState> =
  Symbol("commentary-sheet");

const createCommentarySheet = (): CommentarySheetState => {
  const isNarrowViewport = useMediaQuery(STUDY_MODE_MEDIA_QUERY);
  const openSeif = ref<number | null>(null);

  const open = (seifN: number) => {
    if (!isNarrowViewport.value) return;
    openSeif.value = seifN;
  };
  const close = () => {
    openSeif.value = null;
  };

  return {
    openSeif,
    isOpen: computed(() => openSeif.value !== null),
    open,
    close,
  };
};

export const useCommentarySheet = (): CommentarySheetState => {
  const existing = inject(COMMENTARY_SHEET_KEY, null);
  if (existing) return existing;

  const state = createCommentarySheet();
  provide(COMMENTARY_SHEET_KEY, state);
  return state;
};
