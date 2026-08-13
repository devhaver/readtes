<script setup lang="ts">
// The signature mobile reading experience (T8): source segments flow as a
// single reading stream — commentary comes to the reader inline instead of
// living in a separate pane the reader has to juggle. Default mode below
// the `lg` breakpoint (`useReaderMode`); reuses the exact same language
// selection (`ReaderPaneHeader`), seif rendering (`ReaderSourceSegment`)
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
  sourceLanguageOptions: string[];
  commentaryLanguageOptions: string[];
  sourceLanguage: string | null;
  commentaryLanguage: string | null;
  /** The resolved commentary version id — for the "not in this language" notice. */
  commentaryVersionId: string | null;
  /** The chapter's `he-jerusalem-1956` commentary items, if it has that version — for the inline "switch to Hebrew" notice. */
  hebrewItems: CommentaryItem[] | null;
  hebrewVersionId: string;
}>();

const emit = defineEmits<{
  "update:sourceLanguage": [value: string];
  "update:commentaryLanguage": [value: string];
}>();

const { t, locale } = useI18n();
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

// Keys off ANCHORED items only, by construction: `anchorId` here always
// comes from a source segment's own `anchors[]` (below), and
// `validate-content.ts` requires every entry there to resolve to an
// anchored commentary item (issue #79) — an unanchored item's `op-<order>`
// id is never a source segment's anchor, so it can never surface through
// this inline-disclosure path.
const commentaryItemsForAnchor = (anchorId: string): CommentaryItem[] =>
  props.commentaryItems.filter((item) => item.anchorId === anchorId);

// Commentary that has no seif to unfold inline under (issue #79: known
// chapter, unknown seif) still needs to be reachable in study mode — it
// gets its own titled, collapsed-by-default section after the source
// stream instead (mobile screen economy: a reader who never opens it never
// pays for it). Grouped by section the same way `CommentaryPane` groups the
// full pane, so a chapter with unanchored items in both Ohr Pnimi and
// Histaklut Pnimit still gets a labelled heading for each.
const unanchoredGroups = computed(() =>
  groupCommentaryBySection(unanchoredCommentaryItems(props.commentaryItems)),
);
const hasUnanchoredCommentary = computed(
  () => unanchoredGroups.value.length > 0,
);

const canSwitchToHebrewFor = (anchorId: string): boolean =>
  resolveAnchorAvailability({
    anchorId,
    displayedItems: props.commentaryItems,
    selectedVersionId: props.commentaryVersionId,
    hebrewItems: props.hebrewItems,
    hebrewVersionId: props.hebrewVersionId,
  }).canSwitchToHebrew;

// Unlike panes mode's single global `missingAnchorNotice`, several inline
// disclosures can be open at once — switching commentary language just
// updates the shared `commentaryItems` prop these all read from, so no
// `reactivateAnchor()`-style re-trigger is needed here: every open
// `InlineCommentary` re-renders off plain prop reactivity.
const switchToHebrew = () => {
  emit("update:commentaryLanguage", "he");
};

const hasCommentaryLayer = computed(
  () => props.commentaryLanguageOptions.length > 0,
);

// The marker each anchor is printed with in the source text these
// disclosures unfold beneath — see `anchorMarkersFromSegments` (issue #96).
// Study mode puts note and marker within a line of each other, so a
// disagreement between them is unmissable here.
const anchorMarkers = computed(() =>
  anchorMarkersFromSegments(props.sourceSegments),
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
      <!--
        Rendered on layer EXISTENCE, never on how many languages the layer
        offers. `ReaderPaneHeader` hides its own `<select>` at one language,
        but it also carries the provenance badge — and "AI translated" is
        the project's one mandatory label. Gating the whole header on
        `languageOptions.length > 1` would take the badge down with the
        switcher the moment a layer is single-language (an English-only
        chapter, which issues #79/#87 will create).
      -->
      <ReaderPaneHeader
        :title="t('reader.pane.source')"
        :language-options="sourceLanguageOptions"
        :model-value="sourceLanguage"
        :meta="sourceMeta"
        @update:model-value="(value) => emit('update:sourceLanguage', value)"
      />
      <ReaderPaneHeader
        v-if="hasCommentaryLayer"
        :title="t('reader.pane.innerLight')"
        :language-options="commentaryLanguageOptions"
        :model-value="commentaryLanguage"
        :meta="commentaryMeta"
        @update:model-value="
          (value) => emit('update:commentaryLanguage', value)
        "
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
        v-for="(segment, index) in sourceSegments"
        :id="
          isContinuationSegment(sourceSegments, index)
            ? undefined
            : `seif-${segment.n}`
        "
        :key="sourceSegmentKey(segment, index)"
        class="reader-anchor-target tes-seif-lg scroll-mt-24"
      >
        <ReaderSourceSegment
          :segment="segment"
          :continuation="isContinuationSegment(sourceSegments, index)"
        />

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
                  :anchor-markers="anchorMarkers"
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

    <details
      v-if="hasUnanchoredCommentary"
      class="group mt-6 rounded-card border border-(--border) bg-(--surface-reading)"
    >
      <summary class="tes-disclosure-summary">
        <span class="tes-eyebrow">
          {{ t("reader.studyMode.unalignedCommentaryTitle") }}
        </span>
        <span
          aria-hidden="true"
          class="tes-icon tes-icon-chevron-down tes-disclosure-chevron h-4 w-4"
        />
      </summary>

      <div class="flex flex-col gap-6 px-4 pb-4">
        <p class="text-sm text-(--text-muted)">
          {{ t("reader.commentaryNotAligned") }}
        </p>

        <section
          v-for="group in unanchoredGroups"
          :key="group.section"
          class="flex flex-col gap-4"
        >
          <h3
            class="font-display text-xs tracking-wide text-(--text-muted) uppercase"
          >
            {{ t(`reader.commentarySection.${group.section}`) }}
          </h3>

          <!-- The items carry the commentary VERSION's language (Hebrew for
               he-jerusalem-1956), not the UI locale's — without dir/lang the
               Hebrew text would lay out LTR inside an English UI. -->
          <ol
            class="flex flex-col gap-4"
            :dir="commentaryMeta?.direction ?? 'ltr'"
            :lang="commentaryMeta?.language"
          >
            <li
              v-for="item in group.items"
              :key="item.anchorId"
              class="tes-seif-md"
            >
              <span class="me-1.5 text-xs font-semibold text-(--accent-text)">
                {{ localizedText(item.label, locale) }}
              </span>
              <span v-html="item.html" />
            </li>
          </ol>
        </section>
      </div>
    </details>

    <ReaderLayerAbsenceNote v-if="!hasCommentaryLayer" />

    <section
      v-else
      class="mt-10 rounded-card border border-(--border) p-4 text-center"
    >
      <p class="text-sm text-(--text-muted)">
        {{ t("reader.studyMode.readFullCommentaryHint") }}
      </p>
      <button
        type="button"
        class="tes-focus-ring mt-2 rounded-button border border-teal px-3 py-1.5 text-sm font-medium text-(--accent-text) hover:bg-teal-strong hover:text-surface-white"
        @click="goToFullCommentary"
      >
        {{ t("reader.studyMode.readFullCommentary") }}
      </button>
    </section>

    <ReaderProgressRail />
  </div>
</template>
