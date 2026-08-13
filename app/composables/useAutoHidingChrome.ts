/**
 * Study mode's auto-hiding chrome: the reader toolbar (`ReaderToolbar`) and,
 * on mobile, the site navbar (`layouts/reader.vue`) both read the same
 * `visible` flag and translate away together on scroll-down, returning on
 * scroll-up or near the top — see `~/utils/autoHidingChrome` for the pure
 * transition rules this only measures scroll for.
 *
 * Provide/inject singleton, same shape as `useReaderState`/`useReaderMode`:
 * `layouts/reader.vue` calls this first (with `scrollRef: null`, i.e. track
 * `window` — study mode scrolls the whole document, there's no inner pane
 * container), so it becomes the provider; `ReaderToolbar`'s later call (and
 * any other consumer) just injects that same instance, regardless of what
 * they pass for `scrollRef` — only the creating call's argument is ever
 * used, since the whole point is one shared scroll-visibility state for
 * every piece of chrome on the page.
 *
 * Reads `useReaderState().expandedAnchors` directly (rather than taking it
 * as a parameter) so the public signature stays the single `scrollRef` arg
 * named in the design brief, while still applying the "never hide while a
 * disclosure is open near the top" rule baked into
 * `nextChromeVisibilityState`.
 *
 * Both modes are tracked, from different sources (issue 113). Study mode
 * scrolls the document, so it listens on `window`. Panes mode scrolls inside
 * each pane's own `.tes-pane-body` container, and there are up to three of
 * them mounted at once — so it listens on `document` in the **capture**
 * phase, which is the one way to see a scroll event from an element that
 * does not bubble it, and filters to the pane bodies by class. That avoids
 * a registration protocol between this and every pane, and it also means a
 * pane mounted later (a chapter with an Inner Light layer, say) is picked up
 * with no extra wiring.
 *
 * `lastScrollTop` is tracked per scrolling element, not globally: swiping
 * from a pane scrolled halfway to one at the top would otherwise read as one
 * enormous upward scroll and yank the chrome back. A pane the reader has not
 * scrolled simply contributes no events.
 *
 * The listener attaches on the mode it belongs to and detaches the moment
 * the mode changes, rather than running for the page's lifetime. Handler
 * work is rAF-throttled, same pattern as `ProgressRail`'s scroll/resize
 * handling.
 */
import type { ComputedRef, InjectionKey, Ref } from "vue";
import {
  initialChromeVisibilityState,
  nextChromeVisibilityState,
} from "~/utils/autoHidingChrome";

export interface AutoHidingChrome {
  visible: ComputedRef<boolean>;
}

const AUTO_HIDING_CHROME_KEY: InjectionKey<AutoHidingChrome> =
  Symbol("auto-hiding-chrome");

const createAutoHidingChrome = (
  scrollRef: Ref<HTMLElement | null> | null,
): AutoHidingChrome => {
  const { expandedAnchors } = useReaderState();
  const { mode } = useReaderMode();
  const state = ref(initialChromeVisibilityState());

  const readScrollTop = (): number => {
    if (scrollRef) return scrollRef.value?.scrollTop ?? 0;
    return typeof window === "undefined" ? 0 : window.scrollY;
  };

  /** Per-element previous offset — see the module doc for why not one shared value. */
  const lastScrollTops = new WeakMap<object, number>();
  const WINDOW_KEY = {};

  let rafHandle: number | null = null;
  let pendingSource: object | null = null;
  let pendingScrollTop = 0;

  const commit = () => {
    rafHandle = null;
    const source = pendingSource ?? WINDOW_KEY;
    state.value = nextChromeVisibilityState(
      { ...state.value, lastScrollTop: lastScrollTops.get(source) ?? 0 },
      {
        scrollTop: pendingScrollTop,
        hasOpenDisclosure: expandedAnchors.value.size > 0,
      },
    );
    lastScrollTops.set(source, pendingScrollTop);
  };

  const schedule = (source: object, scrollTop: number) => {
    pendingSource = source;
    pendingScrollTop = scrollTop;
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(commit);
  };

  const handleWindowScroll = () => schedule(WINDOW_KEY, readScrollTop());

  const PANE_BODY_SELECTOR = ".tes-pane-body";

  const handlePaneScroll = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches(PANE_BODY_SELECTOR)) return;
    schedule(target, target.scrollTop);
  };

  const cancelPendingMeasure = () => {
    if (rafHandle === null) return;
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  };

  onMounted(() => {
    const windowTarget: EventTarget | null = scrollRef
      ? scrollRef.value
      : typeof window === "undefined"
        ? null
        : window;

    watch(
      mode,
      (current, _previous, onCleanup) => {
        if (current === "study") {
          if (!windowTarget) return;
          windowTarget.addEventListener("scroll", handleWindowScroll, {
            passive: true,
          });
          onCleanup(() => {
            windowTarget.removeEventListener("scroll", handleWindowScroll);
            cancelPendingMeasure();
          });
          return;
        }

        if (current !== "panes" || typeof document === "undefined") return;

        // Capture phase: `scroll` does not bubble, so a listener on
        // `document` only ever sees an inner container's scroll this way.
        document.addEventListener("scroll", handlePaneScroll, {
          capture: true,
          passive: true,
        });
        onCleanup(() => {
          document.removeEventListener("scroll", handlePaneScroll, {
            capture: true,
          });
          cancelPendingMeasure();
          // Leaving panes mode with the chrome mid-hide would strand it
          // off-screen in a mode that has no way to bring it back.
          state.value = initialChromeVisibilityState();
        });
      },
      { immediate: true },
    );
  });

  return { visible: computed(() => state.value.visible) };
};

export const useAutoHidingChrome = (
  scrollRef: Ref<HTMLElement | null> | null = null,
): AutoHidingChrome => {
  const existing = inject(AUTO_HIDING_CHROME_KEY, null);
  if (existing) return existing;

  const state = createAutoHidingChrome(scrollRef);
  provide(AUTO_HIDING_CHROME_KEY, state);
  return state;
};
