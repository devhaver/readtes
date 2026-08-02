<script setup lang="ts">
// Original mode's Prev/Next pagination — reproduces KabbalahMedia's own
// pager exactly ("◀ Prev. | 1297/2096 | Next ▶"), through the current
// part's ToC order (`partPaginationPosition`, `~/utils/toc`). Rendered
// above and below `OriginalStream`'s content, since a book-like single
// column benefits from wayfinding at both ends of a long chapter.
import type { TocChapter } from "~~/shared/types/content";

defineProps<{
  index: number;
  total: number;
  prev: TocChapter | null;
  next: TocChapter | null;
}>();

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <nav
    :aria-label="t('reader.original.pagination')"
    class="flex items-center justify-between gap-3 border-y border-(--border) py-3 text-sm text-(--text-primary)"
  >
    <NuxtLink
      v-if="prev"
      :to="localePath(`/read/${prev.id}`)"
      class="rounded-button px-2 py-1 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    >
      <span aria-hidden="true" class="rtl:rotate-180">&#9664;</span>
      {{ t("reader.original.prev") }}
    </NuxtLink>
    <span
      v-else
      aria-disabled="true"
      class="px-2 py-1 text-(--text-muted) opacity-50"
    >
      <span aria-hidden="true" class="rtl:rotate-180">&#9664;</span>
      {{ t("reader.original.prev") }}
    </span>

    <span class="tabular-nums text-(--text-muted)"
      >{{ index }}/{{ total }}</span
    >

    <NuxtLink
      v-if="next"
      :to="localePath(`/read/${next.id}`)"
      class="rounded-button px-2 py-1 text-end hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    >
      {{ t("reader.original.next") }}
      <span aria-hidden="true" class="rtl:rotate-180">&#9654;</span>
    </NuxtLink>
    <span
      v-else
      aria-disabled="true"
      class="px-2 py-1 text-(--text-muted) opacity-50"
    >
      {{ t("reader.original.next") }}
      <span aria-hidden="true" class="rtl:rotate-180">&#9654;</span>
    </span>
  </nav>
</template>
