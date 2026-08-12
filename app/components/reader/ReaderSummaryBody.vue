<script setup lang="ts">
// The chapter's curated summary when it has one — most chapters don't
// (only chapter-01 does, so far): falls back to the chapter's `heading`s
// extracted from its source segments as a mini table-of-contents, so this
// is never an empty box. Each mini-toc entry jumps to that seif (`seif-N`).
//
// Rendered only by `ChapterIntro`, which both study mode (above the reading
// stream) and `SourcePane` (above its segment list) mount. That host's
// `<summary>` already shows "In this chapter", so the mini-toc carries NO
// visible heading of its own — it would render directly beneath an
// identical one. The name survives as the `<nav>`'s `aria-label`, which is
// what a screen reader announces for the landmark anyway.
//
// It is always rendered in the same
// container as the `seif-N` targets it jumps to, so a plain local
// `scrollIntoView` + highlight flash is all a mini-toc click needs; unlike
// a real cross-pane anchor activation, there's no other pane's
// `useHighlightedAnchor` that needs to react to this jump, so it doesn't
// go through `useReaderState`'s shared anchor-sync state at all.
import { flashAnchorHighlight } from "~/utils/anchorHighlight";
import { prefersReducedMotion } from "~/utils/motion";
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

const props = defineProps<{
  summaryItems: SummaryItem[];
  sourceSegments: SourceSegment[];
}>();

const { t } = useI18n();

const hasSummary = computed(() => props.summaryItems.length > 0);

const miniToc = computed(() =>
  sourceMiniTocEntries(props.sourceSegments, (n) =>
    t("reader.seifLabel", { n }),
  ),
);

const onMiniTocEntryClick = (anchorId: string) => {
  const target = document.getElementById(anchorId);
  if (!target) return;

  target.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
  flashAnchorHighlight(target);
};
</script>

<template>
  <div v-if="hasSummary" class="flex flex-col gap-6">
    <article
      v-for="item in summaryItems"
      :key="item.id"
      class="leading-relaxed text-(--text-primary)"
    >
      <h3
        class="font-display text-[length:calc(1rem*var(--reading-scale))] text-(--text-primary)"
      >
        {{ item.heading }}
      </h3>
      <div
        class="mt-1 text-[length:calc(0.875rem*var(--reading-scale))] text-(--text-muted)"
        v-html="item.html"
      />
    </article>
  </div>

  <nav
    v-else-if="miniToc.entries.length > 0"
    :aria-label="t('reader.miniTocTitle')"
  >
    <ol class="flex flex-col gap-1">
      <li v-for="entry in miniToc.entries" :key="entry.anchorId">
        <button
          type="button"
          class="tes-minitoc-link"
          @click="onMiniTocEntryClick(entry.anchorId)"
        >
          {{ entry.label }}
        </button>
      </li>
    </ol>
    <p v-if="miniToc.truncated" class="mt-2 text-sm text-(--text-muted)">
      {{
        t("reader.miniTocTruncated", {
          count: miniToc.total - miniToc.entries.length,
        })
      }}
    </p>
  </nav>

  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.summaryEmpty") }}
  </p>
</template>
