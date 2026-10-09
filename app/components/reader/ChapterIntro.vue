<script setup lang="ts">
// Study mode's chapter-intro card, at the top of `StudyStream`: the same
// summary-or-mini-toc body as the panes-mode summary pane
// (`ReaderSummaryBody`), inside a native `<details>` disclosure — a plain
// `<details>` needs no extra ARIA to be a fully accessible collapsible;
// collapsed by default (no `open` attribute) so a mobile reader lands on
// the source stream itself, not a wall of summary text.
//
// Rendered only when it has something to say: a curated summary, or at least
// two source segments carrying a real heading. Without headings the mini-toc
// is a bare "Seif 1 … Seif N" — a box that opens onto a list of the numbers
// already printed beside every seif (only 396 of 21,218 corpus segments
// have a heading), so those chapters get no box at all rather than a useless one.
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

const props = defineProps<{
  summaryItems: SummaryItem[];
  sourceSegments: SourceSegment[];
}>();

const { t } = useI18n();

const MIN_HEADINGS = 2;

const hasContent = computed(
  () =>
    props.summaryItems.length > 0 ||
    props.sourceSegments.filter((segment) => segment.heading?.trim()).length >=
      MIN_HEADINGS,
);
</script>

<template>
  <details
    v-if="hasContent"
    class="group rounded-card border border-(--border) bg-(--surface-reading)"
  >
    <summary class="tes-disclosure-summary">
      <span class="tes-eyebrow">
        {{ t("reader.chapterIntro.title") }}
      </span>
      <span
        aria-hidden="true"
        class="tes-icon tes-icon-chevron-down tes-disclosure-chevron h-4 w-4"
      />
    </summary>

    <div class="px-4 pb-4">
      <ReaderSummaryBody
        :summary-items="summaryItems"
        :source-segments="sourceSegments"
      />
    </div>
  </details>
</template>
