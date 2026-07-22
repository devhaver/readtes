<script setup lang="ts">
// Orchestrator for the three-pane reader. Provides the shared
// `useReaderState()` (every pane beneath it, however deeply slotted,
// injects the same instance — see the provide/inject notes there).
//
// >=1024px: a fixed-viewport CSS grid (`[280px_1fr_1.1fr]`, summary | source
// | commentary) — the toolbar stays put and each pane scrolls independently
// within the viewport (see `layouts/reader.vue` for the outer `h-dvh`).
// <1024px: the same three panes simply stacked in normal document flow, no
// fixed height — this is what panes mode falls back to on a narrow
// viewport when the reader explicitly toggles out of study mode (T8's
// default there); the state above already doesn't assume a desktop-only
// shape (`activePane` exists precisely so that mode can plug into it).
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
