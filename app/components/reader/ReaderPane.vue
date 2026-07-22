<script setup lang="ts">
// Generic pane chrome shared by the summary/source/commentary panes: a
// header (`ReaderVersionHeader` — layer title + version <select> when
// there's more than one + the "AI translated" badge) above a scroll
// container that carries the version's `dir`/`lang` — the actual pane
// content (SourcePane etc.) is slotted in, and grabs this container via
// `useReaderPaneContainer()` for its own `useHighlightedAnchor`.
import type { ContentVersion } from "~~/shared/types/content";

export interface ReaderVersionOption {
  id: string;
  label: string;
}

defineProps<{
  title: string;
  versionOptions: ReaderVersionOption[];
  modelValue: string | null;
  meta: ContentVersion | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const containerRef = provideReaderPaneContainer();
</script>

<template>
  <section class="flex flex-col lg:h-full lg:min-h-0">
    <header
      class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-(--border) px-4 py-2.5"
    >
      <ReaderVersionHeader
        :title="title"
        :version-options="versionOptions"
        :model-value="modelValue"
        :meta="meta"
        class="flex-1"
        @update:model-value="(value) => emit('update:modelValue', value)"
      />

      <slot name="toast" />
    </header>

    <div
      ref="containerRef"
      class="flex-1 px-4 py-4 lg:min-h-0 lg:overflow-y-auto"
      :dir="meta?.direction ?? 'ltr'"
      :lang="meta?.language"
    >
      <slot />
    </div>
  </section>
</template>
