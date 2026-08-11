<script setup lang="ts">
// Study mode's chapter-intro card, at the top of `StudyStream`: the same
// summary-or-mini-toc body as the panes-mode summary pane
// (`ReaderSummaryBody`), inside a native `<details>` disclosure — a plain
// `<details>` needs no extra ARIA to be a fully accessible collapsible;
// collapsed by default (no `open` attribute) so a mobile reader lands on
// the source stream itself, not a wall of summary text.
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

defineProps<{
  summaryItems: SummaryItem[];
  sourceSegments: SourceSegment[];
}>();

const { t } = useI18n();
</script>

<template>
  <details
    class="group mb-6 rounded-card border border-(--border) bg-(--surface-reading)"
  >
    <summary class="tes-disclosure-summary">
      <span class="tes-eyebrow">
        {{ t("reader.chapterIntro.title") }}
      </span>
      <span aria-hidden="true" class="tes-disclosure-chevron">⌄</span>
    </summary>

    <div class="px-4 pb-4">
      <ReaderSummaryBody
        :summary-items="summaryItems"
        :source-segments="sourceSegments"
      />
    </div>
  </details>
</template>
