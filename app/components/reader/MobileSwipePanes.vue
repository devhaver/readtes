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
// ratio continuously; the commit point is a short settle debounce
// (`createScrollSettleTimer`) fed by every observer callback — NOT the
// native `scrollend` event itself. `scrollend` fires the instant the
// gesture stops, which is one rendering step ahead of the observer's final
// ratio batch; resolving `activePane` from the ratios available at that
// moment resolves the *pre-swipe* layout (stale "source: 1") and there is
// no later scroll event to trigger a re-commit — the pill stays stuck on
// the old tab with the track showing another slide. The settlement timer
// instead fires once ~`settleMs` after the last ratio change, by which
// point the final (settled) frame has been observed, so the commit always
// resolves the post-swipe layout. Tab/pill taps and cross-pane anchor
// jumps both just set `activePane`; the `watch` on it is the only thing
// that turns that into an actual track scroll (`scrollToPane` — a direct
// `track.scrollTo`, see its own comment for why not `scrollIntoView`),
// including on mount, so a fresh load lands snapped to whichever pane is
// already `activePane` (source, by default) instead of sitting on the
// DOM-first slide the browser scrolls to by default with nothing else to
// say otherwise.
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

let observer: IntersectionObserver | null = null;

const commitActivePane = () => {
  const next = resolveActivePane(ratios, activePane.value, paneOrder.value);
  if (next !== activePane.value) setActivePane(next);
};

const onScrollEnd = () => settleTimer.ping();

// The settle timer is the one commit path for every browser (see the module
// doc above for why `scrollend` itself can't be the commit point). `ping()`
// is called on every observer callback — whenever the settled scroll
// position differs from the current one, the timer fires `commitActivePane`
// once the ratios have stabilised, and `settleMs` of continued movement
// keeps pushing the commit out until the gesture truly stops.
const settleTimer = createScrollSettleTimer(commitActivePane);

const onIntersect: IntersectionObserverCallback = (entries) => {
  for (const entry of entries) {
    const pane = (entry.target as HTMLElement).dataset.pane as
      PaneId | undefined;
    if (!pane) continue;
    ratios[pane] = entry.intersectionRatio;
  }
  settleTimer.ping();
};

const attachTrackListeners = () => {
  if (typeof IntersectionObserver === "undefined" || !trackRef.value) return;

  detachTrackListeners();

  observer = new IntersectionObserver(onIntersect, {
    root: trackRef.value,
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
  for (const pane of paneOrder.value) {
    const el = slideRefs[pane].value;
    if (el) observer.observe(el);
  }

  trackRef.value.addEventListener("scrollend", onScrollEnd);
};

const detachTrackListeners = () => {
  observer?.disconnect();
  observer = null;
  trackRef.value?.removeEventListener("scrollend", onScrollEnd);
  settleTimer.cancel();
};

// Not `immediate` + `flush: "post"`: it would run during the module's first
// `setup`, a full render step before `trackRef` is bound, and
// `attachTrackListeners`' `!trackRef.value` guard would silently no-op —
// the observer (and with it, the entire swipe-to-pane sync) would never
// attach. `onMounted` below is the guaranteed-`trackRef`-ready first
// attach point; this watcher handles viewport changeovers after that.
watch(isNarrowViewport, (narrow) => {
  detachTrackListeners();
  if (narrow) attachTrackListeners();
});

onMounted(() => {
  if (isNarrowViewport.value) attachTrackListeners();

  // Snaps instantly (no motion to reduce, there's no prior on-screen
  // state to visibly transition away from) to whichever slide is already
  // `activePane` (source, by default) instead of leaving the browser's own
  // "first slide in DOM order" scroll position silently mismatched against
  // it.
  scrollToPane(activePane.value, true);
});

onUnmounted(detachTrackListeners);

const scrollToPane = (pane: PaneId, instant: boolean) => {
  if (!isNarrowViewport.value) return;
  const track = trackRef.value;
  const slide = slideRefs[pane].value;
  if (!track || !slide) return;

  // Scroll the track directly instead of `slide.scrollIntoView()`: the
  // track is a `contain: layout` scroll-snap container (see the module doc
  // above — both properties are load-bearing on real mobile browsers), and
  // WebKit's `scrollIntoView` resolution through that combination is
  // unreliable — on touch devices a pill tap can end up scrolling nothing
  // at all. Computing the target ourselves is geometry, so it behaves
  // identically in every engine and RTL is handled by the fact that
  // `getBoundingClientRect().left` is already a physical coordinate.
  const target =
    Math.round(
      slide.getBoundingClientRect().left - track.getBoundingClientRect().left,
    ) + track.scrollLeft;
  track.scrollTo({
    left: target,
    behavior: instant || prefersReducedMotion() ? "auto" : "smooth",
  });
};

watch(activePane, (pane) => {
  scrollToPane(pane, false);
});

// The Ari's column is deliberately the narrowest. Equal thirds split the
// space backwards for what these layers actually hold: a seif is a short
// numbered unit (`part-01/chapter-01` is 5 of them) while its commentary is
// long-form prose many times the length — 22 items for those same 5 seifim,
// averaging over 1,000 characters each. Giving the reading pair's longer
// half more room is what shortens its lines toward a comfortable measure;
// the Ari's shorter text reaches its own `max-w-[65ch]` cap well before its
// column runs out either way, so it loses nothing by being narrower.
//
// Still comparable, not a rail: all three carry running prose (unlike the
// old 280px summary rail, which was really just a chapter navigator), so
// Source stays a reading column — Inner Observation likewise gets real
// estate as reference material rather than a cramped side column. A single
// remaining pane just takes the full row and caps its own measure.
const gridColsClass = computed(() =>
  paneOrder.value.length === 3
    ? "lg:grid-cols-[0.8fr_1.1fr_1.1fr]"
    : paneOrder.value.length === 2
      ? "lg:grid-cols-[0.85fr_1.15fr]"
      : "lg:grid-cols-[1fr]",
);
</script>

<template>
  <div
    ref="trackRef"
    class="tes-swipe-track flex min-h-0 w-full flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [contain:layout] lg:grid lg:snap-none lg:gap-0 lg:overflow-hidden lg:[contain:none]"
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
