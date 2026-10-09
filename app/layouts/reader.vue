<script setup lang="ts">
import { useElementSize } from "@vueuse/core";

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
// Root height depends on the mode. Panes mode's whole "each pane scrolls
// independently" design (desktop grid *and* the mobile swipe track) needs a
// genuinely bounded height, so it is `h-dvh` and every ancestor down to
// `ReaderPane`'s `overflow-y-auto` resolves to a *definite* height.
// Study and original modes scroll the whole document instead, so the root
// is `min-h-dvh`: a bounded root would make the sticky chrome stick only
// within the first viewport, then sit thousands of px above the reader and
// never come back. The navbar and the toolbar (the page's) are ONE sticky
// unit — see `.tes-reader-toolbar-sticky` in `main.css`.
const { t } = useI18n();

const { mode } = useReaderMode();
const { visible: chromeVisible } = useAutoHidingChrome();
const { scale } = useReadingPreferences();
// The reader's chrome (navbar, toolbar, breadcrumb) sits ahead of the text,
// and in panes mode the text is a scroll container, not a landmark. Move
// focus to the first visible passage so the next Tab starts inside the text.
const skipToText = () => {
  const passage = Array.from(
    document.querySelectorAll<HTMLElement>(
      "#main-content .reader-anchor-target",
    ),
  ).find((element) => element.offsetParent !== null);
  if (!passage) {
    document.getElementById("main-content")?.focus();
    return;
  }
  passage.tabIndex = -1;
  passage.focus();
};

// Teleported overlays render under <body>, outside the wrapper below, so the
// scale has to be on <body> too for their reading text to follow it.
useHead({ bodyAttrs: { "data-reading-scale": scale } });
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

// The navbar's height is the toolbar's sticky offset and half of the
// document's `scroll-padding-top` (the toolbar publishes the other half),
// so anchor jumps and focus scrolling land below the chrome in study mode.
const navbarRef = ref<HTMLElement | null>(null);
const { height: navbarHeight } = useElementSize(navbarRef, undefined, {
  box: "border-box",
});
watchEffect(() => {
  if (!import.meta.client) return;
  const root = document.documentElement;
  root.style.setProperty("--reader-navbar-h", `${navbarHeight.value}px`);
  if (isStudyMode.value) {
    root.style.setProperty(
      "scroll-padding-top",
      "calc(var(--reader-navbar-h, 0px) + var(--reader-toolbar-h, 0px) + 0.5rem)",
    );
  } else {
    root.style.removeProperty("scroll-padding-top");
  }
});
onBeforeUnmount(() => {
  const root = document.documentElement;
  root.style.removeProperty("--reader-navbar-h");
  root.style.removeProperty("scroll-padding-top");
});
</script>

<template>
  <div
    :data-reading-scale="scale"
    class="flex flex-col bg-(--surface) font-body text-(--text-primary)"
    :class="mode === 'panes' ? 'h-dvh' : 'min-h-dvh'"
  >
    <a href="#main-content" class="tes-skip-link">
      {{ t("common.skipToContent") }}
    </a>
    <a href="#main-content" class="tes-skip-link" @click.prevent="skipToText">
      {{ t("common.skipToText") }}
    </a>
    <div
      ref="navbarRef"
      :class="[
        isChromeCollapsed && 'hidden',
        // Phone landscape (~390px tall): the site navbar is the first thing
        // to go, so the toolbar and the text keep the height.
        '[@media(max-height:32rem)]:hidden',
        isStudyMode &&
          'sticky top-0 z-40 transition-transform duration-200 ease-out motion-reduce:transition-none',
        isStudyMode && !chromeVisible && '-translate-y-full',
      ]"
    >
      <AppNavBar full-width />
    </div>
    <main id="main-content" tabindex="-1" class="min-h-0 flex-1">
      <slot />
    </main>
  </div>
</template>
