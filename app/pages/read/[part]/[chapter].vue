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
  // `useReaderVersions`' locale-dependent defaults are recomputed fresh.
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

const readerVersions = useReaderVersions(chapter, versions.value);
// Study mode below `lg`, panes at/above it by default — original is an
// explicit user override only, never viewport-resolved (`useReaderMode`).
// User overrides persist across chapters. Decides which of the three
// component trees below actually mounts; `ReaderToolbar` (rendered in every
// mode) reads the same shared state for its mode-toggle control.
const { mode } = useReaderMode();

// Deliberately not awaited and deliberately not server-rendered: the bodies
// load in the browser, from the part's own content chunks, once per part
// rather than being inlined into every chapter page's HTML — see
// `useInnerObservationContent`. Only `versions` (ToC-derived, so identical
// on both sides of hydration) is available during prerendering.
//
// Must stay *below* `useReaderMode()` above: the gate reads `mode`, which
// only resolves to the real viewport in `useReaderMode`'s own `onMounted`,
// and mounted hooks fire in registration order. Panes mode is the only one
// of the three that renders an Inner Observation pane at all, so on a phone
// (study by default) this is the difference between fetching the part's
// whole essay set and fetching none of it.
const {
  versions: innerObservationVersions,
  sections: innerObservationRawSections,
  state: innerObservationState,
} = useInnerObservationContent(
  partId,
  innerObservationChapters,
  () => mode.value === "panes",
);
const versionsById = computed(() => buildVersionsById(versions.value));

const versionOptions = (ids: string[]) =>
  ids.map((id) => ({
    id,
    label: versionsById.value.get(id)?.title ?? id,
  }));

const sourceVersionOptions = computed(() =>
  versionOptions(sourceVersions.value),
);
const commentaryVersionOptions = computed(() =>
  versionOptions(commentaryVersions.value),
);
const innerObservationVersionOptions = computed(() =>
  versionOptions(innerObservationVersions.value),
);

const metaFor = (versionId: string | null) =>
  versionId ? (versionsById.value.get(versionId) ?? null) : null;

const sourceMeta = computed(() => metaFor(readerVersions.source.value));
const commentaryMeta = computed(() => metaFor(readerVersions.commentary.value));

const sourceFile = computed(() =>
  readerVersions.source.value
    ? (sourceByVersion.value[readerVersions.source.value] ?? null)
    : null,
);
const commentaryFile = computed(() =>
  readerVersions.commentary.value
    ? (commentaryByVersion.value[readerVersions.commentary.value] ?? null)
    : null,
);

const sourceSegments = computed(() => sourceFile.value?.items ?? []);
const commentaryItems = computed(() => commentaryFile.value?.items ?? []);

// Inner Observation has no persisted version preference of its own (unlike
// source/commentary via `useReaderVersions`) — there's exactly one pane for
// it, so nothing needs remembering across chapters; it just follows the
// same locale-aware default rule, recomputed whenever the part's available
// versions load.
const innerObservationVersion = ref<string | null>(null);
watch(
  innerObservationVersions,
  (ids) => {
    if (
      innerObservationVersion.value &&
      ids.includes(innerObservationVersion.value)
    ) {
      return;
    }
    innerObservationVersion.value = resolveDefaultVersion(
      ids,
      locale.value,
      versionsById.value,
    );
  },
  { immediate: true },
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
    selectedVersionId: readerVersions.commentary.value,
    hebrewItems: commentaryByVersion.value[HEBREW_VERSION_ID]?.items ?? null,
    hebrewVersionId: HEBREW_VERSION_ID,
  }),
);

// Switching versions doesn't change `activeAnchor`/`anchorOrigin` (the
// anchor being looked for is the same one), so `useHighlightedAnchor`'s
// change-based watch wouldn't otherwise re-fire once the Hebrew commentary
// item — previously absent — renders. `reactivateAnchor` bumps the shared
// activation sequence so the commentary pane re-runs its scroll/highlight
// against the newly-rendered item.
const switchCommentaryToHebrew = () => {
  readerVersions.setVersion("commentary", HEBREW_VERSION_ID);
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
          :version-options="sourceVersionOptions"
          :model-value="readerVersions.source.value"
          :meta="sourceMeta"
          @update:model-value="(id) => readerVersions.setVersion('source', id)"
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
          :version-options="commentaryVersionOptions"
          :model-value="readerVersions.commentary.value"
          :meta="commentaryMeta"
          @update:model-value="
            (id) => readerVersions.setVersion('commentary', id)
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
          :version-options="innerObservationVersionOptions"
          :model-value="innerObservationVersion"
          :meta="innerObservationMeta"
          @update:model-value="(id) => (innerObservationVersion = id)"
        >
          <ReaderInnerObservationPane
            :sections="innerObservationSections"
            :state="innerObservationState"
            @reload="reloadNuxtApp({ force: true })"
          />
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
        :source-version-options="sourceVersionOptions"
        :commentary-version-options="commentaryVersionOptions"
        :source-version="readerVersions.source.value"
        :commentary-version="readerVersions.commentary.value"
        :hebrew-items="commentaryByVersion[HEBREW_VERSION_ID]?.items ?? null"
        :hebrew-version-id="HEBREW_VERSION_ID"
        @update:source-version="
          (id: string) => readerVersions.setVersion('source', id)
        "
        @update:commentary-version="
          (id: string) => readerVersions.setVersion('commentary', id)
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
