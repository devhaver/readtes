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
const { t } = useI18n();

const { mode } = useReaderMode();
const { visible: chromeVisible } = useAutoHidingChrome();
const { scale } = useReadingPreferences();
const isStudyMode = computed(() => mode.value === "study");
</script>

<template>
  <div
    :data-reading-scale="scale"
    class="flex min-h-screen flex-col bg-(--surface) font-body text-(--text-primary)"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-navy-primary focus:px-4 focus:py-2 focus:text-surface-white focus:outline focus:outline-2 focus:outline-teal"
    >
      {{ t("common.skipToContent") }}
    </a>
    <div
      :class="[
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
