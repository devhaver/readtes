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

// Only this volume's own parts' files (2-3 per volume) — never the whole
// corpus, see AGENTS.md "Content model".
const { parts } = await useLocalizedParts(
  resolvedVolume.parts.map((part) => part.id),
);

const volumeTitle = computed(() => localizedTitle(resolvedVolume.title));

const partSections = computed(() =>
  [...resolvedVolume.parts]
    .sort((a, b) => a.number - b.number)
    .map((part) => {
      const partFile = parts.value[part.id];
      return {
        part,
        title: localizedTitle(part.title),
        hasContent: part.chapterCount > 0,
        groups: partFile ? groupChaptersByKind(partFile.chapters) : [],
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
  <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <AppBreadcrumb :items="breadcrumbItems" class="mb-6" />

    <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
      {{ volumeTitle }}
    </h1>

    <section
      v-for="section in partSections"
      :key="section.part.id"
      class="mt-10"
    >
      <h2 class="font-display text-xl text-(--text-primary)">
        {{ t("common.part") }} {{ section.part.number }} · {{ section.title }}
      </h2>

      <p v-if="!section.hasContent" class="mt-2 text-sm text-(--text-muted)">
        {{ t("volumes.partComingSoon") }}
      </p>

      <div v-else class="mt-4 flex flex-col gap-6">
        <div v-for="group in section.groups" :key="group.section">
          <h3
            class="text-sm font-medium tracking-wide text-(--text-muted) uppercase"
          >
            {{ t(`volumes.section.${group.section}`) }}
          </h3>
          <ul class="mt-2 divide-y divide-(--border)">
            <LibraryChapterRow
              v-for="entry in group.entries"
              :key="entryKey(entry)"
              :entry="entry"
              :versions="versions"
            />
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
