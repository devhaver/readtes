<script setup lang="ts">
// Breadcrumb ("Six volumes › Volume N › Part N · Chapter title") + prev/next
// chapter links, disabled at the corpus edges, plus the study/panes mode
// toggle (T8). In study mode this whole bar becomes sticky just below the
// layout's navbar and auto-hides on scroll-down (`useAutoHidingChrome`,
// shared with `layouts/reader.vue`'s navbar wrapper) — the two are ONE
// sticky unit: this bar sticks at `--reader-navbar-h` (published by the
// layout) and slides up by its own height plus the navbar's, so they leave
// and return together. Panes and original modes leave it in normal flow.
import { useElementSize } from "@vueuse/core";
import type { BreadcrumbItem } from "~/components/app/AppBreadcrumb.vue";
import type { ReaderMode } from "~/utils/readerMode";
import type { ChapterLink } from "~/utils/toc";
import type { TocChapter, TocVolumeSkeleton } from "~~/shared/types/content";

const props = defineProps<{
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
  currentPartChapters?: TocChapter[];
  currentChapterId?: string;
}>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const { mode, setMode } = useReaderMode();
const { visible: chromeVisible } = useAutoHidingChrome();
const isStudyMode = computed(() => mode.value === "study");

// Published for `scroll-padding-top` (see below) — anchor jumps and focus
// scrolling must land below the chrome, not under it.
const rootRef = ref<HTMLElement | null>(null);
const { height: toolbarHeight } = useElementSize(rootRef, undefined, {
  box: "border-box",
});
watchEffect(() => {
  if (!import.meta.client) return;
  document.documentElement.style.setProperty(
    "--reader-toolbar-h",
    `${toolbarHeight.value}px`,
  );
});
onBeforeUnmount(() => {
  document.documentElement.style.removeProperty("--reader-toolbar-h");
});

// "Part N · " prefix for a prev/next link that crosses into another part, so
// "Chapter 1" at the end of Part 3 does not read as this part's chapter 1.
const linkLabel = (link: ChapterLink): string => {
  const title = localizedText(link.title, locale.value);
  const [linkPartId] = link.id.split("/");
  if (!linkPartId || linkPartId === props.currentPartId) return title;
  const partNumber = Number(linkPartId.replace(/^part-/, ""));
  return Number.isNaN(partNumber)
    ? title
    : `${t("common.part")} ${partNumber} · ${title}`;
};

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
    ref="rootRef"
    class="flex flex-col border-b border-(--border) bg-(--surface) px-3 sm:px-5"
    :class="[
      isCollapsed ? 'py-1' : 'py-2',
      isStudyMode &&
        'tes-reader-toolbar-sticky sticky z-30 transition-transform duration-200 ease-out motion-reduce:transition-none',
      isStudyMode && !chromeVisible && 'tes-reader-toolbar-hidden',
    ]"
  >
    <h1 class="sr-only">{{ chapterTitle }}</h1>

    <!-- Collapsed: where you are, and the way on. Prev/next stay reachable
         (the whole point of keeping a bar at all) at a 44px target. -->
    <div v-if="isCollapsed" class="flex min-w-0 items-center gap-1">
      <NuxtLink
        v-if="prev"
        :to="localePath(`/read/${prev.id}`)"
        class="tes-icon-btn tes-icon-btn-lg shrink-0"
        :title="linkLabel(prev)"
      >
        <span
          class="tes-icon tes-icon-chevron-down h-5 w-5 rotate-90 rtl:-rotate-90"
          aria-hidden="true"
        />
        <span class="sr-only">{{ t("reader.prevChapter") }}</span>
      </NuxtLink>
      <span v-else class="size-11 shrink-0" aria-hidden="true" />

      <button
        type="button"
        class="tes-chrome-handle justify-between"
        :aria-label="t('reader.toolbar.expandChrome')"
        :title="t('reader.toolbar.expandChrome')"
        :aria-expanded="false"
        @click="toggleCollapsed"
      >
        <span class="truncate text-sm text-(--text-primary)">
          {{ chapterTitle }}
        </span>
        <span
          class="tes-icon tes-icon-chevron-down h-5 w-5 shrink-0"
          aria-hidden="true"
        />
      </button>

      <NuxtLink
        v-if="next"
        :to="localePath(`/read/${next.id}`)"
        class="tes-icon-btn tes-icon-btn-lg shrink-0"
        :title="linkLabel(next)"
      >
        <span
          class="tes-icon tes-icon-chevron-down h-5 w-5 -rotate-90 rtl:rotate-90"
          aria-hidden="true"
        />
        <span class="sr-only">{{ t("reader.nextChapter") }}</span>
      </NuxtLink>
      <span v-else class="size-11 shrink-0" aria-hidden="true" />
    </div>

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
          class="tes-chapter-nav-link shrink-0 lg:shrink lg:max-w-[28%]"
          :title="linkLabel(prev)"
        >
          <span
            class="tes-icon tes-icon-chevron-down h-4 w-4 shrink-0 rotate-90 rtl:-rotate-90"
            aria-hidden="true"
          />
          <span class="sr-only">{{ t("reader.prevChapter") }}:</span>
          <span class="hidden min-w-0 truncate lg:inline">{{
            linkLabel(prev)
          }}</span>
        </NuxtLink>
        <span
          v-else
          aria-disabled="true"
          class="tes-chapter-nav-disabled shrink-0"
          :title="t('reader.prevChapter')"
        >
          <span
            class="tes-icon tes-icon-chevron-down h-4 w-4 rotate-90 rtl:-rotate-90"
            aria-hidden="true"
          />
          <span class="sr-only">{{ t("reader.prevChapter") }}</span>
        </span>

        <ReaderBreadcrumb
          class="min-w-0 flex-1 px-1 lg:order-last"
          :items="breadcrumbItems"
          :volumes="volumes"
          :current-volume-id="currentVolumeId"
          :current-part-id="currentPartId"
        />

        <NuxtLink
          v-if="next"
          :to="localePath(`/read/${next.id}`)"
          class="tes-chapter-nav-link shrink-0 lg:shrink lg:max-w-[28%]"
          :title="linkLabel(next)"
        >
          <span class="sr-only">{{ t("reader.nextChapter") }}:</span>
          <span class="hidden min-w-0 truncate lg:inline">{{
            linkLabel(next)
          }}</span>
          <span
            class="tes-icon tes-icon-chevron-down h-4 w-4 shrink-0 -rotate-90 rtl:rotate-90"
            aria-hidden="true"
          />
        </NuxtLink>
        <span
          v-else
          aria-disabled="true"
          class="tes-chapter-nav-disabled shrink-0"
          :title="t('reader.nextChapter')"
        >
          <span class="sr-only">{{ t("reader.nextChapter") }}</span>
          <span
            class="tes-icon tes-icon-chevron-down h-4 w-4 -rotate-90 rtl:rotate-90"
            aria-hidden="true"
          />
        </span>
      </nav>

      <div
        class="ms-auto flex max-w-full flex-wrap items-center justify-end gap-1 sm:shrink-0 sm:flex-nowrap sm:gap-2"
      >
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

        <!-- Always occupies its slot, so the mode toggle does not shift
             when switching into a mode that has no collapse control. -->
        <button
          v-if="isCollapsible"
          type="button"
          class="tes-icon-btn"
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
        <span v-else class="size-8 shrink-0" aria-hidden="true" />
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
      :current-part-chapters="currentPartChapters"
      :current-chapter-id="currentChapterId"
      @close="closeContents"
    />
  </div>
</template>
