<script setup lang="ts">
// Generic pane chrome shared by the Source/Inner Light/Inner Observation panes: a
// header (`ReaderPaneHeader` — layer title + language <select> when
// there's more than one + the provenance badge) above a scroll
// container that carries the resolved version's `dir`/`lang` — the actual
// pane content (SourcePane etc.) is slotted in, and grabs this container
// via `useReaderPaneContainer()` for its own `useHighlightedAnchor`.
//
// Bounded height + internal scroll are unconditional (not `lg:`-gated):
// since T9, `MobileSwipePanes` gives every pane a bounded height below
// `lg` too (each swipe slide), not just in the `lg:grid` desktop layout —
// this is the one piece of chrome both layouts share, so it just always
// behaves like an independently-scrolling column.
import type { ContentVersion } from "~~/shared/types/content";

defineProps<{
  title: string;
  /** Language codes in display order; the header hides its select when length <= 1. */
  languageOptions: string[];
  modelValue: string | null;
  meta: ContentVersion | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const containerRef = provideReaderPaneContainer();
</script>

<template>
  <section class="tes-pane-shell">
    <header class="tes-pane-header">
      <ReaderPaneHeader
        :title="title"
        :language-options="languageOptions"
        :model-value="modelValue"
        :meta="meta"
        class="flex-1"
        @update:model-value="(value) => emit('update:modelValue', value)"
      />

      <slot name="toast" />
    </header>

    <div
      ref="containerRef"
      class="tes-pane-body"
      :dir="meta?.direction ?? 'ltr'"
      :lang="meta?.language"
    >
      <slot />
    </div>
  </section>
</template>
