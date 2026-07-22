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
  <ol
    v-if="segments.length > 0"
    class="mx-auto flex max-w-[65ch] flex-col gap-6"
  >
    <li
      v-for="segment in segments"
      :id="`seif-${segment.n}`"
      :key="segment.n"
      :data-seif="segment.n"
      class="reader-anchor-target scroll-mt-4 text-[length:calc(1.125rem*var(--reading-scale))] leading-relaxed text-(--text-primary)"
    >
      <ReaderSourceSegment :segment="segment" />
    </li>
  </ol>
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.sourceEmpty") }}
  </p>
</template>
