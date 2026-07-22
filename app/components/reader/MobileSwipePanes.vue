<script setup lang="ts">
// Panes mode's mobile experience (T9): below `lg` the three panes (from
// `ReaderShell`'s summary/source/commentary slots) become a CSS
// scroll-snap horizontal track with a floating pane-switcher pill
// (`MobilePanePill`, fixed near the bottom of the viewport — not a top tab
// bar) instead of T7's plain stacked column. At/above `lg` this renders the
// exact same grid `ReaderShell` always has — deliberately the SAME markup
// (just without the `lg:` breakpoint prefixes that make it a track below
// it), so the three slot instances are never duplicated: each pane mounts
// once, and is never unmounted switching between the grid and the track,
// or between slides within the track. Per-pane scroll position surviving a
// pill-tap/swipe switch falls out of that for free — nothing here ever
// re-mounts the panes, so each one's own `ReaderPane` scroll container
// just keeps whatever scroll offset it already had.
//
// RTL: the track is a plain `flex` row (no explicit `flex-row`, and no
// reordering of the three slides) — `dir="rtl"` on `<html>` (the `he`
// locale) makes the browser render that same DOM order right-to-left on
// its own, and `scroll-snap-type`/native scroll follow the same logical
// direction. Fighting that with a `flex-row-reverse` or manual reordering
// would be redundant at best and wrong at worst.
//
// Sync is geometry-based, not `scrollLeft`-arithmetic — see
// `~/utils/mobilePaneSync`'s doc comment for why. An `IntersectionObserver`
// (scoped to the track as its own `root`) tracks each slide's visibility
// ratio continuously; `scrollend` (supported by every evergreen browser
// except Safari <17.4) is the commit point that turns those ratios into an
// `activePane` update. Where `scrollend` isn't available, the observer's
// own callback commits directly instead — a little less debounced, but
// correct in both directions regardless. Tab taps and cross-pane anchor
// jumps both just set `activePane`; the `watch` below is the only thing
// that turns that into an actual `scrollIntoView` (via `inline: "start"`,
// a logical value, so it's RTL-correct without a `dir` check).
import { useMediaQuery } from "@vueuse/core";
import type { Ref } from "vue";
import {
  PANE_ORDER,
  resolveActivePane,
  type PaneVisibilityRatios,
} from "~/utils/mobilePaneSync";
import { prefersReducedMotion } from "~/utils/motion";
import type { PaneId } from "~/utils/readerAnchorState";
import { STUDY_MODE_MEDIA_QUERY } from "~/utils/readerMode";

const { activePane, setActivePane } = useReaderState();

// Same breakpoint `useReaderMode` uses for its own viewport default — this
// track only needs to behave like a swipeable set of slides below it;
// at/above it, it's inert (the grid takes over via CSS, and this composable
// attaches no listeners at all).
const isNarrowViewport = useMediaQuery(STUDY_MODE_MEDIA_QUERY);

const trackRef = ref<HTMLElement | null>(null);
const summaryRef = ref<HTMLElement | null>(null);
const sourceRef = ref<HTMLElement | null>(null);
const commentaryRef = ref<HTMLElement | null>(null);

const slideRefs: Record<PaneId, Ref<HTMLElement | null>> = {
  summary: summaryRef,
  source: sourceRef,
  commentary: commentaryRef,
};

const ratios: PaneVisibilityRatios = reactive({});
const usesScrollEnd = typeof window !== "undefined" && "onscrollend" in window;

let observer: IntersectionObserver | null = null;

const commitActivePane = () => {
  const next = resolveActivePane(ratios, activePane.value);
  if (next !== activePane.value) setActivePane(next);
};

const onScrollEnd = () => commitActivePane();

const onIntersect: IntersectionObserverCallback = (entries) => {
  for (const entry of entries) {
    const pane = (entry.target as HTMLElement).dataset.pane as
      PaneId | undefined;
    if (!pane) continue;
    ratios[pane] = entry.intersectionRatio;
  }
  // Safari <17.4 fallback: no `scrollend` to debounce on, so the observer
  // itself is the commit point (see the module doc above).
  if (!usesScrollEnd) commitActivePane();
};

const attachTrackListeners = () => {
  if (typeof IntersectionObserver === "undefined" || !trackRef.value) return;

  observer = new IntersectionObserver(onIntersect, {
    root: trackRef.value,
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
  for (const pane of PANE_ORDER) {
    const el = slideRefs[pane].value;
    if (el) observer.observe(el);
  }

  if (usesScrollEnd) {
    trackRef.value.addEventListener("scrollend", onScrollEnd);
  }
};

const detachTrackListeners = () => {
  observer?.disconnect();
  observer = null;
  trackRef.value?.removeEventListener("scrollend", onScrollEnd);
};

watch(
  isNarrowViewport,
  (narrow) => {
    detachTrackListeners();
    if (narrow) attachTrackListeners();
  },
  { immediate: true, flush: "post" },
);

onUnmounted(detachTrackListeners);

watch(activePane, (pane) => {
  if (!isNarrowViewport.value) return;
  slideRefs[pane].value?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    inline: "start",
    block: "nearest",
  });
});
</script>

<template>
  <div
    ref="trackRef"
    class="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain lg:grid lg:snap-none lg:grid-cols-[280px_1fr_1.1fr] lg:gap-0 lg:overflow-hidden"
  >
    <div
      id="reader-summary-pane"
      ref="summaryRef"
      data-pane="summary"
      class="h-full min-h-0 w-full shrink-0 snap-start snap-always lg:border-e lg:border-(--border)"
    >
      <slot name="summary" />
    </div>
    <div
      id="reader-source-pane"
      ref="sourceRef"
      data-pane="source"
      class="h-full min-h-0 w-full shrink-0 snap-start snap-always lg:border-e lg:border-(--border)"
    >
      <slot name="source" />
    </div>
    <div
      id="reader-commentary-pane"
      ref="commentaryRef"
      data-pane="commentary"
      class="h-full min-h-0 w-full shrink-0 snap-start snap-always scroll-mt-4"
    >
      <slot name="commentary" />
    </div>
  </div>

  <ReaderMobilePanePill />
</template>
