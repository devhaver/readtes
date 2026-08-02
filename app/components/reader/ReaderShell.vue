<script setup lang="ts">
// Orchestrator for the panes reader: Source | Inner Light | Inner
// Observation. Consumes the shared `useReaderState()` — `layouts/reader.vue`
// is the real provider (its unconditional `useAutoHidingChrome()` call
// reaches in and provides it first, being an ancestor of every reader
// page), so this call and every pane's beneath it, however deeply slotted,
// just inject that same instance. See the provide/inject notes on
// `useReaderState` itself for the fresh-instance fallback (and dev warning)
// if that provider is ever missing.
//
// `hasInnerObservation`: five parts have no Inner Observation content at
// all (see AGENTS.md / the content model skill) — the reader page only
// passes an `#inner-observation` slot when it does, giving a two-column
// layout instead of three for those parts. Just forwarded to
// `MobileSwipePanes`, which owns the actual two-vs-three-pane rendering
// (both the desktop grid and the mobile swipe track/pill).
//
// The pane layout itself lives in `MobileSwipePanes` (T9): >=1024px, a
// fixed-viewport CSS grid — the toolbar stays put and each pane scrolls
// independently within the viewport (see `layouts/reader.vue` for the
// outer height chain this and `MobileSwipePanes` both rely on). <1024px,
// the exact same slot instances become a tab-and-swipe experience instead
// of a plain stacked column — see that component for why it's the same
// markup (just without the `lg:` grid override) rather than a second,
// duplicate rendering of the panes.
defineProps<{ hasInnerObservation: boolean }>();

useReaderState();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="shrink-0">
      <slot name="toolbar" />
    </div>

    <ReaderMobileSwipePanes :has-inner-observation="hasInnerObservation">
      <template #source>
        <slot name="source" />
      </template>
      <template #commentary>
        <slot name="commentary" />
      </template>
      <template v-if="hasInnerObservation" #inner-observation>
        <slot name="inner-observation" />
      </template>
    </ReaderMobileSwipePanes>
  </div>
</template>
