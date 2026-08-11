<script setup lang="ts">
// The chapter's curated summary when it has one — most chapters don't
// (only chapter-01 does, so far): falls back to the chapter's `heading`s
// extracted from its source segments as a mini table-of-contents, so this
// is never an empty box. Each mini-toc entry jumps to that seif (`seif-N`).
//
// Used by both `ChapterIntro` (study mode's collapsible intro card, above
// the reading stream) and `SourcePane` (panes mode's own collapsible
// `<details>`, above its segment list) — always rendered in the same
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

  <nav v-else-if="miniToc.length > 0" :aria-label="t('reader.miniTocTitle')">
    <h3 class="tes-eyebrow">
      {{ t("reader.miniTocTitle") }}
    </h3>
    <ol class="mt-3 flex flex-col gap-1">
      <li v-for="entry in miniToc" :key="entry.anchorId">
        <button
          type="button"
          class="tes-minitoc-link"
          @click="onMiniTocEntryClick(entry.anchorId)"
        >
          {{ entry.label }}
        </button>
      </li>
    </ol>
  </nav>

  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.summaryEmpty") }}
  </p>
</template>
