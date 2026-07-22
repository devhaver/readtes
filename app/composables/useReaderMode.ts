/**
 * The reader's study/panes mode toggle — same provide/inject singleton
 * shape as `useReaderState`: whichever component calls this first in a
 * given reader page's tree (the `[chapter]` page itself, ahead of
 * `ReaderShell`/`ReaderToolbar`/`StudyStream`) creates and provides the
 * state; every later call in that tree injects the same instance.
 *
 * Hydration note (mirrors `useReaderVersions`): viewport is unknowable
 * during prerendering, so consulting it (or the persisted override) for
 * the very first client render would make that render diverge from the
 * prerendered HTML it's hydrating — a mismatch. `resolveReaderMode`
 * (`~/utils/readerMode`) always resolves to the fixed `FIXED_PREMOUNT_MODE`
 * until `hydrated` flips true in `onMounted`; only then do the real
 * viewport (`prefersStudyViewport`, tracked via a `matchMedia` listener)
 * and the persisted `override` get consulted.
 */
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef, InjectionKey } from "vue";
import {
  resolveReaderMode,
  STUDY_MODE_MEDIA_QUERY,
  type ReaderMode,
} from "~/utils/readerMode";

const STORAGE_KEY = "readtes:reader-mode";

export interface ReaderModeState {
  mode: ComputedRef<ReaderMode>;
  /** Sets (and persists) an explicit user override — wins over the viewport default from then on. */
  setMode: (mode: ReaderMode) => void;
}

const READER_MODE_KEY: InjectionKey<ReaderModeState> = Symbol("reader-mode");

const createReaderModeState = (): ReaderModeState => {
  const override = useLocalStorage<ReaderMode | null>(STORAGE_KEY, null);
  const prefersStudyViewport = ref(false);

  // Gates viewport/override reads until after mount — see the module doc.
  const hydrated = ref(false);

  onMounted(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      hydrated.value = true;
      return;
    }

    const mql = window.matchMedia(STUDY_MODE_MEDIA_QUERY);
    prefersStudyViewport.value = mql.matches;

    const onChange = (event: MediaQueryListEvent) => {
      prefersStudyViewport.value = event.matches;
    };
    mql.addEventListener("change", onChange);
    onUnmounted(() => mql.removeEventListener("change", onChange));

    // Set only after `prefersStudyViewport` already reflects the real
    // viewport, so `mode`'s first hydrated-reactive pass resolves correctly
    // in one step rather than flashing the fixed default an extra tick.
    hydrated.value = true;
  });

  const mode = computed(() =>
    resolveReaderMode({
      hydrated: hydrated.value,
      override: override.value,
      prefersStudyViewport: prefersStudyViewport.value,
    }),
  );

  const setMode = (next: ReaderMode) => {
    override.value = next;
  };

  return { mode, setMode };
};

export const useReaderMode = (): ReaderModeState => {
  const existing = inject(READER_MODE_KEY, null);
  if (existing) return existing;

  const state = createReaderModeState();
  provide(READER_MODE_KEY, state);
  return state;
};
