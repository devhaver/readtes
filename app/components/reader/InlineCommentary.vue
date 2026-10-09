<script setup lang="ts">
// Study mode's inline commentary disclosure: unfolds directly beneath the
// source segment containing the tapped anchor (`StudyStream`), rather than
// scrolling the reader across to a separate commentary pane. Reuses the T7
// missing-anchor notice pattern (`resolveAnchorAvailability`,
// `~/utils/commentaryNotice`) inline instead of as a toast, since several
// of these can be open at once and each needs its own "not in this
// language" check independent of the others.
import type { CommentaryItem, ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  anchorId: string;
  /** This anchor's items in the currently-selected commentary version — empty means "missing". */
  items: CommentaryItem[];
  meta: ContentVersion | null;
  canSwitchToHebrew: boolean;
  /** `anchorId` -> the marker the source text prints — see `anchorMarkersFromSegments` (issue #96). */
  anchorMarkers?: ReadonlyMap<string, string>;
}>();

const emit = defineEmits<{ "switch-to-hebrew": [] }>();

const { locale, localeProperties, t } = useI18n();
const { toggleInline } = useReaderState();

const isMissing = computed(() => props.items.length === 0);
const isAiTranslated = computed(() => props.meta?.source === "ai");

// The marker as the source text prints it, else the note's own label.
const marker = computed(
  () =>
    props.anchorMarkers?.get(props.anchorId) ??
    (props.items[0] ? localizedText(props.items[0].label, locale.value) : ""),
);

const fold = () => {
  toggleInline(props.anchorId);
  // The card unmounts with focus on this button, which drops focus to the
  // page: hand it back to the marker that opened the card.
  document
    .querySelector<HTMLElement>(
      `a.tes-anchor[data-anchor="${CSS.escape(props.anchorId)}"]`,
    )
    ?.focus();
};
</script>

<template>
  <div
    :id="anchorId"
    tabindex="-1"
    class="reader-anchor-target scroll-mt-24 rounded-card border-s-4 border-teal bg-(--surface-reading) p-3"
    :dir="meta?.direction ?? 'ltr'"
    :lang="meta?.language"
  >
    <!-- The header is UI chrome, not note text: it carries the UI locale's
         lang/dir, not the commentary version's (a Hebrew note must not make
         "Fold" read as Hebrew). It names the note so the row is a label, not
         a dead band with a lone button. -->
    <div
      class="mb-1.5 flex items-center justify-between gap-2"
      :dir="localeProperties?.dir ?? 'ltr'"
      :lang="locale"
    >
      <span class="flex flex-wrap items-center gap-2">
        <span v-if="marker" class="text-xs font-semibold text-(--accent-text)">
          {{ t("reader.noteLabel", { n: marker }) }}
        </span>
        <span
          v-if="isAiTranslated"
          class="rounded-button border border-orange-cta px-1.5 py-0.5 text-xs font-medium text-(--warning-text)"
        >
          {{ t("reader.aiTranslated") }}
        </span>
      </span>

      <button
        type="button"
        class="rounded-button px-2 py-1 text-xs text-(--text-muted) hover:text-(--accent-text) hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        :aria-label="t('reader.studyMode.fold')"
        @click="fold"
      >
        {{ t("reader.studyMode.fold") }}
      </button>
    </div>

    <p v-if="isMissing" class="text-xs text-(--warning-text)">
      {{ t("reader.missingAnchor.message") }}
      <button
        v-if="canSwitchToHebrew"
        type="button"
        class="ms-1 underline"
        @click="emit('switch-to-hebrew')"
      >
        {{ t("reader.missingAnchor.switchToHebrew") }}
      </button>
    </p>

    <ol v-else class="flex flex-col gap-3">
      <li
        v-for="item in items"
        :key="item.anchorId"
        class="text-[length:calc(1rem*var(--reading-scale))] leading-relaxed text-(--text-primary)"
      >
        <span v-html="trimEdgeBreaks(item.html)" />
      </li>
    </ol>
  </div>
</template>
