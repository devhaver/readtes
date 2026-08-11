<script setup lang="ts">
// One source segment's rendering: the seif-number chip + its sanitized,
// anchor-tappable html. Extracted from `SourcePane` (T7) so `StudyStream`
// (T8) renders segments identically instead of duplicating this markup —
// both wrap it in their own `id="seif-N"`/`.reader-anchor-target` list
// item; this owns only the segment's own content.
import type { SourceSegment } from "~~/shared/types/content";

const props = defineProps<{ segment: SourceSegment }>();

// Two passes over Sefaria's Questions <-> Answers cross-references, in
// this order:
//
// 1. `rewriteLegacySefariaRelativeHrefs` first, normalizing any
//    still-site-relative `href="/Talmud_..."` (content committed before
//    `sanitizeHtml` did this at import time) to an absolute sefaria.org
//    link. It rewrites *every* site-relative href to sefaria.org, so the
//    day some content does hold one, running it after step 2 would undo
//    that ref's internal link — see `app/utils/sanitizeHtml.ts`. Nothing
//    in the committed corpus is site-relative today (measured: all 6,885
//    refs are absolute), so this pass is a no-op against it; the ordering
//    is what keeps it that way rather than a live dependency.
// 2. `linkCrossRefs` then maps each ref onto this site's own chapter
//    route, in the reader's locale, for the chapters that exist here. A
//    ref it declines keeps the external new-tab link step 1 left it with
//    — see `useLinkedCrossRefs`.
//
// `crossRefRoot` goes on the element holding that html: those internal
// links are raw `<a href>` inside `v-html`, so the reader's router only
// gets to handle them through the delegated click listener that ref binds.
const { linkCrossRefs, crossRefRoot } = useLinkedCrossRefs();

const displayHtml = computed(() =>
  linkCrossRefs(
    rewriteLegacySefariaRelativeHrefs(
      stripLeadingSeifNumber(props.segment.html, props.segment.n),
    ),
  ),
);
</script>

<template>
  <span class="tes-seif-chip" aria-hidden="true">
    {{ segment.n }}
  </span>
  <span ref="crossRefRoot" v-html="displayHtml" />
</template>
