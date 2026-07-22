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
  const state = ref(initialChromeVisibilityState());

  const readScrollTop = (): number => {
    if (scrollRef) return scrollRef.value?.scrollTop ?? 0;
    return typeof window === "undefined" ? 0 : window.scrollY;
  };

  const handleScroll = () => {
    state.value = nextChromeVisibilityState(state.value, {
      scrollTop: readScrollTop(),
      hasOpenDisclosure: expandedAnchors.value.size > 0,
    });
  };

  onMounted(() => {
    const target: EventTarget | null | undefined = scrollRef
      ? scrollRef.value
      : typeof window === "undefined"
        ? null
        : window;
    if (!target) return;

    target.addEventListener("scroll", handleScroll, { passive: true });
    onUnmounted(() => target.removeEventListener("scroll", handleScroll));
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
