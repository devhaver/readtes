<script setup lang="ts">
// Original mode: reproduces KabbalahMedia's own printed presentation for
// one chapter/node at a time — a single reading column, no cross-pane
// alignment chrome or anchor chips, book-like Prev/Next pagination through
// the part's own ToC order instead (`OriginalPager`). The `--surface-reading`
// "warm paper" token + the Hebrew reading face (`lang="he"` -> David Libre,
// see main.css) match the rest of the reader's own printed-book styling.
//
// No version selectors and no click-to-highlight wiring here at all — the
// source/commentary content is whatever the reader's own standing version
// preference already resolved to (shared with study/panes mode via
// `useReaderVersions`), just rendered plainly. The inline `tes-anchor`
// markers inside the source HTML itself are left as inert same-page hash
// links (a click jumps to that footnote's `id` below, the same way a
// printed book's superscript reference does) rather than wired up to any
// JS activation/highlight — that cross-pane machinery has no purpose here
// since there's only ever one pane.
import type { PartPaginationPosition } from "~/utils/toc";
import type {
  CommentaryItem,
  ContentVersion,
  SourceSegment,
} from "~~/shared/types/content";

const props = defineProps<{
  sourceSegments: SourceSegment[];
  commentaryItems: CommentaryItem[];
  sourceMeta: ContentVersion | null;
  commentaryMeta: ContentVersion | null;
  pagination: PartPaginationPosition | null;
}>();

const { t, locale } = useI18n();

const hasCommentary = computed(() => props.commentaryItems.length > 0);
</script>

<template>
  <div
    class="mx-auto flex max-w-[65ch] flex-col gap-6 bg-(--surface-reading) px-4 py-8 sm:px-6"
  >
    <ReaderOriginalPager
      v-if="pagination"
      :index="pagination.index"
      :total="pagination.total"
      :prev="pagination.prev"
      :next="pagination.next"
    />

    <ol
      v-if="sourceSegments.length > 0"
      class="flex flex-col gap-6"
      :dir="sourceMeta?.direction ?? 'ltr'"
      :lang="sourceMeta?.language"
    >
      <!-- `id="seif-N"` for the same reason `SourcePane`/`StudyStream`
           carry it: a Questions/Answers cross-reference lands on
           `…#seif-N` (`useLinkedCrossRefs`), and a reader whose standing
           mode override is original must arrive at the seif here too, not
           at an unscrolled page. -->
      <li
        v-for="segment in sourceSegments"
        :id="`seif-${segment.n}`"
        :key="segment.n"
        class="scroll-mt-24 text-[length:calc(1.125rem*var(--reading-scale))] leading-relaxed text-(--text-primary)"
      >
        <ReaderSourceSegment :segment="segment" />
      </li>
    </ol>
    <p v-else class="text-sm text-(--text-muted)">
      {{ t("reader.sourceEmpty") }}
    </p>

    <template v-if="hasCommentary">
      <h2
        class="font-display text-base text-(--text-primary)"
        :dir="commentaryMeta?.direction ?? 'ltr'"
        :lang="commentaryMeta?.language"
      >
        {{ t("reader.commentarySection.ohr-pnimi") }}
      </h2>
      <ol
        class="flex flex-col gap-4"
        :dir="commentaryMeta?.direction ?? 'ltr'"
        :lang="commentaryMeta?.language"
      >
        <li
          v-for="item in commentaryItems"
          :id="item.anchorId"
          :key="item.anchorId"
          class="text-[length:calc(1rem*var(--reading-scale))] leading-relaxed text-(--text-primary)"
        >
          <span class="font-medium"
            >{{ localizedText(item.label, locale) }}.</span
          >
          <span v-html="item.html" />
        </li>
      </ol>
    </template>

    <ReaderOriginalPager
      v-if="pagination"
      :index="pagination.index"
      :total="pagination.total"
      :prev="pagination.prev"
      :next="pagination.next"
    />
  </div>
</template>
