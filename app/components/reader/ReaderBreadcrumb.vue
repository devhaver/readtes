<script setup lang="ts">
// The reader toolbar's breadcrumb-as-menu (T90): the same three segments
// `AppBreadcrumb` would render ("Six volumes" / "Volume N" / "Part N ·
// Chapter"), except the first two are now `ReaderBreadcrumbMenu` disclosure
// buttons over `useLocalizedVolumes()`'s already-loaded skeleton — "Six
// volumes" lists every volume, "Volume N" lists that volume's parts plus a
// link to its contents page for chapter-level browsing. The trailing
// segment stays plain text, exactly as `AppBreadcrumb` renders the current
// page. Visible labels come straight from `items` (computed once by the
// reader page) rather than being reformatted here, so the trigger text and
// the plain breadcrumb text this replaces never drift apart.
import type { BreadcrumbItem } from "~/components/app/AppBreadcrumb.vue";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

const props = defineProps<{
  items: BreadcrumbItem[];
  volumes: TocVolumeSkeleton[];
  currentVolumeId: string;
  currentPartId: string;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const volumeItems = computed(() =>
  [...props.volumes]
    .sort((a, b) => a.number - b.number)
    .map((volume) => ({
      key: volume.id,
      label: `${t("common.volume")} ${volume.number}`,
      to: localePath(`/volumes/${volumeSlug(volume)}`),
      current: volume.id === props.currentVolumeId,
    })),
);

const currentVolume = computed(() =>
  props.volumes.find((volume) => volume.id === props.currentVolumeId),
);

const partItems = computed(() =>
  [...(currentVolume.value?.parts ?? [])]
    .sort((a, b) => a.number - b.number)
    .map((part) => ({
      key: part.id,
      label: `${t("common.part")} ${part.number}`,
      to: part.firstChapterId
        ? localePath(`/read/${part.firstChapterId}`)
        : null,
      current: part.id === props.currentPartId,
    })),
);

const volumeContentsLink = computed(() =>
  currentVolume.value
    ? {
        label: t("reader.breadcrumbMenu.browseChapters"),
        to: localePath(`/volumes/${volumeSlug(currentVolume.value)}`),
      }
    : null,
);
</script>

<template>
  <nav :aria-label="t('nav.breadcrumbLabel')" class="text-sm">
    <ol class="tes-breadcrumb-list">
      <li class="tes-breadcrumb-item">
        <ReaderBreadcrumbMenu
          :trigger-label="items[0]?.label ?? t('common.sixVolumes')"
          :items="volumeItems"
        />
        <span aria-hidden="true">/</span>
      </li>
      <li v-if="items[1]" class="tes-breadcrumb-item">
        <ReaderBreadcrumbMenu
          :trigger-label="items[1].label"
          :items="partItems"
          :footer-item="volumeContentsLink"
        />
        <span aria-hidden="true">/</span>
      </li>
      <li v-if="items[2]">
        <span class="text-(--text-primary)" aria-current="page">{{
          items[2].label
        }}</span>
      </li>
    </ol>
  </nav>
</template>
