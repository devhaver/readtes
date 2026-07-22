<script setup lang="ts">
// Breadcrumb ("Six volumes › Volume N › Part N · Chapter title") + prev/next
// chapter links, disabled at the corpus edges, plus the study/panes mode
// toggle (T8). In study mode this whole bar becomes sticky and
// auto-hides on scroll-down (`useAutoHidingChrome`, shared with
// `layouts/reader.vue`'s navbar wrapper so both pieces of chrome move
// together) — panes mode leaves it in normal flow, untouched, exactly as
// T7 shipped it.
import type { BreadcrumbItem } from "~/components/app/AppBreadcrumb.vue";
import type { ReaderMode } from "~/utils/readerMode";
import type { FlattenedChapter } from "~/utils/toc";

defineProps<{
  breadcrumbItems: BreadcrumbItem[];
  prev: FlattenedChapter | null;
  next: FlattenedChapter | null;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const { mode, setMode } = useReaderMode();
const { visible: chromeVisible } = useAutoHidingChrome();
const isStudyMode = computed(() => mode.value === "study");

const modeOptions = computed(() => [
  { value: "study" as ReaderMode, label: t("reader.mode.study") },
  { value: "panes" as ReaderMode, label: t("reader.mode.panes") },
]);

// Opens `ReadingPreferencesModal` — available from every mode/breakpoint,
// since it's this component that's always present (as the panes-mode
// toolbar slot, or directly alongside `StudyStream` in study mode).
const showPreferences = ref(false);
</script>

<template>
  <div
    class="flex flex-col gap-3 border-b border-(--border) bg-(--surface) px-4 py-3 sm:px-6"
    :class="[
      isStudyMode &&
        'sticky top-0 z-30 transition-transform duration-200 ease-out motion-reduce:transition-none',
      isStudyMode && !chromeVisible && '-translate-y-full',
    ]"
  >
    <div class="flex items-center justify-between gap-3">
      <AppBreadcrumb :items="breadcrumbItems" />

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-button text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          :aria-label="t('reader.toolbar.preferencesButton')"
          @click="showPreferences = true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>

        <UiSegmentedControl
          :ariaLabel="t('reader.mode.label')"
          :model-value="mode"
          :options="modeOptions"
          @update:model-value="(value) => setMode(value)"
        />
      </div>
    </div>

    <ReaderReadingPreferencesModal
      :open="showPreferences"
      @close="showPreferences = false"
    />

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
