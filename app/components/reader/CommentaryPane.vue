<script setup lang="ts">
// Renders a chapter's commentary items, grouped under "Inner Light"
// (Ohr Pnimi) / "Inner Observation" (Histaklut Pnimit) section headings —
// only the groups that actually have items render (see
// `groupCommentaryBySection`, which sorts each group by `order` — the
// items' actual reading order, so an unanchored item naturally interleaves
// wherever it falls among anchored ones rather than being pinned to either
// end). The "not available in this language" toast for a source anchor
// missing from this version lives in the reader page (via `ReaderPane`'s
// `#toast` slot), not here — this component only renders whatever items
// it's given.
//
// An unanchored item (issue #79: known chapter, unknown seif — see
// `isAnchoredCommentaryItem`) gets no `tes-anchor` button: clicking one
// would call `activateAnchor` with an id no source marker will ever carry
// (`validate-content.ts` forbids it), so `useHighlightedAnchor("source", …)`
// would find nothing and silently no-op — a dead affordance. Its label
// renders as plain (non-interactive) text instead. When the chapter mixes
// in any unanchored items, a single note above the groups says so once,
// rather than repeating a caveat per item.
import type { CommentaryItem } from "~~/shared/types/content";

const props = defineProps<{ items: CommentaryItem[] }>();

const { locale, t } = useI18n();
const { activateAnchor } = useReaderState();
const containerRef = useReaderPaneContainer();
useHighlightedAnchor("commentary", containerRef);

const groups = computed(() => groupCommentaryBySection(props.items));
const hasUnanchoredItems = computed(() =>
  hasUnanchoredCommentaryItems(props.items),
);
</script>

<template>
  <div v-if="groups.length > 0" class="flex flex-col gap-8">
    <p v-if="hasUnanchoredItems" class="text-sm text-(--text-muted)">
      {{ t("reader.commentaryNotAligned") }}
    </p>

    <section
      v-for="group in groups"
      :key="group.section"
      class="flex flex-col gap-4"
    >
      <h3 class="tes-eyebrow">
        {{ t(`reader.commentarySection.${group.section}`) }}
      </h3>

      <ol class="flex flex-col gap-5">
        <li
          v-for="item in group.items"
          :id="item.anchorId"
          :key="item.anchorId"
          class="reader-anchor-target tes-commentary-item"
        >
          <button
            v-if="isAnchoredCommentaryItem(item)"
            type="button"
            class="tes-anchor"
            @click="activateAnchor(item.anchorId, 'commentary')"
          >
            {{ localizedText(item.label, locale) }}
          </button>
          <span
            v-else
            class="inline-flex items-center justify-center px-[0.15em] align-super text-[0.7em] font-semibold text-(--accent-text)"
          >
            {{ localizedText(item.label, locale) }}
          </span>
          <span v-html="item.html" />
        </li>
      </ol>
    </section>
  </div>
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.commentaryEmpty") }}
  </p>
</template>
