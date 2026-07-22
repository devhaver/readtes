<script setup lang="ts">
// Breadcrumb ("Six volumes › Volume N › Part N · Chapter title") + prev/next
// chapter links, disabled at the corpus edges. `prev`/`next` come straight
// from `prevNextChapter` (`~/utils/toc`) — this component only renders.
import type { BreadcrumbItem } from "~/components/app/AppBreadcrumb.vue";
import type { FlattenedChapter } from "~/utils/toc";

defineProps<{
  breadcrumbItems: BreadcrumbItem[];
  prev: FlattenedChapter | null;
  next: FlattenedChapter | null;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <div class="flex flex-col gap-3 border-b border-(--border) px-4 py-3 sm:px-6">
    <AppBreadcrumb :items="breadcrumbItems" />

    <nav
      :aria-label="t('reader.chapterNav')"
      class="flex items-center justify-between gap-3 text-sm"
    >
      <NuxtLink
        v-if="prev"
        :to="localePath(`/read/${prev.chapter.id}`)"
        class="inline-flex min-w-0 items-center gap-1.5 rounded-button px-2 py-1 text-(--text-primary) hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        <span aria-hidden="true" class="rtl:rotate-180">&larr;</span>
        <span class="truncate">{{
          localizedText(prev.chapter.title, locale)
        }}</span>
      </NuxtLink>
      <span
        v-else
        aria-disabled="true"
        class="inline-flex items-center gap-1.5 px-2 py-1 text-(--text-muted) opacity-50"
      >
        <span aria-hidden="true" class="rtl:rotate-180">&larr;</span>
        {{ t("reader.prevChapter") }}
      </span>

      <NuxtLink
        v-if="next"
        :to="localePath(`/read/${next.chapter.id}`)"
        class="inline-flex min-w-0 items-center gap-1.5 rounded-button px-2 py-1 text-end text-(--text-primary) hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        <span class="truncate">{{
          localizedText(next.chapter.title, locale)
        }}</span>
        <span aria-hidden="true" class="rtl:rotate-180">&rarr;</span>
      </NuxtLink>
      <span
        v-else
        aria-disabled="true"
        class="inline-flex items-center gap-1.5 px-2 py-1 text-(--text-muted) opacity-50"
      >
        {{ t("reader.nextChapter") }}
        <span aria-hidden="true" class="rtl:rotate-180">&rarr;</span>
      </span>
    </nav>
  </div>
</template>
