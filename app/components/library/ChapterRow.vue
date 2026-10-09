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
    if (props.entry.chapter.kind === "chapter") return t("common.chapter");
    if (props.entry.chapter.kind === "inner-observation") {
      return t("volumes.section.inner-observation");
    }
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
const showsOrdinal = computed(
  () =>
    props.entry.type === "chapter" &&
    ["chapter", "inner-observation"].includes(props.entry.chapter.kind),
);
</script>

<template>
  <li>
    <NuxtLink
      :to="href"
      class="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-card px-3 py-2.5 transition-colors hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring) sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3"
    >
      <span
        class="text-end text-sm tabular-nums text-(--text-muted)"
        :aria-hidden="!showsOrdinal"
      >
        {{
          showsOrdinal && entry.type === "chapter" ? entry.chapter.number : ""
        }}
      </span>
      <span class="line-clamp-2 min-w-0 text-(--text-primary)">{{
        title
      }}</span>

      <span
        v-if="
          (showAiBadge && languages.aiTranslated) ||
          (languages.he && !languages.en)
        "
        class="col-start-2 flex shrink-0 items-center gap-1.5 sm:col-start-3"
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
