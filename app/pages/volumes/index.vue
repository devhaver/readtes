<script setup lang="ts">
// The six volumes, shelf-style — Volume 1 is the only one with content so
// far (see `volumeHasContent` in `~/utils/toc`), the rest render disabled
// with a "coming soon" label until later import tasks populate them.

const { t } = useI18n();
const localePath = useLocalePath();

const { toc, versions } = await useLocalizedToc();

const sortedVolumes = computed(() =>
  [...toc.value.volumes].sort((a, b) => a.number - b.number),
);

const breadcrumbItems = computed(() => [
  { label: t("common.siteName"), to: localePath("/") },
  { label: t("volumes.indexTitle") },
]);

useHead(() => ({
  title: `${t("volumes.indexTitle")} · ${t("common.siteName")}`,
}));
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <AppBreadcrumb :items="breadcrumbItems" class="mb-6" />

    <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
      {{ t("volumes.indexTitle") }}
    </h1>
    <p class="mt-3 max-w-prose text-(--text-muted)">
      {{ t("volumes.indexDescription") }}
    </p>

    <ol class="mt-8 flex flex-col gap-4">
      <li v-for="volume in sortedVolumes" :key="volume.id">
        <LibraryVolumeCard :volume="volume" :versions="versions" />
      </li>
    </ol>
  </div>
</template>
