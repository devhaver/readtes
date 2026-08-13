/**
 * Panes mode's collapsible top chrome: one boolean the reader owns.
 *
 * The reader toolbar and, on mobile, the site navbar take ~200px off the top
 * of a panes-mode screen — a quarter of a phone viewport before a word of
 * text (issue 113). The first attempt at giving that back hid the chrome
 * automatically on scroll-down. It was the wrong shape twice over: guessing
 * intent from scroll deltas is a state machine with thresholds that will
 * always be wrong for someone, and because the reader hadn't *asked* for the
 * change, the text underneath was not allowed to move — which forced the
 * whole chrome stack out of normal flow onto measured absolute positions and
 * broke in the seams. It was reverted (PR 117).
 *
 * A button has none of those problems. The reader decides, the state is one
 * boolean, and a deliberate tap is allowed to reflow the page — so the
 * chrome stays in normal flow and simply stops rendering, and the pane grows
 * into the space. Nothing is measured, nothing overlays anything, nothing
 * animates behind the reader's back.
 *
 * Persisted, because it is a preference and not a gesture: someone who wants
 * the room should get it on every chapter, not re-earn it on every scroll.
 *
 * Provide/inject singleton, same shape as `useReadingPreferences` — the
 * toolbar owns the control and the layout reads it for the navbar, and they
 * are not in each other's subtree.
 */
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef, InjectionKey } from "vue";

const STORAGE_KEY = "readtes:reader-chrome-collapsed";

export interface CollapsedReaderChrome {
  collapsed: ComputedRef<boolean>;
  toggle: () => void;
}

const COLLAPSED_READER_CHROME_KEY: InjectionKey<CollapsedReaderChrome> = Symbol(
  "collapsed-reader-chrome",
);

const createCollapsedReaderChrome = (): CollapsedReaderChrome => {
  const persisted = useLocalStorage<boolean>(STORAGE_KEY, false);

  // Gates the persisted read until after mount, same reason as
  // `useReadingPreferences`: prerendering has no `localStorage`, so
  // consulting it during the first client render would diverge from the
  // prerendered HTML and fail hydration.
  const hydrated = ref(false);
  onMounted(() => {
    hydrated.value = true;
  });

  const collapsed = computed(() => (hydrated.value ? persisted.value : false));

  const toggle = () => {
    persisted.value = !collapsed.value;
  };

  return { collapsed, toggle };
};

export const useCollapsedReaderChrome = (): CollapsedReaderChrome => {
  const existing = inject(COLLAPSED_READER_CHROME_KEY, null);
  if (existing) return existing;

  const state = createCollapsedReaderChrome();
  provide(COLLAPSED_READER_CHROME_KEY, state);
  return state;
};
