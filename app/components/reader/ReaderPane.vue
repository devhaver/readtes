<script setup lang="ts">
// Generic pane chrome shared by the summary/source/commentary panes: a
// header (layer title + version <select> when there's more than one + the
// "AI translated" badge) above a scroll container that carries the
// version's `dir`/`lang` — the actual pane content (SourcePane etc.) is
// slotted in, and grabs this container via `useReaderPaneContainer()` for
// its own `useHighlightedAnchor`.
import type { ContentVersion } from "~~/shared/types/content";

export interface ReaderVersionOption {
  id: string;
  label: string;
}

const props = defineProps<{
  title: string;
  versionOptions: ReaderVersionOption[];
  modelValue: string | null;
  meta: ContentVersion | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { t } = useI18n();

const selectId = useId();
const isAiTranslated = computed(() => props.meta?.source === "ai");

const onVersionChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  emit("update:modelValue", value);
};

const containerRef = provideReaderPaneContainer();
</script>

<template>
  <section class="flex flex-col lg:h-full lg:min-h-0">
    <header
      class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-(--border) px-4 py-2.5"
    >
      <h2
        class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
      >
        {{ title }}
      </h2>

      <div class="flex items-center gap-2">
        <span
          v-if="isAiTranslated"
          class="rounded-button border border-orange-cta px-1.5 py-0.5 text-xs font-medium text-orange-cta"
        >
          {{ t("reader.aiTranslated") }}
        </span>

        <template v-if="versionOptions.length > 1">
          <label :for="selectId" class="sr-only">{{
            t("reader.versionLabel")
          }}</label>
          <select
            :id="selectId"
            class="rounded-input border border-(--border) bg-(--surface) px-2 py-1 text-xs text-(--text-primary)"
            :value="modelValue ?? ''"
            @change="onVersionChange"
          >
            <option
              v-for="option in versionOptions"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </select>
        </template>
      </div>

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
