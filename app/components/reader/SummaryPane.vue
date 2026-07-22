<script setup lang="ts">
// Thin wrapper around `ReaderSummaryBody` — see that component for the
// summary-or-mini-toc rendering rule. Kept as its own component (rather
// than inlining `ReaderSummaryBody` directly in the reader page) so the
// panes-mode summary pane and study mode's `ChapterIntro` can each wrap it
// in their own chrome without either depending on the other's markup.
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

defineProps<{
  summaryItems: SummaryItem[];
  sourceSegments: SourceSegment[];
}>();
</script>

<template>
  <ReaderSummaryBody
    :summary-items="summaryItems"
    :source-segments="sourceSegments"
  />
</template>
