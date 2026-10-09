<script setup lang="ts">
// The reader toolbar's Contents panel (T90): the whole volumes -> parts
// tree at once, current volume and part marked, parts linking straight to
// their first chapter — never chapters themselves (see the content model
// skill's no-full-ToC-import rule; chapter-level browsing stays on each
// volume's own `/volumes/<slug>` contents page, one tap from here).
//
// Below `lg` (1024px, matching `STUDY_MODE_MEDIA_QUERY`) this is the
// primary volumes/parts affordance on mobile, so it renders as a bottom
// sheet — the same overlay shape `CommentarySheet` already established for
// mobile chrome, for visual/interaction consistency with a surface readers
// already know. At `lg` and above it becomes a full-height drawer anchored
// to the inline-end edge instead, `ProgressRail`'s own edge (`end-0`) — a
// bottom sheet at that width would either cover most of a tall viewport or
// need an arbitrary cap that wastes the extra room a desktop viewport
// actually has for a real Volumes/Parts tree.
import { useMediaQuery } from "@vueuse/core";
import {
  clampSheetDragOffset,
  shouldDismissSheetDrag,
} from "~/utils/commentarySheetGesture";
import { prefersReducedMotion } from "~/utils/motion";
import { STUDY_MODE_MEDIA_QUERY } from "~/utils/readerMode";
import type { TocChapter, TocVolumeSkeleton } from "~~/shared/types/content";

const props = defineProps<{
  open: boolean;
  volumes: TocVolumeSkeleton[];
  currentVolumeId: string;
  currentPartId: string;
  /**
   * The open part's chapters, listed under it: a contents panel that only
   * reached each part's first chapter left no way to jump to a chapter.
   */
  currentPartChapters?: TocChapter[];
  currentChapterId?: string;
}>();

const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const titleId = useId();
const panelRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.open);

const close = () => emit("close");
// Start on the current chapter, not on Close: part 12 lists 293 chapters, and
// Close first meant ~300 Tabs to reach the one the reader is in.
useFocusTrap(panelRef, isOpen, close, () =>
  panelRef.value?.querySelector<HTMLElement>('[data-current-chapter="true"]'),
);

const sortedVolumes = computed(() =>
  [...props.volumes].sort((a, b) => a.number - b.number),
);

const sortedParts = (volume: TocVolumeSkeleton) =>
  [...volume.parts].sort((a, b) => a.number - b.number);

// The current chapter scrolled into view on open: part 12 lists 293.
watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    panelRef.value
      ?.querySelector('[data-current-chapter="true"]')
      ?.scrollIntoView({ block: "center" });
  },
);

const isNarrowViewport = useMediaQuery(STUDY_MODE_MEDIA_QUERY);

// Swipe-down-to-dismiss on the bottom-sheet form, same gesture (and same
// pure threshold math) as `CommentarySheet`.
const dragOffset = ref(0);
const isDragging = ref(false);
let dragStartY = 0;

const onDragStart = (event: PointerEvent) => {
  isDragging.value = true;
  dragStartY = event.clientY;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
};

const onDragMove = (event: PointerEvent) => {
  if (!isDragging.value) return;
  dragOffset.value = clampSheetDragOffset(event.clientY - dragStartY);
};

const onDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  const dismiss = shouldDismissSheetDrag(dragOffset.value);
  dragOffset.value = 0;
  if (dismiss) close();
};

const panelStyle = computed(() =>
  dragOffset.value > 0
    ? { transform: `translateY(${dragOffset.value}px)`, transition: "none" }
    : {},
);

const slideFromClass = computed(() =>
  isNarrowViewport.value
    ? "translate-y-full"
    : "translate-x-full rtl:-translate-x-full",
);

const transitionDuration = computed(() =>
  prefersReducedMotion() ? "duration-0" : "duration-200",
);
</script>

