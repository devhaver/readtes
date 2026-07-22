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
// >=1024px: a fixed-viewport CSS grid (`[280px_1fr_1.1fr]`, summary | source
// | commentary) — the toolbar stays put and each pane scrolls independently
// within the viewport (see `layouts/reader.vue` for the outer `h-dvh`).
// <1024px: the same three panes simply stacked in normal document flow, no
// fixed height — this is what panes mode falls back to on a narrow
// viewport when the reader explicitly toggles out of study mode. Nothing
// here reads `activePane` yet — it's tracked in `useReaderState` for a
// possible future single-pane mobile mode to plug into, not wired into
// this shell today.
useReaderState();
</script>

<template>
  <div class="flex flex-col lg:h-full lg:min-h-0">
    <div class="shrink-0">
      <slot name="toolbar" />
    </div>

    <div
      class="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:grid lg:min-h-0 lg:grid-cols-[280px_1fr_1.1fr] lg:gap-0 lg:overflow-hidden lg:p-0"
    >
      <div
        class="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-e lg:border-(--border)"
      >
        <slot name="summary" />
      </div>
      <div
        class="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-e lg:border-(--border)"
      >
        <slot name="source" />
      </div>
      <div
        id="reader-commentary-pane"
        class="scroll-mt-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col"
      >
        <slot name="commentary" />
      </div>
    </div>
  </div>
</template>
