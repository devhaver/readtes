<script setup lang="ts">
// The signature mobile reading experience (T8): source segments flow as a
// single reading stream — commentary comes to the reader inline instead of
// living in a separate pane the reader has to juggle. Default mode below
// the `lg` breakpoint (`useReaderMode`); reuses the exact same version
// selection (`ReaderVersionHeader`), seif rendering (`ReaderSourceSegment`)
// and anchor-activation behaviour (`useAnchorActivation`) as panes mode's
// `SourcePane`, rather than duplicating any of it.
import type {
  CommentaryItem,
  ContentVersion,
  SourceSegment,
  SummaryItem,
} from "~~/shared/types/content";

const props = defineProps<{
  sourceSegments: SourceSegment[];
  commentaryItems: CommentaryItem[];
  summaryItems: SummaryItem[];
  sourceMeta: ContentVersion | null;
  commentaryMeta: ContentVersion | null;
  sourceVersionOptions: { id: string; label: string }[];
  commentaryVersionOptions: { id: string; label: string }[];
  sourceVersion: string | null;
  commentaryVersion: string | null;
  /** The chapter's `he-jerusalem-1956` commentary items, if it has that version — for the inline "switch to Hebrew" notice. */
  hebrewItems: CommentaryItem[] | null;
  hebrewVersionId: string;
}>();

const emit = defineEmits<{
  "update:sourceVersion": [value: string];
  "update:commentaryVersion": [value: string];
}>();

const { t } = useI18n();
const { activateAnchor, toggleInline, expandedAnchors } = useReaderState();
const { setMode } = useReaderMode();

// Study mode has no separate scroll container of its own — the whole
// document scrolls (see `useAutoHidingChrome`) — but `useHighlightedAnchor`
// and `useAnchorActivation` both just need *an* ancestor element containing
// every anchor target to query against; this stream's own root serves that
// role the same way a `ReaderPane`'s container does in panes mode.
const containerRef = ref<HTMLElement | null>(null);
useHighlightedAnchor("source", containerRef);
useAnchorActivation(containerRef, (id) => {
  activateAnchor(id, "source");
  toggleInline(id);
});

// The anchor markers themselves live in sanitized `v-html` (see
// `ReaderSourceSegment`), outside Vue's own attribute bindings, so their
// `aria-expanded`/`aria-controls` can't just be template-bound like a
// normal disclosure trigger — this small effect is what keeps them in
// sync with `expandedAnchors` instead. Scoped to this stream's own
// container only (no cross-pane DOM reach), and `flush: "post"` so it
// always runs after Vue has (re)patched the `v-html` markup it targets —
// e.g. on a source-version switch, which replaces those anchor nodes
// outright. `aria-controls` points at the matching `InlineCommentary`'s
// own root, which is already given `:id="anchorId"` there.
watchEffect(
  () => {
    const container = containerRef.value;
    if (!container) return;

    const expanded = expandedAnchors.value;
    // Read (without using) `sourceSegments` so this effect also re-runs
    // after a source-version switch replaces the `v-html` anchor nodes —
    // otherwise the freshly patched anchors would sit un-synced until the
    // next `expandedAnchors` change, contradicting the whole point of
    // this effect.
    void props.sourceSegments;
    container
      .querySelectorAll<HTMLAnchorElement>("a.tes-anchor[data-anchor]")
      .forEach((anchor) => {
        const anchorId = anchor.dataset.anchor;
        if (!anchorId) return;

        anchor.setAttribute("aria-controls", anchorId);
        anchor.setAttribute(
          "aria-expanded",
          expanded.has(anchorId) ? "true" : "false",
        );
      });
  },
  { flush: "post" },
);

const isExpanded = (anchorId: string): boolean =>
  expandedAnchors.value.has(anchorId);

const commentaryItemsForAnchor = (anchorId: string): CommentaryItem[] =>
  props.commentaryItems.filter((item) => item.anchorId === anchorId);

const canSwitchToHebrewFor = (anchorId: string): boolean =>
  resolveAnchorAvailability({
    anchorId,
    displayedItems: props.commentaryItems,
    selectedVersionId: props.commentaryVersion,
    hebrewItems: props.hebrewItems,
    hebrewVersionId: props.hebrewVersionId,
  }).canSwitchToHebrew;

