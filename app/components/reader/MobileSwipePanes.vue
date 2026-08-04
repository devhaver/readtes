<script setup lang="ts">
// Panes mode's mobile experience (T9): below `lg` the panes (from
// `ReaderShell`'s source/commentary/inner-observation slots) become a CSS
// scroll-snap horizontal track with a floating pane-switcher pill
// (`MobilePanePill`, fixed near the bottom of the viewport — not a top tab
// bar) instead of a plain stacked column. At/above `lg` this renders the
// exact same grid `ReaderShell` always has — deliberately the SAME markup
// (just without the `lg:` breakpoint prefixes that make it a track below
// it), so the slot instances are never duplicated: each pane mounts once,
// and is never unmounted switching between the grid and the track, or
// between slides within the track. Per-pane scroll position surviving a
// pill-tap/swipe switch falls out of that for free — nothing here ever
// re-mounts the panes, so each one's own `ReaderPane` scroll container
// just keeps whatever scroll offset it already had.
//
// `panes`: the panes that actually exist for this chapter, from
// `resolveReaderPanes` — Inner Light is absent for ~99.5% of chapters and
// five parts have no Inner Observation at all (see that util's docblock),
// so this renders one, two, or three panes/slides accordingly, both in the
// desktop grid (`gridColsClass`) and in the mobile track/pill (`paneOrder`).
// A layer that doesn't exist gets no slide at all — never an empty column.
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
// `activePane` update. Where `scrollend` isn't available, a small settle
// timer (`createScrollSettleTimer`) polyfills the same "gesture has ended"
// semantics instead of committing on every single ratio change — see that
// util's doc comment for why an un-debounced fallback would fight a live
// touch-drag and mis-commit on a multi-slide programmatic jump. Tab/pill
// taps and cross-pane anchor jumps both just set `activePane`; the `watch`
// below is the only thing that turns that into an actual `scrollIntoView`
// (via `inline: "start"`, a logical value, so it's RTL-correct without a
// `dir` check) — including on mount, so a fresh load lands snapped to
// whichever pane is already `activePane` (source, by default) instead of
// sitting on the DOM-first slide the browser scrolls to by default with
// nothing else to say otherwise.
//
// `[contain:layout]` on the track + `min-w-0` on every slide (mobile-only —
// both reset back to none/auto at `lg:`) are load-bearing, not decoration:
// on a REAL mobile viewport (`isMobile`/touch emulation — a plain desktop-
// sized headless viewport does not reproduce this), the slides laid out
// side by side (source|commentary|inner-observation, up to 3x the device
// width) are real boxes at real coordinates even though the track's own
// `overflow-x-auto` clips/scrolls them — and mobile browsers' "widen the
// layout viewport to fit content that doesn't fit" heuristic doesn't
// respect that clipping the way desktop overflow scrolling does. Left
// unfixed, the *whole page* got zoomed out to a ~937px-wide layout
// viewport to "fit" the unclipped 3-slide width, which is also why every
// `position: fixed` element (the pane-switcher pill) measured enormous and
// off in a corner: `inset-x-0` resolves against whatever the (wrongly
// widened) containing block is. `contain: layout` tells the layout engine
// "nothing inside this box affects sizing outside it," which is exactly
// the promise `overflow-x: auto` alone doesn't make on mobile. `min-w-0`
// closes the companion flexbox trap — a row-direction flex item's
// default `min-width: auto` floors its width at its own content's
// min-content size, which can also exceed the device width regardless of
// `w-full`, unless explicitly zeroed.
import { useMediaQuery } from "@vueuse/core";
import type { Ref } from "vue";
import {
  createScrollSettleTimer,
  resolveActivePane,
  type PaneVisibilityRatios,
} from "~/utils/mobilePaneSync";
import { prefersReducedMotion } from "~/utils/motion";
import type { PaneId } from "~/utils/readerAnchorState";
import { STUDY_MODE_MEDIA_QUERY } from "~/utils/readerMode";

const props = defineProps<{ panes: PaneId[] }>();

const { activePane, setActivePane } = useReaderState();

// Same breakpoint `useReaderMode` uses for its own viewport default — this
// track only needs to behave like a swipeable set of slides below it;
// at/above it, it's inert (the grid takes over via CSS, and this composable
// attaches no listeners at all).
const isNarrowViewport = useMediaQuery(STUDY_MODE_MEDIA_QUERY);

const trackRef = ref<HTMLElement | null>(null);
const sourceRef = ref<HTMLElement | null>(null);
const commentaryRef = ref<HTMLElement | null>(null);
const innerObservationRef = ref<HTMLElement | null>(null);

const slideRefs: Record<PaneId, Ref<HTMLElement | null>> = {
  source: sourceRef,
  commentary: commentaryRef,
  "inner-observation": innerObservationRef,
};

// The pane order actually present for this chapter — see the module doc
// above for why Inner Light and Inner Observation can each be absent.
const paneOrder = computed<PaneId[]>(() => props.panes);

