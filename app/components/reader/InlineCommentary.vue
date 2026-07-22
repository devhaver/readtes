<script setup lang="ts">
// Study mode's inline commentary disclosure: unfolds directly beneath the
// source segment containing the tapped anchor (`StudyStream`), rather than
// scrolling the reader across to a separate commentary pane. Reuses the T7
// missing-anchor notice pattern (`resolveAnchorAvailability`,
// `~/utils/commentaryNotice`) inline instead of as a toast, since several
// of these can be open at once and each needs its own "not in this
// edition" check independent of the others.
import type { CommentaryItem, ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  anchorId: string;
  /** This anchor's items in the currently-selected commentary version — empty means "missing". */
  items: CommentaryItem[];
  meta: ContentVersion | null;
  canSwitchToHebrew: boolean;
}>();

const emit = defineEmits<{ "switch-to-hebrew": [] }>();

const { locale, t } = useI18n();
const { toggleInline } = useReaderState();

const isMissing = computed(() => props.items.length === 0);
const isAiTranslated = computed(() => props.meta?.source === "ai");

const fold = () => toggleInline(props.anchorId);
</script>

<template>
  <div
    :id="anchorId"
    class="reader-anchor-target scroll-mt-24 rounded-card border-s-4 border-teal bg-(--surface-reading) p-3"
    :dir="meta?.direction ?? 'ltr'"
    :lang="meta?.language"
  >
    <div class="mb-1.5 flex items-center justify-between gap-2">
      <span
        v-if="isAiTranslated"
        class="rounded-button border border-orange-cta px-1.5 py-0.5 text-xs font-medium text-orange-cta"
      >
        {{ t("reader.aiTranslated") }}
      </span>
      <span v-else />

      <button
        type="button"
        class="rounded-button px-2 py-1 text-xs text-(--text-muted) hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        :aria-label="t('reader.studyMode.fold')"
        @click="fold"
      >
        {{ t("reader.studyMode.fold") }}
      </button>
    </div>

    <p v-if="isMissing" class="text-xs text-orange-cta">
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
        <span class="me-1.5 text-xs font-semibold text-teal">{{
          localizedText(item.label, locale)
        }}</span>
        <span v-html="item.html" />
      </li>
    </ol>
  </div>
</template>
