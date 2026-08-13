/**
 * Mobile panes mode's chrome overlay (issue 113).
 *
 * Study mode's auto-hiding chrome works because the whole document scrolls:
 * the navbar and toolbar are `sticky`, the stream slides under them, and
 * translating them away costs the reader nothing. Panes mode cannot do that.
 * Each pane owns an inner `overflow-y-auto` container (`.tes-pane-body`) with
 * a bounded height, and the chrome sits *above* it in normal flow — so
 * collapsing the chrome moves the scroller's top edge up, and the text the
 * reader is looking at jumps up with it by the full height of whatever was
 * hidden. That, not the animation, is why this needed more than removing the
 * study-mode gate on `useAutoHidingChrome`.
 *
 * So below `lg`, in panes mode, the chrome stops taking space: the navbar,
 * the reader toolbar and each pane's header all become fixed/absolute
 * overlays, the pane body fills the viewport, and its *content* is padded
 * down far enough to start below them. Hiding is then a pure transform —
 * the scroller never moves, so nothing under the reader's eyes ever jumps,
 * and the pane gains the whole 245px it was giving up on a 412x915 screen.
 *
 * The three pieces live in three components that cannot see each other
 * (`layouts/reader.vue`, `ReaderToolbar`, `ReaderPane`), so each registers
 * its own element here and reads back where it belongs. Heights are measured
 * rather than hardcoded because all three wrap: the breadcrumb at a long
 * chapter title, the pane header at a narrow width.
 *
 * Positions come back as `:style` bindings, never `v-bind()` in scoped CSS —
 * that is the documented Nuxt SSR hydration-mismatch trap.
 */
import { useElementSize, useMediaQuery } from "@vueuse/core";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import {
  chromeOffsetOf,
  chromeShift,
  chromeStackHeight,
  emptyChromeHeights,
  type ReaderChromeHeights,
  type ReaderChromePiece,
} from "~/utils/readerChrome";
import { STUDY_MODE_MEDIA_QUERY } from "~/utils/readerMode";

export interface ReaderChromeOverlay {
  /**
   * Measures `el` as this piece and keeps it measured. Every mounted pane
   * registers its own header under the one `"pane-header"` key — they are
   * siblings of identical height (one per swipe slide), so last-writer-wins
   * is not a race, just redundancy.
   */
  register: (piece: ReaderChromePiece, el: Ref<HTMLElement | null>) => void;
  /** Whether the overlay treatment applies at all: narrow viewport, panes mode. */
  active: ComputedRef<boolean>;
  /** Distance from the top of the pane area to this piece's own top edge, px. */
  offsetOf: (piece: ReaderChromePiece) => ComputedRef<number>;
  /** Total chrome height — what `.tes-pane-body` pads its content by, px. */
  height: ComputedRef<number>;
  /**
   * The single transform every piece shares: `0` while visible, and while
   * hidden the full stack height, so each piece clears the top edge exactly
   * as the one above it does. One value for all three is what makes them
   * read as a single surface sliding away rather than three racing.
   */
  shift: ComputedRef<number>;
}

const READER_CHROME_OVERLAY_KEY: InjectionKey<ReaderChromeOverlay> = Symbol(
  "reader-chrome-overlay",
);

const createReaderChromeOverlay = (): ReaderChromeOverlay => {
  const { mode } = useReaderMode();
  const { visible } = useAutoHidingChrome();
  const isNarrowViewport = useMediaQuery(STUDY_MODE_MEDIA_QUERY);

  const heights = reactive<ReaderChromeHeights>(emptyChromeHeights());

  const register = (
    piece: ReaderChromePiece,
    el: Ref<HTMLElement | null>,
  ): void => {
    // Border-box: the toolbar carries `py-3` and a `border-b`, and the
    // default content-box measurement misses all 25px of it — the chrome
    // then translates 25px short and leaves a sliver of itself on screen.
    const { height } = useElementSize(el, undefined, { box: "border-box" });
    watch(height, (value) => {
      // A hidden/unmounted element measures 0. Keeping the last real height
      // means the pane's padding doesn't collapse mid-transition, when the
      // chrome is translated out but still very much occupying its slot.
      if (value > 0) heights[piece] = value;
    });
  };

  const active = computed(
    () => isNarrowViewport.value && mode.value === "panes",
  );

  const height = computed(() => chromeStackHeight(heights));

  const offsetOf = (piece: ReaderChromePiece): ComputedRef<number> =>
    computed(() => chromeOffsetOf(heights, piece));

  const shift = computed(() =>
    chromeShift(heights, !active.value || visible.value),
  );

  return { register, active, offsetOf, height, shift };
};

export const useReaderChromeOverlay = (): ReaderChromeOverlay => {
  const existing = inject(READER_CHROME_OVERLAY_KEY, null);
  if (existing) return existing;

  const overlay = createReaderChromeOverlay();
  provide(READER_CHROME_OVERLAY_KEY, overlay);
  return overlay;
};
