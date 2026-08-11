<script setup lang="ts">
// The reader: Source | Inner Light | Inner Observation for one chapter (two
// panes when the part has no Inner Observation — see below), with two-way
// anchor sync between Source and Inner Light. Inner Observation is
// part-scoped and never anchor-synced — see `useInnerObservationContent`.
// Resolves the chapter from its part's `content/toc.parts/<partId>.json` by
// route params — an unknown part or chapter 404s, the same way
// `/volumes/[volume]` does.
definePageMeta({
  layout: "reader",
  // Full remount on every param change (not just on prop update) so the
  // 404 check below always re-runs against the new ids, and so
  // `useReaderLanguages`' locale-dependent defaults are recomputed fresh.
  key: (route) => route.fullPath,
});

const route = useRoute();
const { t, locale } = useI18n();
const localePath = useLocalePath();

const partId = route.params.part as string;
const chapterSlug = route.params.chapter as string;
const chapterId = `${partId}/${chapterSlug}`;

const { volumes, versions, localizedTitle } = await useLocalizedVolumes();
const { parts } = await useLocalizedParts([partId]);
const partFile = parts.value[partId];

if (!partFile) {
  throw createError({
    statusCode: 404,
    statusMessage: `Unknown part "${partId}"`,
    fatal: true,
  });
}

const chapter = findChapterInPart(partFile, chapterId);

if (!chapter) {
  throw createError({
    statusCode: 404,
    statusMessage: `Unknown chapter "${chapterId}"`,
    fatal: true,
  });
}

const HEBREW_VERSION_ID = "he-jerusalem-1956";

const {
  sourceVersions,
  commentaryVersions,
  sourceByVersion,
  commentaryByVersion,
} = await useChapterContent(partId, chapterSlug, chapter.availableVersions);

// Static per chapter (from the ToC's `availableVersions`, identical on
// server and client, so no hydration divergence): whether an Inner Light
// pane exists at all. ~99.5% of chapters have no commentary in any edition
// — see `resolveReaderPanes` — and those get no pane, just the
// `LayerAbsenceNote` footnote in the Source pane.
const hasCommentary = chapter.availableVersions.commentary.length > 0;

// Inner Observation isn't a per-chapter layer file — it lives in the part's
// own `kind: "inner-observation"` chapters (see AGENTS.md / the content
// model skill), so it's loaded once per part rather than per chapter, and
// is identical no matter which chapter of the part is open. Five parts have
// none at all — `hasInnerObservation` drives the two-vs-three-pane layout.
const innerObservationChapters = innerObservationChaptersInPart(
  partFile.chapters,
);
const hasInnerObservation = innerObservationChapters.length > 0;
const panes = resolveReaderPanes({ hasCommentary, hasInnerObservation });
const {
  versions: innerObservationVersionIds,
  sections: innerObservationRawSections,
} = await useInnerObservationContent(partId, innerObservationChapters);

const readerLanguages = useReaderLanguages(chapter, versions.value);
// Study mode below `lg`, panes at/above it by default — original is an
// explicit user override only, never viewport-resolved (`useReaderMode`).
// User overrides persist across chapters. Decides which of the three
// component trees below actually mounts; `ReaderToolbar` (rendered in every
// mode) reads the same shared state for its mode-toggle control.
const { mode } = useReaderMode();
const versionsById = computed(() => buildVersionsById(versions.value));

const sourceLanguageOptions = computed(() =>
  languagesAvailable(sourceVersions.value, versionsById.value),
);
const commentaryLanguageOptions = computed(() =>
  languagesAvailable(commentaryVersions.value, versionsById.value),
);
const innerObservationLanguageOptions = computed(() =>
  languagesAvailable(innerObservationVersionIds.value, versionsById.value),
);

const metaFor = (versionId: string | null) =>
  versionId ? (versionsById.value.get(versionId) ?? null) : null;

const sourceMeta = computed(() => metaFor(readerLanguages.sourceVersion.value));
const commentaryMeta = computed(() =>
  metaFor(readerLanguages.commentaryVersion.value),
);

const sourceFile = computed(() =>
  readerLanguages.sourceVersion.value
    ? (sourceByVersion.value[readerLanguages.sourceVersion.value] ?? null)
    : null,
);
const commentaryFile = computed(() =>
  readerLanguages.commentaryVersion.value
    ? (commentaryByVersion.value[readerLanguages.commentaryVersion.value] ??
      null)
    : null,
);