// Unlike panes mode's single global `missingAnchorNotice`, several inline
// disclosures can be open at once — switching commentary edition just
// updates the shared `commentaryItems` prop these all read from, so no
// `reactivateAnchor()`-style re-trigger is needed here: every open
// `InlineCommentary` re-renders off plain prop reactivity.
const switchToHebrew = () => {
  emit("update:commentaryVersion", props.hebrewVersionId);
};

const hasCommentaryLayer = computed(
  () => props.commentaryVersionOptions.length > 0,
);

/** Switches to panes mode and scrolls straight to its commentary column — see `ReaderShell`'s `#reader-commentary-pane`. */
const goToFullCommentary = async () => {
  setMode("panes");
  await nextTick();
  document
    .getElementById("reader-commentary-pane")
    ?.scrollIntoView({ block: "start" });
};
</script>

<template>
  <div
    ref="containerRef"
    class="mx-auto flex max-w-[65ch] flex-col px-4 py-6 sm:px-6"
  >
    <div class="mb-4 flex flex-col gap-2">
      <ReaderVersionHeader
        v-if="sourceVersionOptions.length > 1"
        :title="t('reader.pane.source')"
        :version-options="sourceVersionOptions"
        :model-value="sourceVersion"
        :meta="sourceMeta"
        @update:model-value="(value) => emit('update:sourceVersion', value)"
      />
      <ReaderVersionHeader
        v-if="commentaryVersionOptions.length > 1"
        :title="t('reader.pane.commentary')"
        :version-options="commentaryVersionOptions"
        :model-value="commentaryVersion"
        :meta="commentaryMeta"
        @update:model-value="(value) => emit('update:commentaryVersion', value)"
      />
    </div>

    <ReaderChapterIntro
      :summary-items="summaryItems"
      :source-segments="sourceSegments"
    />

    <ol
      v-if="sourceSegments.length > 0"
      class="flex flex-col gap-6"
      :dir="sourceMeta?.direction ?? 'ltr'"
      :lang="sourceMeta?.language"
    >
      <li
        v-for="segment in sourceSegments"
        :id="`seif-${segment.n}`"
        :key="segment.n"
        class="reader-anchor-target scroll-mt-24 text-[length:calc(1.125rem*var(--reading-scale))] leading-relaxed text-(--text-primary)"
      >
        <ReaderSourceSegment :segment="segment" />

        <div v-for="anchorId in segment.anchors" :key="anchorId" class="mt-3">
          <Transition
            enter-active-class="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
            leave-active-class="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
            enter-from-class="grid-rows-[0fr]"
            enter-to-class="grid-rows-[1fr]"
            leave-from-class="grid-rows-[1fr]"
            leave-to-class="grid-rows-[0fr]"
          >
            <div v-if="isExpanded(anchorId)" class="grid overflow-hidden">
              <div class="overflow-hidden">
                <ReaderInlineCommentary
                  :anchor-id="anchorId"
                  :items="commentaryItemsForAnchor(anchorId)"
                  :meta="commentaryMeta"
                  :can-switch-to-hebrew="canSwitchToHebrewFor(anchorId)"
                  @switch-to-hebrew="switchToHebrew"
                />
              </div>
            </div>
          </Transition>
        </div>
      </li>
    </ol>
    <p v-else class="text-sm text-(--text-muted)">
      {{ t("reader.sourceEmpty") }}
    </p>

    <section
      v-if="hasCommentaryLayer"
      class="mt-10 rounded-card border border-(--border) p-4 text-center"
    >
      <p class="text-sm text-(--text-muted)">
        {{ t("reader.studyMode.readFullCommentaryHint") }}
      </p>
      <button
        type="button"
        class="mt-2 rounded-button border border-teal px-3 py-1.5 text-sm font-medium text-(--accent-text) hover:bg-teal-strong hover:text-surface-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        @click="goToFullCommentary"
      >
        {{ t("reader.studyMode.readFullCommentary") }}
      </button>
    </section>

    <ReaderProgressRail />
  </div>
</template>
