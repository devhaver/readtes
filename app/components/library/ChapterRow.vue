<script setup lang="ts">
import type { ChapterGroupEntry, ClusteredKind } from "~/utils/chapterGrouping";
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

/**
 * One key per clustered kind, keyed rather than branched: a two-way ternary
 * silently labelled any third clustered kind "Topics", which is exactly
 * what would have happened when issue #86 added Cause and Effect. A
 * `Record<ClusteredKind, ...>` makes the compiler ask for the label.
 */
const CLUSTER_LABEL_KEY: Record<ClusteredKind, string> = {
  "answers-terminology": "volumes.answersTerminologyCluster",
  "answers-topics": "volumes.answersTopicsCluster",
  "answers-cause-effect": "volumes.answersCauseEffectCluster",
};

const title = computed(() => {
  if (props.entry.type === "chapter") {
    return localizedText(props.entry.chapter.title, locale.value);
  }

  return t(CLUSTER_LABEL_KEY[props.entry.kind], {
    count: props.entry.count,
  });
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
        <!--
          `number` is unique only WITHIN a kind, so the Introduction (always
          1 of 1) rendered a "1" directly above Chapter 1's "1" — two rows,
          same ordinal, different things being counted. A kind with exactly
          one chapter has nothing to enumerate, so it shows none (issue #86).
        -->
        <span
          v-if="
            entry.type === 'chapter' && entry.chapter.kind !== 'introduction'
          "
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