// `activePane` persists across chapter navigations (shared reader state) —
// arriving on a chapter whose pane set no longer contains it (e.g. Inner
// Light was active, the next chapter has none) would leave the pill with no
// selected tab and the track scrolled to a slide that no longer exists.
// Snap back to Source, which every chapter has.
watch(
  paneOrder,
  (panes) => {
    if (!panes.includes(activePane.value)) setActivePane("source");
  },
  { immediate: true },
);

const ratios: PaneVisibilityRatios = reactive({});
const usesScrollEnd = typeof window !== "undefined" && "onscrollend" in window;

let observer: IntersectionObserver | null = null;

const commitActivePane = () => {
  const next = resolveActivePane(ratios, activePane.value, paneOrder.value);
  if (next !== activePane.value) setActivePane(next);
};

const onScrollEnd = () => commitActivePane();

// Only actually used on the no-`scrollend` fallback path (see `onIntersect`)
// — harmless to always create, since `ping()` is simply never called when
// `usesScrollEnd` is true.
const settleTimer = createScrollSettleTimer(commitActivePane);

const onIntersect: IntersectionObserverCallback = (entries) => {
  for (const entry of entries) {
    const pane = (entry.target as HTMLElement).dataset.pane as
      PaneId | undefined;
    if (!pane) continue;
    ratios[pane] = entry.intersectionRatio;
  }
  // Safari <17.4 fallback: no native `scrollend` to key off, so every
  // observer callback (re)starts the settle timer instead of committing
  // immediately — see the module doc above and `createScrollSettleTimer`.
  if (!usesScrollEnd) settleTimer.ping();
};

const attachTrackListeners = () => {
  if (typeof IntersectionObserver === "undefined" || !trackRef.value) return;

  observer = new IntersectionObserver(onIntersect, {
    root: trackRef.value,
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
  for (const pane of paneOrder.value) {
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
  settleTimer.cancel();
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

const scrollToPane = (pane: PaneId, instant: boolean) => {
  if (!isNarrowViewport.value) return;
  slideRefs[pane].value?.scrollIntoView({
    behavior: instant || prefersReducedMotion() ? "auto" : "smooth",
    inline: "start",
    block: "nearest",
  });
};

// `onMounted`, not an `immediate` watch: template refs are only guaranteed
// populated once the component has actually mounted, and (unlike
// `useFocusTrap`'s own `immediate`+`flush: "post"` watch, which reacts to a
// *prop* flipping true after this component already exists) this needs to
// run for the very state this component is born into — this *is* the
// mount. Snaps instantly (no motion to reduce, there's no prior on-screen
// state to visibly transition away from) to whichever slide is already
// `activePane` (source, by default) instead of leaving the browser's own
// "first slide in DOM order" scroll position silently mismatched against
// it.
onMounted(() => {
  scrollToPane(activePane.value, true);
});

watch(activePane, (pane) => {
  scrollToPane(pane, false);
});

// Three comparable-width columns when all three panes exist — all three
// carry substantial running prose (unlike the old 280px summary rail,
// which was really just a chapter navigator), so equal thirds keeps
// Source and Inner Light paired at the same width (the aligned reading
// pair, the reader's core feature) while giving Inner Observation the same
// real estate as reference material, not a cramped side column. Equal
// halves for two panes, for the same reason; a single remaining pane just
// takes the full row (its content caps its own reading measure — see
// `SourcePane`'s `max-w-[65ch]` column).
const gridColsClass = computed(() =>
  paneOrder.value.length === 3
    ? "lg:grid-cols-[1fr_1fr_1fr]"
    : paneOrder.value.length === 2
      ? "lg:grid-cols-[1fr_1fr]"
      : "lg:grid-cols-[1fr]",
);
</script>

<template>
  <div
    ref="trackRef"
    class="flex min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [contain:layout] lg:grid lg:snap-none lg:gap-0 lg:overflow-hidden lg:[contain:none]"
    :class="gridColsClass"
  >
    <div
      id="reader-source-pane"
      ref="sourceRef"
      data-pane="source"
      class="h-full min-h-0 w-full min-w-0 shrink-0 snap-start snap-always"
      :class="paneOrder.length > 1 && 'lg:border-e lg:border-(--border)'"
    >
      <slot name="source" />
    </div>
    <div
      v-if="paneOrder.includes('commentary')"
      id="reader-commentary-pane"
      ref="commentaryRef"
      data-pane="commentary"
      class="h-full min-h-0 w-full min-w-0 shrink-0 snap-start snap-always scroll-mt-4"
      :class="
        paneOrder.includes('inner-observation') &&
        'lg:border-e lg:border-(--border)'
      "
    >
      <slot name="commentary" />
    </div>
    <div
      v-if="paneOrder.includes('inner-observation')"
      id="reader-inner-observation-pane"
      ref="innerObservationRef"
      data-pane="inner-observation"
      class="h-full min-h-0 w-full min-w-0 shrink-0 snap-start snap-always scroll-mt-4"
    >
      <slot name="inner-observation" />
    </div>
  </div>

  <ReaderMobilePanePill :panes="paneOrder" />
</template>
