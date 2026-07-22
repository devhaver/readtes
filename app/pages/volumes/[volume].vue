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

const { toc, versions, localizedTitle } = await useLocalizedToc();

const slug = route.params.volume as string;
const resolvedVolume = findVolumeBySlug(toc.value, slug);

if (!resolvedVolume) {
  throw createError({
    statusCode: 404,
    statusMessage: `Unknown volume "${slug}"`,
    fatal: true,
  });
}

const volumeTitle = computed(() => localizedTitle(resolvedVolume.title));

const partSections = computed(() =>
  [...resolvedVolume.parts]
    .sort((a, b) => a.number - b.number)
    .map((part) => ({
      part,
      title: localizedTitle(part.title),
      hasContent: part.chapters.length > 0,
      groups: groupChaptersByKind(part.chapters),
    })),
);

const entryKey = (entry: ChapterGroupEntry): string =>
  entry.type === "chapter" ? entry.chapter.id : entry.kind;

const breadcrumbItems = computed(() => [
  { label: t("common.siteName"), to: localePath("/") },
  { label: t("volumes.indexTitle"), to: localePath("/volumes") },
  { label: volumeTitle.value },
]);

useHead(() => ({
  title: `${volumeTitle.value} · ${t("common.siteName")}`,
}));
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
