<script setup lang="ts">
// One source segment's rendering: the seif-number chip + its sanitized,
// anchor-tappable html. Extracted from `SourcePane` (T7) so `StudyStream`
// (T8) renders segments identically instead of duplicating this markup —
// both wrap it in their own `id="seif-N"`/`.reader-anchor-target` list
// item; this owns only the segment's own content.
import type { SourceSegment } from "~~/shared/types/content";

const props = defineProps<{ segment: SourceSegment }>();

// `rewriteLegacySefariaRelativeHrefs` patches a data quirk in already-
// committed content: some Questions/Answers chapters' Hebrew source has
// Sefaria's own site-relative cross-reference links (`href="/Talmud_..."`),
// which don't resolve on this site — see `app/utils/sanitizeHtml.ts`.
const displayHtml = computed(() =>
  rewriteLegacySefariaRelativeHrefs(
    stripLeadingSeifNumber(props.segment.html, props.segment.n),
  ),
);
</script>

<template>
  <span
    class="me-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--surface-raised) px-1 align-middle text-xs tabular-nums text-(--text-muted)"
    aria-hidden="true"
  >
    {{ segment.n }}
  </span>
  <span v-html="displayHtml" />
</template>
