<script setup lang="ts">
import type { LocaleObject } from "@nuxtjs/i18n";
import type {
  LanguageAvailability,
  PartAvailableSummary,
  TocVolumeSkeleton,
} from "~~/shared/types/content";

/** UI locales that have a Bnei Baruch edition of their own to surface. */
const ownLanguageKeys = ["ru", "uk", "es", "fr"] as const;

const NuxtLink = resolveComponent("NuxtLink");

const props = defineProps<{
  volume: TocVolumeSkeleton;
}>();

const { locale, locales, t } = useI18n();
const { countedLabel } = useCountedLabel();
const localePath = useLocalePath();

const active = computed(() => volumeHasContent(props.volume));
const title = computed(() => localizedText(props.volume.title, locale.value));
const href = computed(() => localePath(`/volumes/${volumeSlug(props.volume)}`));

// `availableSummary` is precomputed at emit time (`toc.volumes.json` — see
// AGENTS.md "Content model") from the same algorithm
// `~/utils/contentAvailability`'s `partLanguageAvailability` implements —
// this card never needs a part's full `TocChapter[]`/the versions registry
// just to render its language chips.
const localeObjects = computed(() => locales.value as LocaleObject[]);

const localeName = (code: string): string =>
  localeObjects.value.find((entry) => entry.code === code)?.name ?? code;

/** e.g. "English" when fully available, "English (partial)" when only some chapters have it. */
const languageLabel = (
  name: string,
  state: LanguageAvailability,
): string | null => {
  if (state === "none") return null;

  return state === "partial"
    ? `${name} (${t("volumes.partialLanguage")})`
    : name;
};

/**
 * Chips that can differ from part to part: Hebrew only when it is not
 * complete (it is the source, so a chip on every part says nothing),
 * English split into official and AI translated, and the reader's own
 * language when a Bnei Baruch edition of that part exists.
 */
const editionChips = (summary: PartAvailableSummary): string[] => {
  const english = localeName("en");
  const own = ownLanguageKeys.find((code) => code === locale.value);

  return [
    summary.he === "full" ? null : languageLabel(localeName("he"), summary.he),
    languageLabel(english, summary.enOfficial),
    languageLabel(`${english}, ${t("reader.aiTranslated")}`, summary.enAi),
    own ? languageLabel(localeName(own), summary[own]) : null,
  ].filter((label): label is string => label !== null);
};

const partSummaries = computed(() =>
  props.volume.parts.map((part) => ({
    part,
    title: localizedText(part.title, locale.value),
    chapterCount: part.mainChapterCount,
    href: localePath(`/volumes/${volumeSlug(props.volume)}#${part.id}`),
    chips: editionChips(part.availableSummary),
  })),
);
</script>

<template>
  <!-- The stretched link (`after:absolute after:inset-0`, see the title
       link below) makes the WHOLE card clickable — the volume list is the
       page's whole purpose, so clicking anywhere on the card should open
       its contents page, not just the title line. -->
  <div
    class="relative flex overflow-hidden rounded-card border border-(--border) bg-(--surface) shadow-sm transition-colors"
    :class="{ 'hover:border-teal/60': active, 'opacity-60': !active }"
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
            class="after:absolute after:inset-0 rounded-button hover:text-(--accent-text) hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
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

      <!-- Name on its own line, facts beneath: name, count and two chips on
           one wrapping line broke mid-row on a phone and left a chip
           stranded on a line of its own. -->
      <!-- Each part is its own link, above the card's stretched one, to
           that part's section on the volume page. Two columns from `md` so
           the card's width is used instead of a third of it. -->
      <ul class="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
        <li
          v-for="summary in partSummaries"
          :key="summary.part.id"
          class="relative z-10"
        >
          <component
            :is="active ? NuxtLink : 'div'"
            :to="active ? summary.href : undefined"
            class="-mx-2 flex flex-col gap-0.5 rounded-button px-2 py-1.5"
            :class="
              active
                ? 'hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal'
                : ''
            "
          >
            <span class="text-(--text-primary)">
              <span class="text-(--text-muted)"
                >{{ t("common.part") }} {{ summary.part.number }} ·</span
              >
              {{ summary.title }}
            </span>
            <span
              class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-(--text-muted)"
            >
              <span>{{
                countedLabel("volumes.chapterCount", summary.chapterCount)
              }}</span>
              <span
                v-for="chip in summary.chips"
                :key="chip"
                class="rounded-button border border-teal/50 px-1.5 py-0.5 text-(--accent-text)"
              >
                {{ chip }}
              </span>
            </span>
          </component>
        </li>
      </ul>
    </div>
  </div>
</template>
