<script setup lang="ts">
// Renders a chapter's source segments. Anchor clicks (`a.tes-anchor[data-anchor]`,
// Sefaria's inline commentary markers, normalized at import time — see
// `app/utils/anchors.ts`) are caught via `useAnchorActivation`'s single
// delegated listener on the scroll container — see that composable for why
// it's bound imperatively rather than a template `@click`.
import type { SourceSegment } from "~~/shared/types/content";

defineProps<{ segments: SourceSegment[] }>();

const { t } = useI18n();
const { activateAnchor } = useReaderState();
const containerRef = useReaderPaneContainer();
useHighlightedAnchor("source", containerRef);
useAnchorActivation(containerRef, (id) => activateAnchor(id, "source"));
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
      class="reader-anchor-target scroll-mt-4 text-lg leading-relaxed text-(--text-primary)"
    >
      <ReaderSourceSegment :segment="segment" />
    </li>
  </ol>
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.sourceEmpty") }}
  </p>
</template>
