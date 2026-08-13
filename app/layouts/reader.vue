<script setup lang="ts">
// This layout is only ever used by the `/read/[part]/[chapter]` page, so
// it's safe (and the only place it makes sense) to establish the reader's
// shared mode/auto-hide-chrome/reading-preferences state here:
// `useReaderMode()`, `useAutoHidingChrome()`, and `useReadingPreferences()`
// are all provide/inject singletons (see those composables) — whichever
// component calls each first in the tree becomes its provider, and since
// this layout renders *around* the page (an ancestor in the component
// tree, not a sibling), calling them here first means `ReaderToolbar`'s
// (and `ReadingPreferencesModal`'s) later calls just inject the same
// instances. That lets the navbar (only this layout's concern) and the
// toolbar (the page's) hide/show as one unit on mobile scroll, without the
// layout needing to know anything about the page beneath it beyond that.
//
// `data-reading-scale` on this root is the reading-preferences font-size
// scale's one wiring point (see `main.css`'s `[data-reading-scale]`
// rules): only elements that actually consume `var(--reading-scale)` in
// their own `font-size` (source segments, commentary items, etc.) react to
// it, so setting the attribute this high up never touches chrome (the
// navbar/toolbar don't reference the variable at all) even though it
// technically cascades through them too.
//
// `h-dvh` (not `min-h-screen`) is deliberate and load-bearing: panes
// mode's whole "each pane scrolls independently" design (desktop grid
// *and* T9's mobile swipe track alike) needs this root to have a
// genuinely bounded height, not just a floor — `ReaderPane`'s own
// `overflow-y-auto` container only ever gets something to actually clip/
// scroll against if every ancestor between it and here resolves to a
// *definite* height (`h-full`/`flex-1 min-h-0`, all the way down through
// `ReaderShell` and `MobileSwipePanes`' track). `min-h-screen` is only a
// minimum, so content taller than the viewport would just grow this root
// (and the whole page) taller instead of clipping/scrolling inside the
// track — which is exactly the "blank first paint" bug this fixes: the
// track/slides never got a real height to snap within. Study mode is
// unaffected: nothing in *its* chain (`ReaderToolbar` + `StudyStream`,
// no `ReaderShell`) sets `overflow` to anything but the default
// `visible`, so its content still overflows this box and the page still
// scrolls normally, exactly as before.
const { t } = useI18n();

const { mode } = useReaderMode();
const { visible: chromeVisible } = useAutoHidingChrome();
const { scale } = useReadingPreferences();
const isStudyMode = computed(() => mode.value === "study");

// The collapse control lives in the reader toolbar, but the site navbar is
// this layout's — and on a phone it is 60px of the ~200px the reader is
// asking for back (issue 113). It goes with the rest, below `lg` only:
// there is no shortage of height on a desktop, and losing the site's own
// nav there would be a worse trade than the space is worth.
const { collapsed } = useCollapsedReaderChrome();
const isChromeCollapsed = computed(
  () => mode.value === "panes" && collapsed.value,
);
</script>

<template>
  <div
    :data-reading-scale="scale"
    class="flex h-dvh flex-col bg-(--surface) font-body text-(--text-primary)"
  >
    <a href="#main-content" class="tes-skip-link">
      {{ t("common.skipToContent") }}
    </a>
    <div
      :class="[
        isChromeCollapsed && 'hidden lg:block',
        isStudyMode &&
          'sticky top-0 z-40 transition-transform duration-200 ease-out motion-reduce:transition-none',
        isStudyMode && !chromeVisible && '-translate-y-full',
      ]"
    >
      <AppNavBar />
    </div>
    <main id="main-content" class="min-h-0 flex-1">
      <slot />
    </main>
  </div>
</template>
