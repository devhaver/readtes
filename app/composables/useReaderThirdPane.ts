/**
 * The third pane's two pieces of reader-owned state: whether it is open on
 * desktop, and which of its tabs is showing.
 *
 * **Why it collapses at all.** Panes mode used to be a fixed three-column
 * grid (`0.8fr 1.1fr 1.1fr`), so Inner Light — the layer read straight
 * through — permanently shared the viewport with reference material that is
 * consulted occasionally. Closing the third pane hands that width back.
 *
 * **Why it pushes rather than floats.** Same reasoning that settled the
 * mobile chrome in issue 113: a *deliberate tap* is allowed to reflow the
 * page, so the pane can stay in normal flow and simply stop rendering. That
 * is one grid-template change and one boolean, against the measured
 * absolute positioning an overlay would need — and the first attempt at
 * overlaying reader chrome (PR 114) was reverted for exactly that
 * complexity. A floating panel would also be wrong on its own terms here:
 * it would cover the end of the Inner Light column mid-read.
 *
 * **Why `display: none` and not `v-if`.** The third pane is the same DOM
 * node as the mobile swipe track's third slide (see `MobileSwipePanes` for
 * why the two layouts deliberately share one set of slot instances). A
 * `v-if` would unmount it, taking its scroll position — and, crossing the
 * `lg` breakpoint, remounting it on every viewport change. Closing hides it
 * at `lg:` only; below `lg` it is always the third slide, tabs and all.
 *
 * Both values are persisted for the same reason `useCollapsedReaderChrome`
 * persists its boolean: these are preferences, not gestures. Someone who
 * wants the width should get it on every chapter, and someone consulting
 * the Questions tab should still be on it after turning the page.
 *
 * Provide/inject singleton, same shape as `useCollapsedReaderChrome` — the
 * rail owns the toggle and the pane reads the tab, and they are not in each
 * other's subtree.
 */
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef, InjectionKey } from "vue";

export const THIRD_PANE_TABS = [
  "inner-observation",
  "questions",
  "answers",
] as const;

export type ThirdPaneTab = (typeof THIRD_PANE_TABS)[number];

const OPEN_STORAGE_KEY = "readtes:reader-third-pane-open";
const TAB_STORAGE_KEY = "readtes:reader-third-pane-tab";

/**
 * Open by default: the pane is what the reader had before this became
 * collapsible, and a reader who has never touched the control should not
 * have to discover it to find Inner Observation where it has always been.
 */
const DEFAULT_OPEN = true;

export interface ReaderThirdPane {
  open: ComputedRef<boolean>;
  toggle: () => void;
  /**
   * The persisted tab, which is NOT necessarily one this chapter's part
   * offers — five parts have no Inner Observation. Callers resolve it
   * against the tabs actually available via `resolveThirdPaneTab`.
   */
  tab: ComputedRef<ThirdPaneTab>;
  setTab: (tab: ThirdPaneTab) => void;
}

const READER_THIRD_PANE_KEY: InjectionKey<ReaderThirdPane> =
  Symbol("reader-third-pane");

const isThirdPaneTab = (value: unknown): value is ThirdPaneTab =>
  THIRD_PANE_TABS.includes(value as ThirdPaneTab);

/**
 * The tab to actually show: the reader's persisted choice when this part
 * offers it, otherwise the first tab it does offer.
 *
 * Kept a pure function, and separate from the persisted value, so that
 * landing on a part with no Inner Observation shows Questions *without*
 * overwriting a reader's standing preference — they get Inner Observation
 * back on the next part that has one.
 */
export const resolveThirdPaneTab = (
  preferred: ThirdPaneTab,
  available: ThirdPaneTab[],
): ThirdPaneTab | null => {
  if (available.length === 0) return null;
  return available.includes(preferred)
    ? preferred
    : (available[0] as ThirdPaneTab);
};

const createReaderThirdPane = (): ReaderThirdPane => {
  const persistedOpen = useLocalStorage<boolean>(
    OPEN_STORAGE_KEY,
    DEFAULT_OPEN,
  );
  const persistedTab = useLocalStorage<string>(
    TAB_STORAGE_KEY,
    THIRD_PANE_TABS[0],
  );

  // Gates the persisted read until after mount, same reason as
  // `useCollapsedReaderChrome`/`useReadingPreferences`: prerendering has no
  // `localStorage`, so consulting it during the first client render would
  // diverge from the prerendered HTML and fail hydration.
  const hydrated = ref(false);
  onMounted(() => {
    hydrated.value = true;
  });

  const open = computed(() =>
    hydrated.value ? persistedOpen.value : DEFAULT_OPEN,
  );

  const tab = computed<ThirdPaneTab>(() => {
    if (!hydrated.value) return THIRD_PANE_TABS[0];
    // A hand-edited or stale `localStorage` value must not put the pane in
    // a state no tab matches.
    return isThirdPaneTab(persistedTab.value)
      ? persistedTab.value
      : THIRD_PANE_TABS[0];
  });

  const toggle = () => {
    persistedOpen.value = !open.value;
  };

  const setTab = (next: ThirdPaneTab) => {
    persistedTab.value = next;
  };

  return { open, toggle, tab, setTab };
};

export const useReaderThirdPane = (): ReaderThirdPane => {
  const existing = inject(READER_THIRD_PANE_KEY, null);
  if (existing) return existing;

  const state = createReaderThirdPane();
  provide(READER_THIRD_PANE_KEY, state);
  return state;
};
