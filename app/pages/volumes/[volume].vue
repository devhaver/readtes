<script setup lang="ts">
// Contents of one volume: parts as sections, chapters as rows grouped by
// kind (see `~/utils/chapterGrouping`) — the 100+ tiny answers-list
// chapters a part can have are collapsed into a couple of cluster rows
// rather than exploded, see AGENTS.md "Content model".

// Force a full remount on every param change (rather than reusing this
// instance across sibling `/volumes/[volume]` navigations) so the 404
// check below always re-runs against the new slug.
definePageMeta({
  key: (route) => route.fullPath,
});

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();

const { volumes, versions, localizedTitle } = await useLocalizedVolumes();

const slug = route.params.volume as string;
const resolvedVolume = findVolumeBySlug(volumes.value, slug);

if (!resolvedVolume) {
  throw createError({
    statusCode: 404,
    statusMessage: `Unknown volume "${slug}"`,
    fatal: true,
  });
}

// Only this volume's own parts' files (2-4 per volume in the Bnei Baruch
// grouping) — never the whole corpus, see AGENTS.md "Content model".
const { parts } = await useLocalizedParts(
  resolvedVolume.parts.map((part) => part.id),
);

const volumeTitle = computed(() => localizedTitle(resolvedVolume.title));

/** Kinds whose titles are just "<Kind> N" — shown as a dense number grid once there are enough of them. */
const GRID_KINDS = new Set(["chapter", "inner-observation"]);
const GRID_MIN_ENTRIES = 6;

const partSections = computed(() =>
  [...resolvedVolume.parts]
    .sort((a, b) => a.number - b.number)
    .map((part) => {
      const partFile = parts.value[part.id];
      const groups = partFile ? groupChaptersByKind(partFile.chapters) : [];
      const representatives = groups.flatMap((group) =>
        group.entries.map((entry) =>
          entry.type === "chapter" ? entry.chapter : entry.firstChapter,
        ),
      );
      return {
        part,
        title: localizedTitle(part.title),
        hasContent: part.chapterCount > 0,
        // One statement per part when every chapter is AI-only English,
        // rather than the same badge on every row.
        aiOnly:
          representatives.length > 0 &&
          representatives.every(
            (chapter) => chapterLanguages(chapter, versions.value).aiTranslated,
          ),
        groups: groups.map((group) => ({
          ...group,
          dense:
            group.entries.length >= GRID_MIN_ENTRIES &&
            group.entries.every(
              (entry) =>
                entry.type === "chapter" && GRID_KINDS.has(entry.chapter.kind),
            ),
        })),
      };
    }),
);

const entryKey = (entry: ChapterGroupEntry): string =>
  entry.type === "chapter" ? entry.chapter.id : entry.kind;

const breadcrumbItems = computed(() => [
  { label: t("common.siteName"), to: localePath("/") },
  { label: t("volumes.indexTitle"), to: localePath("/volumes") },
  { label: volumeTitle.value },
]);

useLocalizedSeo({
  title: () => `${volumeTitle.value} · ${t("common.siteName")}`,
  description: () => t("seo.volume.description", { title: volumeTitle.value }),
});
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <AppBreadcrumb :items="breadcrumbItems" class="mb-6" />

    <h1
      id="volume-top"
      class="scroll-mt-4 font-display text-3xl text-(--text-primary) sm:text-4xl"
    >
      {{ volumeTitle }}
    </h1>

    <!-- A volume can run to hundreds of rows: the part index stays in reach,
         and each part ends with a way back up. -->
    <nav
      v-if="partSections.length > 1"
      :aria-label="t('volumes.partIndexLabel')"
      class="sticky top-0 z-20 -mx-4 mt-6 flex flex-wrap gap-2 border-b border-(--border) bg-(--surface)/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6"
    >
      <NuxtLink
        v-for="section in partSections"
        :key="section.part.id"
        :to="{ hash: `#${section.part.id}` }"
        class="rounded-button border border-(--border) px-2.5 py-1 text-sm text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
      >
        {{ t("common.part") }} {{ section.part.number }}
      </NuxtLink>
    </nav>

    <section
      v-for="section in partSections"
      :id="section.part.id"
      :key="section.part.id"
      class="mt-10 scroll-mt-16"
    >
      <h2 class="font-display text-xl text-(--text-primary)">
        {{ t("common.part") }} {{ section.part.number }} · {{ section.title }}
      </h2>
      <p v-if="section.aiOnly" class="mt-2 text-sm text-(--warning-text)">
        {{ t("volumes.aiPartNote") }}
      </p>

      <p v-if="!section.hasContent" class="mt-2 text-sm text-(--text-muted)">
        {{ t("volumes.partComingSoon") }}
      </p>

      <div v-else class="mt-4 flex flex-col gap-6">
        <div v-for="group in section.groups" :key="group.section">
          <h3 class="font-semibold text-sm text-(--text-muted)">
            {{ t(`volumes.section.${group.section}`) }}
          </h3>
          <ul
            v-if="group.dense"
            class="mt-2 grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5"
          >
            <li v-for="entry in group.entries" :key="entryKey(entry)">
              <NuxtLink
                v-if="entry.type === 'chapter'"
                :to="localePath(`/read/${entry.chapter.id}`)"
                :aria-label="localizedTitle(entry.chapter.title)"
                :title="localizedTitle(entry.chapter.title)"
                class="block rounded-button border border-(--border) py-2 text-center text-sm tabular-nums text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
              >
                {{ entry.chapter.number }}
              </NuxtLink>
            </li>
          </ul>
          <ul v-else class="mt-2 divide-y divide-(--border)">
            <LibraryChapterRow
              v-for="entry in group.entries"
              :key="entryKey(entry)"
              :entry="entry"
              :versions="versions"
              :show-ai-badge="!section.aiOnly"
            />
          </ul>
        </div>
      </div>

      <p v-if="section.hasContent" class="mt-6 text-sm">
        <NuxtLink
          :to="{ hash: '#volume-top' }"
          class="rounded-button text-(--accent-text) underline underline-offset-2 hover:text-(--text-primary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
        >
          {{ t("volumes.backToTop") }}
        </NuxtLink>
      </p>
    </section>
  </div>
</template>
