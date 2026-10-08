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
  <nav :aria-label="t('nav.breadcrumbLabel')" class="min-w-0 text-sm">
    <!-- Below `md` only the current chapter shows: the volume and part
         menus wrapped the toolbar onto five lines of a phone screen, and the
         contents button beside it reaches the same places. -->
    <ol class="tes-breadcrumb-list min-w-0 !flex-nowrap">
      <!-- `hidden` on a wrapper, not on the `tes-breadcrumb-item` itself:
           that class is unlayered CSS and its `display: flex` beat the
           `hidden` utility. -->
      <li class="hidden shrink-0 md:block">
        <span class="tes-breadcrumb-item">
          <ReaderBreadcrumbMenu
            :trigger-label="items[0]?.label ?? t('common.sixVolumes')"
            :items="volumeItems"
          />
          <span aria-hidden="true">/</span>
        </span>
      </li>
      <li v-if="items[1]" class="hidden shrink-0 md:block">
        <span class="tes-breadcrumb-item">
          <ReaderBreadcrumbMenu
            :trigger-label="items[1].label"
            :items="partItems"
            :footer-item="volumeContentsLink"
          />
          <span aria-hidden="true">/</span>
        </span>
      </li>
      <li v-if="items[2]" class="min-w-0">
        <span
          class="block truncate text-(--text-primary)"
          aria-current="page"
          >{{ items[2].label }}</span
        >
      </li>
    </ol>
  </nav>
</template>
