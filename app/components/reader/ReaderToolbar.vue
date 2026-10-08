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
import type { ChapterLink } from "~/utils/toc";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

defineProps<{
  // The reader page renders no other heading — this is that page's ONE
  // `h1` (see AGENTS.md "Accessibility"), visually hidden since the
  // breadcrumb right below already shows the same title on-screen.
  chapterTitle: string;
  breadcrumbItems: BreadcrumbItem[];
  volumes: TocVolumeSkeleton[];
  currentVolumeId: string;
  currentPartId: string;
  prev: ChapterLink | null;
  next: ChapterLink | null;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const { mode, setMode } = useReaderMode();
const { visible: chromeVisible } = useAutoHidingChrome();
const isStudyMode = computed(() => mode.value === "study");

const modeOptions = computed(() => [
  { value: "study" as ReaderMode, label: t("reader.mode.study") },
  { value: "panes" as ReaderMode, label: t("reader.mode.panes") },
  { value: "original" as ReaderMode, label: t("reader.mode.original") },
]);

// Opens `ReadingPreferencesModal` — available from every mode/breakpoint,
// since it's this component that's always present (as the panes-mode
// toolbar slot, or directly alongside `StudyStream` in study mode).
const showPreferences = ref(false);

// The Contents panel (T90): provide/inject singleton, same as
// `useCommentarySheet` — the reader page calls this first, so
// `MobilePanePill` (a sibling, not a descendant, of this toolbar) injects
// the same instance to hide itself while the panel is open.
const {
  isOpen: showContents,
  open: openContents,
  close: closeContents,
} = useContentsPanel();

// Panes mode's collapse control (issue 113). Collapsed, this bar keeps one
// slim row — where you are, and the way back — and the breadcrumb, chapter
// nav and mode toggle stop rendering. Everything stays in normal flow: the
// reader asked for the change, so the pane is allowed to simply grow into
// the space. Study mode has its own scroll-driven hiding and does not show
// this control; two mechanisms for the same chrome would be worse than
// either.
const { collapsed, toggle: toggleCollapsed } = useCollapsedReaderChrome();
const isCollapsible = computed(() => mode.value === "panes");
const isCollapsed = computed(() => isCollapsible.value && collapsed.value);
</script>

<template>
  <!-- One row at every width. It was three — breadcrumb + controls, then
       prev/next, then a full-width collapse handle — ~130px of chrome on
       desktop and ~240px on a phone before the first word of text. -->
  <div
    class="flex flex-col border-b border-(--border) bg-(--surface) px-3 sm:px-5"
    :class="[
      isCollapsed ? 'py-1' : 'py-2',
      isStudyMode &&
        'sticky top-0 z-30 transition-transform duration-200 ease-out motion-reduce:transition-none',
      isStudyMode && !chromeVisible && '-translate-y-full',
    ]"
  >
    <h1 class="sr-only">{{ chapterTitle }}</h1>

    <button
      v-if="isCollapsed"
      type="button"
      class="tes-chrome-handle justify-between"
      :aria-label="t('reader.toolbar.expandChrome')"
      :aria-expanded="false"
      @click="toggleCollapsed"
    >
      <span class="truncate text-sm text-(--text-muted)">
        {{ chapterTitle }}
      </span>
      <span class="tes-icon tes-icon-chevron-down h-5 w-5" aria-hidden="true" />
    </button>

    <!-- Phones get two short rows — chapter navigation, then controls —
         because the three-way mode control alone is half a 390px screen. -->
    <div
      v-else
      class="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5 sm:flex-nowrap sm:gap-2"
    >
      <nav
        :aria-label="t('reader.chapterNav')"
        class="flex min-w-0 basis-full items-center gap-1 sm:flex-1 sm:basis-auto"
      >
        <NuxtLink
          v-if="prev"
          :to="localePath(`/read/${prev.id}`)"
          class="tes-chapter-nav-link shrink-0"
          :title="localizedText(prev.title, locale)"
        >
          <span aria-hidden="true" class="rtl:rotate-180">&larr;</span>
          <span class="sr-only">{{ t("reader.prevChapter") }}:</span>
          <span class="hidden max-w-[12rem] truncate xl:inline">{{
            localizedText(prev.title, locale)
          }}</span>
        </NuxtLink>
        <span
          v-else
          aria-disabled="true"
          class="tes-chapter-nav-disabled shrink-0"
          :title="t('reader.prevChapter')"
        >
          <span aria-hidden="true" class="rtl:rotate-180">&larr;</span>
          <span class="sr-only">{{ t("reader.prevChapter") }}</span>
        </span>

        <ReaderBreadcrumb
          class="min-w-0 flex-1 px-1"
          :items="breadcrumbItems"
          :volumes="volumes"
          :current-volume-id="currentVolumeId"
          :current-part-id="currentPartId"
        />

        <NuxtLink
          v-if="next"
          :to="localePath(`/read/${next.id}`)"
          class="tes-chapter-nav-link shrink-0"
          :title="localizedText(next.title, locale)"
        >
          <span class="sr-only">{{ t("reader.nextChapter") }}:</span>
          <span class="hidden max-w-[12rem] truncate xl:inline">{{
            localizedText(next.title, locale)
          }}</span>
          <span aria-hidden="true" class="rtl:rotate-180">&rarr;</span>
        </NuxtLink>
        <span
          v-else
          aria-disabled="true"
          class="tes-chapter-nav-disabled shrink-0"
          :title="t('reader.nextChapter')"
        >
          <span class="sr-only">{{ t("reader.nextChapter") }}</span>
          <span aria-hidden="true" class="rtl:rotate-180">&rarr;</span>
        </span>
      </nav>

      <div class="ms-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          class="tes-icon-btn"
          :aria-label="t('reader.toolbar.contentsButton')"
          :title="t('reader.toolbar.contentsButton')"
          aria-haspopup="dialog"
          :aria-expanded="showContents"
          @click="openContents"
        >
          <span class="tes-icon tes-icon-contents h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="tes-icon-btn"
          :aria-label="t('reader.toolbar.preferencesButton')"
          :title="t('reader.toolbar.preferencesButton')"
          @click="showPreferences = true"
        >
          <span
            class="tes-icon tes-icon-preferences h-5 w-5"
            aria-hidden="true"
          />
        </button>

        <UiSegmentedControl
          :accessible-label="t('reader.mode.label')"
          :model-value="mode"
          :options="modeOptions"
          @update:model-value="(value) => setMode(value)"
        />

        <button
          v-if="isCollapsible"
          type="button"
          class="tes-icon-btn hidden lg:inline-flex"
          :aria-label="t('reader.toolbar.collapseChrome')"
          :title="t('reader.toolbar.collapseChrome')"
          :aria-expanded="true"
          @click="toggleCollapsed"
        >
          <span
            class="tes-icon tes-icon-chevron-down h-5 w-5 rotate-180"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <ReaderReadingPreferencesModal
      :open="showPreferences"
      @close="showPreferences = false"
    />

    <ReaderContentsPanel
      :open="showContents"
      :volumes="volumes"
      :current-volume-id="currentVolumeId"
      :current-part-id="currentPartId"
      @close="closeContents"
    />
  </div>
</template>
