<script setup lang="ts">
// Orchestrator for the three-pane reader. Consumes the shared
// `useReaderState()` — `layouts/reader.vue` is the real provider (its
// unconditional `useAutoHidingChrome()` call reaches in and provides it
// first, being an ancestor of every reader page), so this call and every
// pane's beneath it, however deeply slotted, just inject that same
// instance. See the provide/inject notes on `useReaderState` itself for
// the fresh-instance fallback (and dev warning) if that provider is ever
// missing.
//
// The pane layout itself lives in `MobileSwipePanes` (T9): >=1024px, a
// fixed-viewport CSS grid (`[280px_1fr_1.1fr]`, summary | source |
// commentary) — the toolbar stays put and each pane scrolls independently
// within the viewport (see `layouts/reader.vue` for the outer height
// chain this and `MobileSwipePanes` both rely on). <1024px, the exact
// same three slot instances become a tab-and-swipe experience instead of
// T7's plain stacked column — see that component for why it's the same
// markup (just without the `lg:` grid override) rather than a second,
// duplicate rendering of the three panes.
useReaderState();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="shrink-0">
      <slot name="toolbar" />
    </div>

    <ReaderMobileSwipePanes>
      <template #summary>
        <slot name="summary" />
      </template>
      <template #source>
        <slot name="source" />
      </template>
      <template #commentary>
        <slot name="commentary" />
      </template>
    </ReaderMobileSwipePanes>
  </div>
</template>
