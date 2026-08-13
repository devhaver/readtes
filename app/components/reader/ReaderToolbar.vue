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
  <div
    class="flex flex-col border-b border-(--border) bg-(--surface) px-4 sm:px-6"
    :class="[
      isCollapsed ? 'gap-0 py-1.5' : 'gap-3 py-3',
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

    <div v-if="!isCollapsed" class="flex items-center justify-between gap-3">
      <ReaderBreadcrumb
        :items="breadcrumbItems"
        :volumes="volumes"
        :current-volume-id="currentVolumeId"
        :current-part-id="currentPartId"
      />

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="tes-icon-btn"
          :aria-label="t('reader.toolbar.contentsButton')"
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

    <nav
      v-if="!isCollapsed"
      :aria-label="t('reader.chapterNav')"
      class="flex items-center justify-between gap-3 text-sm"
    >
      <NuxtLink
        v-if="prev"
        :to="localePath(`/read/${prev.id}`)"
        class="tes-chapter-nav-link"
      >
        <span aria-hidden="true" class="rtl:rotate-180">&larr;</span>
        <span class="truncate">{{ localizedText(prev.title, locale) }}</span>
      </NuxtLink>
      <span v-else aria-disabled="true" class="tes-chapter-nav-disabled">
        <span aria-hidden="true" class="rtl:rotate-180">&larr;</span>
        {{ t("reader.prevChapter") }}
      </span>

      <NuxtLink
        v-if="next"
        :to="localePath(`/read/${next.id}`)"
        class="tes-chapter-nav-link text-end"
      >
        <span class="truncate">{{ localizedText(next.title, locale) }}</span>
        <span aria-hidden="true" class="rtl:rotate-180">&rarr;</span>
      </NuxtLink>
      <span v-else aria-disabled="true" class="tes-chapter-nav-disabled">
        {{ t("reader.nextChapter") }}
        <span aria-hidden="true" class="rtl:rotate-180">&rarr;</span>
      </span>
    </nav>

    <!-- Its own full-width row, not another icon in the control group:
         that row already carries the breadcrumb, two icon buttons and a
         three-way segmented control, and a fifth control pushed it off the
         edge of a 412px screen. A handle spanning the bar is also the
         conventional shape for "this collapses". -->
    <button
      v-if="isCollapsible && !isCollapsed"
      type="button"
      class="tes-chrome-handle justify-center"
      :aria-label="t('reader.toolbar.collapseChrome')"
      :aria-expanded="true"
      @click="toggleCollapsed"
    >
      <span
        class="tes-icon tes-icon-chevron-down h-5 w-5 rotate-180"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
