<script setup lang="ts">
// One source segment's rendering: the seif-number chip + its sanitized,
// anchor-tappable html. Extracted from `SourcePane` (T7) so `StudyStream`
// (T8) renders segments identically instead of duplicating this markup —
// both wrap it in their own `id="seif-N"`/`.reader-anchor-target` list
// item; this owns only the segment's own content.
import type { SourceSegment } from "~~/shared/types/content";

const props = defineProps<{ segment: SourceSegment }>();

// Two passes over Sefaria's Questions <-> Answers cross-references, and
// the order between them is load-bearing:
//
// 1. `rewriteLegacySefariaRelativeHrefs` first, normalizing any
//    still-site-relative `href="/Talmud_..."` (content committed before
//    `sanitizeHtml` did this at import time) to an absolute sefaria.org
//    link. It rewrites *every* site-relative href to sefaria.org, so it
//    has to run before anything internal exists, not after — see
//    `app/utils/sanitizeHtml.ts`.
// 2. `linkCrossRefs` then maps each ref onto this site's own chapter
//    route, in the reader's locale, for the chapters that exist here. A
//    ref it declines keeps the external new-tab link step 1 left it with
//    — see `useLinkedCrossRefs`.
const { linkCrossRefs } = useLinkedCrossRefs();

const displayHtml = computed(() =>
  linkCrossRefs(
    rewriteLegacySefariaRelativeHrefs(
      stripLeadingSeifNumber(props.segment.html, props.segment.n),
    ),
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
