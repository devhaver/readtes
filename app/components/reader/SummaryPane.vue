<script setup lang="ts">
// Renders the chapter's curated summary when it has one — most chapters
// don't (only chapter-01 does, so far): the pane instead shows the
// chapter's `heading`s extracted from its source segments as a mini
// table-of-contents, so the third pane is never an empty box. Each mini-toc
// entry jumps the source pane to that seif (`seif-N`, `useHighlightedAnchor`
// on `SourcePane`) — the summary pane itself is never a highlight target,
// only an anchor *origin*.
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

const props = defineProps<{
  summaryItems: SummaryItem[];
  sourceSegments: SourceSegment[];
}>();

const { t } = useI18n();
const { activateAnchor } = useReaderState();

const hasSummary = computed(() => props.summaryItems.length > 0);

const miniToc = computed(() =>
  sourceMiniTocEntries(props.sourceSegments, (n) =>
    t("reader.seifLabel", { n }),
  ),
);

const onMiniTocEntryClick = (anchorId: string) => {
  activateAnchor(anchorId, "summary");
};
</script>

<template>
  <div v-if="hasSummary" class="flex flex-col gap-6">
    <article
      v-for="item in summaryItems"
      :key="item.id"
      class="leading-relaxed text-(--text-primary)"
    >
      <h3 class="font-display text-base text-(--text-primary)">
        {{ item.heading }}
      </h3>
      <div class="mt-1 text-sm text-(--text-muted)" v-html="item.html" />
    </article>
  </div>

  <nav v-else-if="miniToc.length > 0" :aria-label="t('reader.miniTocTitle')">
    <h3
      class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
    >
      {{ t("reader.miniTocTitle") }}
    </h3>
    <ol class="mt-3 flex flex-col gap-1">
      <li v-for="entry in miniToc" :key="entry.anchorId">
        <button
          type="button"
          class="rounded-button px-2 py-1 text-start text-sm text-(--text-primary) hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          @click="onMiniTocEntryClick(entry.anchorId)"
        >
          {{ entry.label }}
        </button>
      </li>
    </ol>
  </nav>

  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.summaryEmpty") }}
  </p>
</template>
