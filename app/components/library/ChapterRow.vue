<script setup lang="ts">
import type { ChapterGroupEntry } from "~/utils/chapterGrouping";
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  entry: ChapterGroupEntry;
  versions: ContentVersion[];
}>();

const { locale, t } = useI18n();
const localePath = useLocalePath();

/** The chapter a row's badges/link are computed from — the cluster's first chapter, if clustered. */
const representativeChapter = computed(() =>
  props.entry.type === "chapter"
    ? props.entry.chapter
    : props.entry.firstChapter,
);

const title = computed(() => {
  if (props.entry.type === "chapter") {
    return localizedText(props.entry.chapter.title, locale.value);
  }

  const key =
    props.entry.kind === "answers-terminology"
      ? "volumes.answersTerminologyCluster"
      : "volumes.answersTopicsCluster";
  return t(key, { count: props.entry.count });
});

const href = computed(() =>
  localePath(`/read/${representativeChapter.value.id}`),
);
const languages = computed(() =>
  chapterLanguages(representativeChapter.value, props.versions),
);
</script>

<template>
  <li>
    <NuxtLink
      :to="href"
      class="flex items-center justify-between gap-3 rounded-card px-3 py-2.5 transition-colors hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    >
      <span class="flex min-w-0 items-baseline gap-2">
        <span
          v-if="entry.type === 'chapter'"
          class="shrink-0 text-sm tabular-nums text-(--text-muted)"
        >
          {{ entry.chapter.number }}
        </span>
        <span class="truncate text-(--text-primary)">{{ title }}</span>
      </span>

      <span class="flex shrink-0 items-center gap-1.5">
        <span
          v-if="languages.aiTranslated"
          class="rounded-button border border-orange-cta px-1.5 py-0.5 text-xs font-medium text-(--warning-text)"
        >
          {{ t("reader.aiTranslated") }}
        </span>
        <span
          v-else-if="languages.he && !languages.en"
          class="text-xs text-(--text-muted)"
        >
          {{ t("reader.hebrewOnly") }}
        </span>
      </span>
    </NuxtLink>
  </li>
</template>
