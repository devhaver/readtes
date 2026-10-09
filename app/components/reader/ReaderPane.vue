<script setup lang="ts">
// Generic pane chrome shared by the Source/Inner Light/Inner Observation panes: a
// header (`ReaderPaneHeader` — layer title + language <select> when
// there's more than one + the provenance badge) above a scroll
// container — the actual pane content (SourcePane etc.) is slotted in, and
// grabs this container via `useReaderPaneContainer()` for its own
// `useHighlightedAnchor`. The resolved version's `dir`/`lang` are NOT put on
// the container: it also holds UI chrome (notes, status lines), which keeps
// the UI locale. Content lists bind them from `useReaderPaneContentAttrs()`.
//
// Bounded height + internal scroll are unconditional (not `lg:`-gated):
// since T9, `MobileSwipePanes` gives every pane a bounded height below
// `lg` too (each swipe slide), not just in the `lg:grid` desktop layout —
// this is the one piece of chrome both layouts share, so it just always
// behaves like an independently-scrolling column.
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  title: string;
  /** Language codes in display order; the header hides its select when length <= 1. */
  languageOptions: string[];
  modelValue: string | null;
  meta: ContentVersion | null;
  hideProvenance?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const containerRef = provideReaderPaneContainer();
provideReaderPaneContentAttrs(() => props.meta);
</script>

<template>
  <section class="tes-pane-shell">
    <header class="tes-pane-header">
      <ReaderPaneHeader
        :title="title"
        :language-options="languageOptions"
        :model-value="modelValue"
        :meta="meta"
        :hide-provenance="hideProvenance"
        class="flex-1"
        @update:model-value="(value) => emit('update:modelValue', value)"
      >
        <template v-if="$slots.title" #title>
          <slot name="title" />
        </template>
      </ReaderPaneHeader>

      <slot name="toast" />
    </header>

    <div ref="containerRef" class="tes-pane-body" :data-version="meta?.id">
      <slot />
    </div>
  </section>
</template>