const sourceSegments = computed(() => sourceFile.value?.items ?? []);
const commentaryItems = computed(() => commentaryFile.value?.items ?? []);

// Inner Observation has no persisted language preference of its own
// (unlike source/commentary via `useReaderLanguages`) — there's exactly
// one pane for it, so nothing needs remembering across chapters; it just
// follows the same default rule, recomputed whenever the part's available
// versions load.
const innerObservationLanguage = ref<string | null>(null);
watch(
  innerObservationVersionIds,
  (ids) => {
    if (
      innerObservationLanguage.value &&
      resolveVersionForLanguage(
        ids,
        innerObservationLanguage.value,
        versionsById.value,
      )
    ) {
      return;
    }
    innerObservationLanguage.value = resolveDefaultLanguage(
      ids,
      locale.value,
      versionsById.value,
    );
  },
  { immediate: true },
);

const innerObservationVersion = computed(() =>
  innerObservationLanguage.value
    ? resolveVersionForLanguage(
        innerObservationVersionIds.value,
        innerObservationLanguage.value,
        versionsById.value,
      )
    : null,
);

const innerObservationMeta = computed(() =>
  metaFor(innerObservationVersion.value),
);
const innerObservationSections = computed(() =>
  innerObservationRawSections.value
    .map((section) => ({
      chapterId: section.chapterId,
      title: section.title,
      items: innerObservationVersion.value
        ? (section.itemsByVersion[innerObservationVersion.value]?.items ?? [])
        : [],
    }))
    // A section whose *selected* version has no items would render as a
    // bare heading with nothing under it — drop it; the sections that do
    // have text in this version carry the pane. (If none do, the pane
    // falls back to `innerObservationEmpty`.)
    .filter((section) => section.items.length > 0),
);

const { prev, next } = prevNextChapterLinks(volumes.value, partFile, chapterId);

// Original mode's own Prev/Next pagination, scoped to this part's ToC order
// (distinct from `prev`/`next` above, which cross part/volume boundaries) —
// see `partPaginationPosition` for the `KIND_ORDER` caveat this inherits.
const originalPagination = partPaginationPosition(partFile.chapters, chapterId);

const chapterTitle = computed(() => localizedTitle(chapter.title));

const breadcrumbItems = computed(() => [
  { label: t("common.sixVolumes"), to: localePath("/volumes") },
  {
    label: `${t("common.volume")} ${partFile.volume.number}`,
    to: localePath(`/volumes/${volumeSlug(partFile.volume)}`),
  },
  {
    label: `${t("common.part")} ${partFile.part.number} · ${chapterTitle.value}`,
  },
]);

// "Not available in this edition" toast for the commentary pane: a source
// anchor was activated, but the commentary version currently shown has
// nothing for it.
const { activeAnchor, anchorOrigin, reactivateAnchor } = useReaderState();

const missingAnchorNotice = computed(() =>
  resolveMissingAnchorNotice({
    activeAnchor: activeAnchor.value,
    anchorOrigin: anchorOrigin.value,
    displayedItems: commentaryItems.value,
    selectedVersionId: readerLanguages.commentaryVersion.value,
    hebrewItems: commentaryByVersion.value[HEBREW_VERSION_ID]?.items ?? null,
    hebrewVersionId: HEBREW_VERSION_ID,
  }),
);

// Switching languages doesn't change `activeAnchor`/`anchorOrigin` (the
// anchor being looked for is the same one), so `useHighlightedAnchor`'s
// change-based watch wouldn't otherwise re-fire once the Hebrew commentary
// item — previously absent — renders. `reactivateAnchor` bumps the shared
// activation sequence so the commentary pane re-runs its scroll/highlight
// against the newly-rendered item.
const switchCommentaryToHebrew = () => {
  readerLanguages.setLanguage("commentary", "he");
  reactivateAnchor();
};

// `CommentarySheet` (T9): tapping a source paragraph (not one of its own
// anchors — `SourcePane`'s `useSeifTapActivation`) opens a sheet listing
// that seif's commentary items. `useCommentarySheet` owns the open/closed
// state (and its own "only in mobile panes swipe mode" gate) — shared so
// `MobilePanePill` can hide itself while the sheet is up.
const {
  openSeif: commentarySheetSeif,
  open: openCommentarySheet,
  close: closeCommentarySheet,
} = useCommentarySheet();

const commentarySheetItems = computed(() =>
  commentarySheetSeif.value === null
    ? []
    : commentaryItemsForSeif(commentaryItems.value, commentarySheetSeif.value),
);

