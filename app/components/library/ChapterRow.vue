<script setup lang="ts">
import type { ChapterGroupEntry, ClusteredKind } from "~/utils/chapterGrouping";
import type { ContentVersion } from "~~/shared/types/content";

const props = withDefaults(
  defineProps<{
    entry: ChapterGroupEntry;
    versions: ContentVersion[];
    /** False when the page states "AI translated" once for the whole part instead. */
    showAiBadge?: boolean;
  }>(),
  { showAiBadge: true },
);

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
  chapterLanguages(representativeChapter.value, props.versions, locale.value),
);
</script>

<template>
  <li>
    <!-- No separate ordinal: a numbered chapter's title already carries its
         number ("Chapter 3"), and the number shown beside it was a second
         "3". The title may wrap to two lines; the badge sits below it on a
         phone rather than squeezing the title. -->
    <NuxtLink
      :to="href"
      class="flex flex-col gap-1 rounded-card px-3 py-2.5 transition-colors hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring) sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <span class="line-clamp-2 min-w-0 text-(--text-primary)">{{
        title
      }}</span>

      <span
        v-if="
          (showAiBadge && languages.aiTranslated) ||
          (languages.he && !languages.en)
        "
        class="flex shrink-0 items-center gap-1.5"
      >
        <span
          v-if="showAiBadge && languages.aiTranslated"
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
