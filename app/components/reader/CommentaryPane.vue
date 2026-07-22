<script setup lang="ts">
// Renders a chapter's commentary items, grouped under "Inner Light"
// (Ohr Pnimi) / "Inner Observation" (Histaklut Pnimit) section headings —
// only the groups that actually have items render (see
// `groupCommentaryBySection`). The "not available in this edition" toast
// for a source anchor missing from this version lives in the reader page
// (via `ReaderPane`'s `#toast` slot), not here — this component only
// renders whatever items it's given.
import type { CommentaryItem } from "~~/shared/types/content";

const props = defineProps<{ items: CommentaryItem[] }>();

const { locale, t } = useI18n();
const { activateAnchor } = useReaderState();
const containerRef = useReaderPaneContainer();
useHighlightedAnchor("commentary", containerRef);

const groups = computed(() => groupCommentaryBySection(props.items));
</script>

<template>
  <div v-if="groups.length > 0" class="flex flex-col gap-8">
    <section
      v-for="group in groups"
      :key="group.section"
      class="flex flex-col gap-4"
    >
      <h3
        class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
      >
        {{ t(`reader.commentarySection.${group.section}`) }}
      </h3>

      <ol class="flex flex-col gap-5">
        <li
          v-for="item in group.items"
          :id="item.anchorId"
          :key="item.anchorId"
          class="reader-anchor-target scroll-mt-4 rounded-card p-1 leading-relaxed text-(--text-primary)"
        >
          <button
            type="button"
            class="tes-anchor"
            @click="activateAnchor(item.anchorId, 'commentary')"
          >
            {{ localizedText(item.label, locale) }}
          </button>
          <span v-html="item.html" />
        </li>
      </ol>
    </section>
  </div>
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.commentaryEmpty") }}
  </p>
</template>
