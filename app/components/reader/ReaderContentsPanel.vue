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
import { prefersReducedMotion } from "~/utils/motion";
import { STUDY_MODE_MEDIA_QUERY } from "~/utils/readerMode";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

const props = defineProps<{
  open: boolean;
  volumes: TocVolumeSkeleton[];
  currentVolumeId: string;
  currentPartId: string;
}>();

const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const titleId = useId();
const panelRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.open);

const close = () => emit("close");
useFocusTrap(panelRef, isOpen, close);

const sortedVolumes = computed(() =>
  [...props.volumes].sort((a, b) => a.number - b.number),
);

const sortedParts = (volume: TocVolumeSkeleton) =>
  [...volume.parts].sort((a, b) => a.number - b.number);

const isNarrowViewport = useMediaQuery(STUDY_MODE_MEDIA_QUERY);

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
        class="fixed inset-0 z-50 cursor-default bg-black/40"
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
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-card border-t border-(--border) bg-(--surface) pb-[env(safe-area-inset-bottom)] shadow-lg lg:inset-x-auto lg:inset-y-0 lg:end-0 lg:bottom-auto lg:h-full lg:max-h-none lg:w-full lg:max-w-sm lg:rounded-none lg:rounded-s-card lg:border-t-0 lg:border-s"
      >
        <div
          class="flex shrink-0 items-center justify-between gap-2 border-b border-(--border) px-4 py-3"
        >
          <h2 :id="titleId" class="font-display text-sm text-(--text-primary)">
            {{ t("reader.contents.title") }}
          </h2>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-button text-(--text-muted) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
            :aria-label="t('reader.contents.close')"
            @click="close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        <nav
          :aria-label="t('reader.contents.title')"
          class="flex-1 overflow-y-auto px-4 py-4"
        >
          <ol class="flex flex-col gap-5">
            <li v-for="volume in sortedVolumes" :key="volume.id">
              <NuxtLink
                :to="localePath(`/volumes/${volumeSlug(volume)}`)"
                class="rounded-button font-display text-sm hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
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
                {{ t("common.volume") }} {{ volume.number }} ·
                {{ localizedText(volume.title, locale) }}
              </NuxtLink>

              <ul class="mt-2 flex flex-col gap-1 ps-3">
                <li v-for="part in sortedParts(volume)" :key="part.id">
                  <NuxtLink
                    v-if="part.firstChapterId"
                    :to="localePath(`/read/${part.firstChapterId}`)"
                    class="block rounded-button px-2 py-1 text-sm hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
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
                  <span
                    v-else
                    class="block px-2 py-1 text-sm text-(--text-muted) opacity-60"
                  >
                    {{ t("common.part") }} {{ part.number }} ·
                    {{ localizedText(part.title, locale) }}
                    ({{ t("volumes.comingSoon") }})
                  </span>
                </li>
              </ul>
            </li>
          </ol>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>
