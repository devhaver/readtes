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
//
// This component owns the "only one language, no switcher" case itself
// (the `<select>` is what disappears, not the header) so that callers
// render it on layer EXISTENCE alone. The badge and the switcher have
// different lifetimes on purpose: "AI translated" is the project's one
// mandatory label, and a single-language layer must still carry it.
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  title: string;
  /** Language codes, already in display order (`languagesAvailable`). */
  languageOptions: string[];
  /** The selected language code. */
  modelValue: string | null;
  /** The RESOLVED version — drives the badge, and `dir`/`lang` in `ReaderPane`. */
  meta: ContentVersion | null;
  /** The third pane badges each section itself — one tab can mix editions. */
  hideProvenance?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { t, locale } = useI18n();

const selectId = useId();

// Panes mode mounts up to three of these on one page, and the site-locale
// switcher is a fourth "Language" control in the same document — so the
// bare word would leave a screen-reader user with four identically-named
// controls and no way to tell which pane each drives. The layer title is
// already a prop; it goes in the accessible name.
const languageLabel = computed(() =>
  t("reader.paneLanguageLabel", { pane: props.title }),
);

// The pane's options always name the language genuinely on screen
// (`paneLanguageOptions`), so a UI locale missing from them means this layer
// has no text in the reader's language and a fallback is showing. That must
// be said in words, not left to a 12px <select>. Hebrew is exempt: a Hebrew
// reader is shown the original, which is never a "fallback".
const fallbackNotice = computed(() => {
  if (locale.value === "he" || !props.modelValue) return null;
  if (props.languageOptions.length === 0) return null;
  if (props.languageOptions.includes(locale.value)) return null;
  return t("reader.languageFallback", {
    language: nativeLanguageName(locale.value),
    shown: nativeLanguageName(props.modelValue),
  });
});

const onLanguageChange = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
};
</script>

<template>
  <!-- One row at every width: the title truncates, the select shrinks and
       the provenance badge collapses to an icon when the header is narrow
       (container query), instead of wrapping to a second and third row. -->
  <div class="@container flex min-w-0 items-center justify-between gap-2">
    <!-- The third pane replaces the single layer title with a tablist
         (Inner Observation / Questions / Answers), so it supplies its own
         heading. Every other pane names exactly one layer and takes the
         default. -->
    <slot name="title">
      <h2 class="tes-pane-title min-w-0 truncate" :title="title">
        {{ title }}
      </h2>
    </slot>

    <div class="flex min-w-0 shrink-0 items-center gap-2">
      <ReaderProvenanceBadge v-if="!hideProvenance" :meta="meta" />

      <template v-if="languageOptions.length > 1">
        <label :for="selectId" class="sr-only">{{ languageLabel }}</label>
        <select
          :id="selectId"
          class="tes-lang-select"
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

    <p
      v-if="fallbackNotice"
      class="basis-full text-xs text-(--text-muted)"
      data-testid="language-fallback-notice"
    >
      {{ fallbackNotice }}
    </p>
  </div>
</template>
