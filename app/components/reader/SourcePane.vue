<script setup lang="ts">
// Renders a chapter's source segments. Anchor clicks (`a.tes-anchor[data-anchor]`,
// Sefaria's inline commentary markers, normalized at import time — see
// `app/utils/anchors.ts`) are caught via `useAnchorActivation`'s single
// delegated listener on the scroll container — see that composable for why
// it's bound imperatively rather than a template `@click`.
//
// `useSeifTapActivation` (T9) is a second, independent delegated listener
// on the same container: tapping a segment's own paragraph (not one of its
// anchors) emits `open-seif-commentary`, which the reader page only acts on
// in mobile panes swipe mode (opening `CommentarySheet`) — see that
// composable for why the two listeners don't double-fire on an anchor tap.
//
// The collapsible mini-toc above the segment list used to be its own
// separate pane (`SummaryPane`, now deleted — the summary layer it also
// covered is effectively dead, exactly 1 file exists across the whole
// corpus). It's real navigation, so it moved here rather than disappearing:
// `ChapterIntro`'s own `<details>` pattern, reused as-is (study mode already
// renders the identical body above its stream) rather than duplicated.
import type { SourceSegment } from "~~/shared/types/content";

defineProps<{ segments: SourceSegment[] }>();

const emit = defineEmits<{ "open-seif-commentary": [seifN: number] }>();

const { t } = useI18n();
const { activateAnchor } = useReaderState();
const containerRef = useReaderPaneContainer();
useHighlightedAnchor("source", containerRef);
useAnchorActivation(containerRef, (id) => activateAnchor(id, "source"));
useSeifTapActivation(containerRef, (seifN) =>
  emit("open-seif-commentary", seifN),
);
</script>

<template>
  <div class="mx-auto flex max-w-[65ch] flex-col gap-6">
    <ReaderChapterIntro :summary-items="[]" :source-segments="segments" />

    <ol v-if="segments.length > 0" class="flex flex-col gap-6">
      <li
        v-for="(segment, index) in segments"
        :id="
          isContinuationSegment(segments, index)
            ? undefined
            : `seif-${segment.n}`
        "
        :key="sourceSegmentKey(segment, index)"
        :data-seif="segment.n"
        class="reader-anchor-target tes-seif-lg scroll-mt-4"
      >
        <ReaderSourceSegment
          :segment="segment"
          :continuation="isContinuationSegment(segments, index)"
        />
      </li>
    </ol>
    <p v-else class="text-sm text-(--text-muted)">
      {{ t("reader.sourceEmpty") }}
    </p>

    <!-- Absent-layer footnotes (`LayerAbsenceNote`) — rendered by the page
         when a whole layer has no edition for this chapter, so the absence
         is explained where the reader is actually looking instead of by a
         dead pane. -->
    <slot name="footnote" />
  </div>
</template>
