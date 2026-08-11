<script setup lang="ts">
// A layer's title + language <select> (when the layer has more than one
// language) + a provenance badge. Extracted from `ReaderPane` so
// `StudyStream` can offer the same language switching inline in the
// stream without duplicating the markup.
//
// Provenance is a LABEL, never a control: the reader picks a language and
// `resolveVersionForLanguage` picks the edition, so the only thing worth
// telling them is when the text they're reading isn't the official Bnei
// Baruch translation. Hebrew is never badged — it is the original.
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  title: string;
  /** Language codes, already in display order (`languagesAvailable`). */
  languageOptions: string[];
  /** The selected language code. */
  modelValue: string | null;
  /** The RESOLVED version — drives the badge, and `dir`/`lang` in `ReaderPane`. */
  meta: ContentVersion | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { t } = useI18n();

const selectId = useId();

const provenance = computed(() => {
  const meta = props.meta;
  if (!meta || meta.language === "he") return null;
  if (meta.source === "ai") {
    return { label: t("reader.aiTranslated"), tone: "warning" as const };
  }
  if (meta.source === "sefaria") {
    return { label: t("reader.sefariaTranslated"), tone: "muted" as const };
  }
  return null;
});

const onLanguageChange = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
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
        v-if="provenance"
        class="rounded-button border px-1.5 py-0.5 text-xs font-medium"
        :class="
          provenance.tone === 'warning'
            ? 'border-orange-cta text-(--warning-text)'
            : 'border-(--border) text-(--text-muted)'
        "
      >
        {{ provenance.label }}
      </span>

      <template v-if="languageOptions.length > 1">
        <label :for="selectId" class="sr-only">{{
          t("reader.languageLabel")
        }}</label>
        <select
          :id="selectId"
          class="rounded-input border border-(--border) bg-(--surface) px-2 py-1 text-xs text-(--text-primary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          :value="modelValue ?? ''"
          @change="onLanguageChange"
        >
          <option
            v-for="language in languageOptions"
            :key="language"
            :value="language"
          >
            {{ nativeLanguageName(language) }}
          </option>
        </select>
      </template>
    </div>
  </div>
</template>
