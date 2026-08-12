<script setup lang="ts">
// One source segment's rendering: the seif-number chip + its sanitized,
// anchor-tappable html. Extracted from `SourcePane` (T7) so `StudyStream`
// (T8) renders segments identically instead of duplicating this markup —
// both wrap it in their own `id="seif-N"`/`.reader-anchor-target` list
// item; this owns only the segment's own content.
import type { SourceSegment } from "~~/shared/types/content";

const props = defineProps<{
  segment: SourceSegment;
  /**
   * True when this segment is a later part of the same answer/seif as the
   * one before it (issue #91: `isContinuationSegment`) — renders without
   * its own seif chip, since `segment.n` would just repeat the segment
   * above it, and indented to read as a continuation of that paragraph
   * rather than a fresh one.
   */
  continuation?: boolean;
  /**
   * Renders the segment's html as separate paragraphs, split on its `<br>`s
   * (`splitProseParagraphs`), instead of one continuous run.
   *
   * Opt-in rather than always-on because it only fits segments that ARE
   * long-form prose: the Inner Observation essays, whose segments average
   * 1,423 characters and reach 5,347 with no headings and no block
   * structure at all — a genuine wall. A chapter seif is a short numbered
   * unit whose occasional `<br>` is a line break inside one thought, and
   * breaking it into paragraphs would misrepresent it as several.
   */
  splitParagraphs?: boolean;
}>();

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

const paragraphs = computed(() => splitProseParagraphs(displayHtml.value));
</script>

<template>
  <span v-if="!continuation" class="tes-seif-chip" aria-hidden="true">
    {{ segment.n }}
  </span>
  <!-- One `crossRefRoot` per rendered branch: the ref binds to whichever
       element actually renders, and `useLinkedCrossRefs` only ever needs the
       one root containing this segment's `v-html` links. -->
  <div v-if="splitParagraphs" ref="crossRefRoot" class="tes-prose-block">
    <p
      v-for="(paragraph, index) in paragraphs"
      :key="index"
      class="tes-prose-paragraph"
      v-html="paragraph"
    />
  </div>
  <span
    v-else
    ref="crossRefRoot"
    :class="continuation ? 'tes-seif-continuation' : undefined"
    v-html="displayHtml"
  />
</template>
