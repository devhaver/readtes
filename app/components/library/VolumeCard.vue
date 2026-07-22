<script setup lang="ts">
import type { LocaleObject } from "@nuxtjs/i18n";
import type {
  LanguageAvailability,
  TocVolumeSkeleton,
} from "~~/shared/types/content";

const props = defineProps<{
  volume: TocVolumeSkeleton;
}>();

const { locale, locales, t } = useI18n();
const localePath = useLocalePath();

const active = computed(() => volumeHasContent(props.volume));
const title = computed(() => localizedText(props.volume.title, locale.value));
const href = computed(() => localePath(`/volumes/${volumeSlug(props.volume)}`));

// `availableSummary` is precomputed at emit time (`toc.volumes.json` — see
// AGENTS.md "Content model") from the same algorithm
// `~/utils/contentAvailability`'s `partLanguageAvailability` implements —
// this card never needs a part's full `TocChapter[]`/the versions registry
// just to render its language chips.
const partSummaries = computed(() =>
  props.volume.parts.map((part) => ({
    part,
    title: localizedText(part.title, locale.value),
    chapterCount: part.chapterCount,
    languages: part.availableSummary,
  })),
);

const localeObjects = computed(() => locales.value as LocaleObject[]);

const localeName = (code: string): string =>
  localeObjects.value.find((entry) => entry.code === code)?.name ?? code;

/** e.g. "עברית" when fully available, "English (partial)" when only some chapters have it. */
const languageLabel = (
  code: "he" | "en",
  state: LanguageAvailability,
): string | null => {
  if (state === "none") return null;

  const name = localeName(code);
  return state === "partial"
    ? `${name} (${t("volumes.partialLanguage")})`
    : name;
};
</script>

<template>
  <div
    class="flex overflow-hidden rounded-card border border-(--border) bg-(--surface) shadow-sm"
    :class="{ 'opacity-60': !active }"
  >
    <div
      class="flex w-14 shrink-0 items-center justify-center bg-navy-primary font-display text-2xl text-surface-white sm:w-16"
      aria-hidden="true"
    >
      {{ volume.number }}
    </div>

    <div class="flex flex-1 flex-col gap-3 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-lg text-(--text-primary)">
          <NuxtLink
            v-if="active"
            :to="href"
            class="rounded-button hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          >
            {{ title }}
          </NuxtLink>
          <template v-else>{{ title }}</template>
        </h2>

        <span
          v-if="!active"
          class="shrink-0 rounded-button border border-(--border) px-2 py-0.5 text-xs font-medium text-(--text-muted)"
        >
          {{ t("volumes.comingSoon") }}
        </span>
      </div>

      <ul class="flex flex-col gap-1.5 text-sm">
        <li
          v-for="summary in partSummaries"
          :key="summary.part.id"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-(--text-muted)"
        >
          <span class="text-(--text-primary)">{{ summary.title }}</span>
          <span>{{
            t("volumes.chapterCount", { count: summary.chapterCount })
          }}</span>
          <span
            v-if="languageLabel('he', summary.languages.he)"
            class="rounded-button border border-teal/50 px-1.5 py-0.5 text-xs text-(--accent-text)"
          >
            {{ languageLabel("he", summary.languages.he) }}
          </span>
          <span
            v-if="languageLabel('en', summary.languages.en)"
            class="rounded-button border border-teal/50 px-1.5 py-0.5 text-xs text-(--accent-text)"
          >
            {{ languageLabel("en", summary.languages.en) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
