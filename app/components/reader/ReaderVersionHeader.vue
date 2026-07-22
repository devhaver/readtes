<script setup lang="ts">
// A layer's title + version <select> (when there's more than one) + the
// "AI translated" badge — extracted from `ReaderPane` (T7) so `StudyStream`
// (T8) can offer the same source/commentary edition switching inline in
// the stream, without duplicating the select/badge markup. `ReaderPane`
// wraps this with the rest of its pane chrome (border, scroll container).
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  title: string;
  versionOptions: { id: string; label: string }[];
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
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h2
      class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
    >
      {{ title }}
    </h2>

    <div class="flex items-center gap-2">
      <span
        v-if="isAiTranslated"
        class="rounded-button border border-orange-cta px-1.5 py-0.5 text-xs font-medium text-(--warning-text)"
      >
        {{ t("reader.aiTranslated") }}
      </span>

      <template v-if="versionOptions.length > 1">
        <label :for="selectId" class="sr-only">{{
          t("reader.versionLabel")
        }}</label>
        <select
          :id="selectId"
          class="rounded-input border border-(--border) bg-(--surface) px-2 py-1 text-xs text-(--text-primary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
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
  </div>
</template>