const partTitle = computed(() => localizedTitle(partFile.part.title));

useLocalizedSeo({
  title: () => `${chapterTitle.value} · ${t("common.siteName")}`,
  description: () =>
    t("seo.chapter.description", {
      chapter: chapterTitle.value,
      part: partTitle.value,
    }),
  type: "article",
});
</script>

<template>
  <div class="contents">
    <ReaderShell v-if="mode === 'panes'" :panes="panes">
      <template #toolbar>
        <ReaderToolbar
          :chapter-title="chapterTitle"
          :breadcrumb-items="breadcrumbItems"
          :prev="prev"
          :next="next"
        />
      </template>

      <template #source>
        <ReaderPane
          :title="t('reader.pane.source')"
          :language-options="sourceLanguageOptions"
          :model-value="readerLanguages.source.value"
          :meta="sourceMeta"
          @update:model-value="
            (language) => readerLanguages.setLanguage('source', language)
          "
        >
          <ReaderSourcePane
            :segments="sourceSegments"
            @open-seif-commentary="openCommentarySheet"
          >
            <template v-if="!hasCommentary" #footnote>
              <ReaderLayerAbsenceNote />
            </template>
          </ReaderSourcePane>
        </ReaderPane>
      </template>

      <template v-if="hasCommentary" #commentary>
        <ReaderPane
          :title="t('reader.pane.innerLight')"
          :language-options="commentaryLanguageOptions"
          :model-value="readerLanguages.commentary.value"
          :meta="commentaryMeta"
          @update:model-value="
            (language) => readerLanguages.setLanguage('commentary', language)
          "
        >
          <template v-if="missingAnchorNotice" #toast>
            <p class="basis-full text-xs text-(--warning-text)">
              {{ t("reader.missingAnchor.message") }}
              <button
                v-if="missingAnchorNotice.canSwitchToHebrew"
                type="button"
                class="ms-1 underline"
                @click="switchCommentaryToHebrew"
              >
                {{ t("reader.missingAnchor.switchToHebrew") }}
              </button>
            </p>
          </template>
          <ReaderCommentaryPane :items="commentaryItems" />
        </ReaderPane>
      </template>

      <template v-if="hasInnerObservation" #inner-observation>
        <ReaderPane
          :title="t('reader.pane.innerObservation')"
          :language-options="innerObservationLanguageOptions"
          :model-value="innerObservationLanguage"
          :meta="innerObservationMeta"
          @update:model-value="
            (language) => (innerObservationLanguage = language)
          "
        >
          <ReaderInnerObservationPane :sections="innerObservationSections" />
        </ReaderPane>
      </template>
    </ReaderShell>

    <template v-else-if="mode === 'study'">
      <ReaderToolbar
        :chapter-title="chapterTitle"
        :breadcrumb-items="breadcrumbItems"
        :prev="prev"
        :next="next"
      />
      <ReaderStudyStream
        :source-segments="sourceSegments"
        :commentary-items="commentaryItems"
        :summary-items="[]"
        :source-meta="sourceMeta"
        :commentary-meta="commentaryMeta"
        :source-language-options="sourceLanguageOptions"
        :commentary-language-options="commentaryLanguageOptions"
        :source-language="readerLanguages.source.value"
        :commentary-language="readerLanguages.commentary.value"
        :commentary-version-id="readerLanguages.commentaryVersion.value"
        :hebrew-items="commentaryByVersion[HEBREW_VERSION_ID]?.items ?? null"
        :hebrew-version-id="HEBREW_VERSION_ID"
        @update:source-language="
          (language: string) => readerLanguages.setLanguage('source', language)
        "
        @update:commentary-language="
          (language: string) =>
            readerLanguages.setLanguage('commentary', language)
        "
      />
    </template>

    <template v-else>
      <ReaderToolbar
        :chapter-title="chapterTitle"
        :breadcrumb-items="breadcrumbItems"
        :prev="prev"
        :next="next"
      />
      <ReaderOriginalStream
        :source-segments="sourceSegments"
        :commentary-items="commentaryItems"
        :source-meta="sourceMeta"
        :commentary-meta="commentaryMeta"
        :pagination="originalPagination"
      />
    </template>

    <ReaderCommentarySheet
      :open="commentarySheetSeif !== null"
      :seif="commentarySheetSeif"
      :items="commentarySheetItems"
      @close="closeCommentarySheet"
    />
  </div>
</template>