<template>
  <Teleport to="body">
    <Transition
      :enter-active-class="`transition-opacity ${transitionDuration}`"
      :leave-active-class="`transition-opacity ${transitionDuration}`"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <button
        v-if="open"
        type="button"
        tabindex="-1"
        aria-hidden="true"
        class="fixed inset-0 z-[60] cursor-default bg-black/40"
        @click="close"
      />
    </Transition>

    <Transition
      :enter-active-class="`transition-transform ${transitionDuration} ease-out`"
      :leave-active-class="`transition-transform ${transitionDuration} ease-in`"
      :enter-from-class="slideFromClass"
      :leave-to-class="slideFromClass"
    >
      <div
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        :style="panelStyle"
        class="fixed inset-x-0 bottom-0 z-[60] flex max-h-[85vh] flex-col rounded-t-card border-t border-(--border) bg-(--surface) pb-[env(safe-area-inset-bottom)] shadow-lg lg:inset-x-auto lg:inset-y-0 lg:end-0 lg:bottom-auto lg:h-full lg:max-h-none lg:w-full lg:max-w-sm lg:rounded-none lg:rounded-s-card lg:border-t-0 lg:border-s"
      >
        <div
          class="flex shrink-0 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing lg:hidden"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <span
            aria-hidden="true"
            class="h-1 w-10 shrink-0 rounded-full bg-(--border)"
          />
        </div>
        <div
          class="flex shrink-0 items-center justify-between gap-2 border-b border-(--border) px-4 py-3"
        >
          <h2
            :id="titleId"
            class="font-display text-base text-(--text-primary)"
          >
            {{ t("reader.contents.title") }}
          </h2>
          <button
            type="button"
            class="tes-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-button text-(--text-muted) hover:bg-(--surface-raised)"
            :aria-label="t('reader.contents.close')"
            @click="close"
          >
            <span class="tes-icon tes-icon-close h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav
          :aria-label="t('reader.contents.title')"
          class="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        >
          <ol class="flex flex-col gap-5">
            <li v-for="volume in sortedVolumes" :key="volume.id">
              <NuxtLink
                :to="localePath(`/volumes/${volumeSlug(volume)}`)"
                class="tes-contents-volume-link"
                :class="
                  volume.id === currentVolumeId
                    ? 'font-semibold text-(--accent-text)'
                    : 'text-(--text-primary)'
                "
                :aria-current="
                  volume.id === currentVolumeId ? 'true' : undefined
                "
                @click="close"
              >
                <!-- Volume titles in toc.volumes.json are literally
                     "Volume N" / "כרך N", so rendering label AND title
                     reads "Volume 1 · Volume 1" — the localized title
                     alone carries everything. -->
                {{ localizedText(volume.title, locale) }}
              </NuxtLink>

              <ul class="mt-2 flex flex-col gap-1 ps-3">
                <li v-for="part in sortedParts(volume)" :key="part.id">
                  <NuxtLink
                    v-if="part.firstChapterId"
                    :to="localePath(`/read/${part.firstChapterId}`)"
                    class="tes-contents-part-link"
                    :class="
                      part.id === currentPartId
                        ? 'font-semibold text-(--accent-text)'
                        : 'text-(--text-primary)'
                    "
                    :aria-current="
                      part.id === currentPartId ? 'true' : undefined
                    "
                    @click="close"
                  >
                    {{ t("common.part") }} {{ part.number }} ·
                    {{ localizedText(part.title, locale) }}
                  </NuxtLink>
                  <span v-else class="tes-contents-part-disabled">
                    {{ t("common.part") }} {{ part.number }} ·
                    {{ localizedText(part.title, locale) }}
                    ({{ t("volumes.comingSoon") }})
                  </span>
                  <ol
                    v-if="
                      part.id === currentPartId && currentPartChapters?.length
                    "
                    class="mt-1 mb-2 flex flex-col border-s border-(--border) ps-3"
                  >
                    <li
                      v-for="chapter in currentPartChapters"
                      :key="chapter.id"
                    >
                      <NuxtLink
                        :to="localePath(`/read/${chapter.id}`)"
                        class="tes-contents-part-link block py-0.5 text-sm"
                        :class="
                          chapter.id === currentChapterId
                            ? 'font-semibold text-(--accent-text)'
                            : 'text-(--text-muted) hover:text-(--text-primary)'
                        "
                        :aria-current="
                          chapter.id === currentChapterId ? 'page' : undefined
                        "
                        :data-current-chapter="
                          chapter.id === currentChapterId ? 'true' : undefined
                        "
                        @click="close"
                      >
                        {{ localizedText(chapter.title, locale) }}
                      </NuxtLink>
                    </li>
                  </ol>
                </li>
              </ul>
            </li>
          </ol>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>
