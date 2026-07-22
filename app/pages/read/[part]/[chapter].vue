<script setup lang="ts">
// The reader: three aligned layers (summary | source | commentary) for one
// chapter, with two-way anchor sync. Resolves the chapter from
// `content/toc.json` by route params — an unknown id 404s, the same way
// `/volumes/[volume]` does.
definePageMeta({
  layout: "reader",
  // Full remount on every param change (not just on prop update) so the
  // 404 check below always re-runs against the new ids, and so
  // `useReaderVersions`' locale-dependent defaults are recomputed fresh.
  key: (route) => route.fullPath,
});

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();

const partId = route.params.part as string;
const chapterSlug = route.params.chapter as string;
const chapterId = `${partId}/${chapterSlug}`;

const { toc, versions, localizedTitle } = await useLocalizedToc();
const entry = findChapter(toc.value, chapterId);

if (!entry) {
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
  summaryVersions,
  sourceByVersion,
  commentaryByVersion,
  summaryByVersion,
} = await useChapterContent(
  partId,
  chapterSlug,
  entry.chapter.availableVersions,
);

const readerVersions = useReaderVersions(entry.chapter, versions.value);
// Study mode below `lg`, panes at/above it by default — user overrides
// persist across chapters (`useReaderMode`). Decides which of the two
// component trees below actually mounts; `ReaderToolbar` (rendered either
// way) reads the same shared state for its mode-toggle control.
const { mode } = useReaderMode();
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
const summaryVersionOptions = computed(() =>
  versionOptions(summaryVersions.value),
);

const metaFor = (versionId: string | null) =>
  versionId ? (versionsById.value.get(versionId) ?? null) : null;

const sourceMeta = computed(() => metaFor(readerVersions.source.value));
const commentaryMeta = computed(() => metaFor(readerVersions.commentary.value));
const summaryMeta = computed(() => metaFor(readerVersions.summary.value));

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
const summaryFile = computed(() =>
  readerVersions.summary.value
    ? (summaryByVersion.value[readerVersions.summary.value] ?? null)
    : null,
);

const sourceSegments = computed(() => sourceFile.value?.items ?? []);
const commentaryItems = computed(() => commentaryFile.value?.items ?? []);
const summaryItems = computed(() => summaryFile.value?.items ?? []);

const { prev, next } = prevNextChapter(toc.value, chapterId);

const chapterTitle = computed(() => localizedTitle(entry.chapter.title));

const breadcrumbItems = computed(() => [
  { label: t("common.sixVolumes"), to: localePath("/volumes") },
  {
    label: `${t("common.volume")} ${entry.volume.number}`,
    to: localePath(`/volumes/${volumeSlug(entry.volume)}`),
  },
  {
    label: `${t("common.part")} ${entry.part.number} · ${chapterTitle.value}`,
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

useSeoMeta({
  title: () => `${chapterTitle.value} · ${t("common.siteName")}`,
});
</script>

<template>
  <div class="contents">
    <ReaderShell v-if="mode === 'panes'">
      <template #toolbar>
        <ReaderToolbar
          :breadcrumb-items="breadcrumbItems"
          :prev="prev"
          :next="next"
        />
      </template>

      <template #summary>
        <ReaderPane
          :title="t('reader.pane.summary')"
          :version-options="summaryVersionOptions"
          :model-value="readerVersions.summary.value"
          :meta="summaryMeta"
          @update:model-value="(id) => readerVersions.setVersion('summary', id)"
        >
          <ReaderSummaryPane
            :summary-items="summaryItems"
            :source-segments="sourceSegments"
          />
        </ReaderPane>
      </template>

      <template #source>
        <ReaderPane
          :title="t('reader.pane.source')"
          :version-options="sourceVersionOptions"
          :model-value="readerVersions.source.value"
          :meta="sourceMeta"
          @update:model-value="(id) => readerVersions.setVersion('source', id)"
        >
          <ReaderSourcePane :segments="sourceSegments" />
        </ReaderPane>
      </template>

      <template #commentary>
        <ReaderPane
          :title="t('reader.pane.commentary')"
          :version-options="commentaryVersionOptions"
          :model-value="readerVersions.commentary.value"
          :meta="commentaryMeta"
          @update:model-value="
            (id) => readerVersions.setVersion('commentary', id)
          "
        >
          <template v-if="missingAnchorNotice" #toast>
            <p class="basis-full text-xs text-orange-cta">
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
    </ReaderShell>

    <template v-else>
      <ReaderToolbar
        :breadcrumb-items="breadcrumbItems"
        :prev="prev"
        :next="next"
      />
      <ReaderStudyStream
        :source-segments="sourceSegments"
        :commentary-items="commentaryItems"
        :summary-items="summaryItems"
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
  </div>
</template>
