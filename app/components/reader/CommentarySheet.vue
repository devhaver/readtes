<script setup lang="ts">
// Mobile panes swipe mode's commentary bottom sheet (T9): tapping a source
// paragraph (not one of its own inline anchors — see `SourcePane`'s
// `useSeifTapActivation`) opens this listing that seif's commentary items
// (by `targetSeif`, not anchor — see `commentaryItemsForSeif`). "Open in
// Commentary" reuses the existing `activateAnchor` pipeline exactly as a
// source anchor tap would: `useHighlightedAnchor` finds the item in the
// commentary pane, highlights it, and (T9) calls `setActivePane` so the
// swipe track lands on the commentary slide — no separate navigation logic
// needed here.
//
// Small custom sheet, no dependency: Teleport + `<Transition>` for the
// slide/backdrop, plain pointer events for swipe-down-to-dismiss (see
// `~/utils/commentarySheetGesture` for the pure drag-threshold math), and
// the shared `useFocusTrap` for focus-trapping + Escape-to-close.
import {
  clampSheetDragOffset,
  shouldDismissSheetDrag,
} from "~/utils/commentarySheetGesture";
import { prefersReducedMotion } from "~/utils/motion";
import type { CommentaryItem } from "~~/shared/types/content";

const props = defineProps<{
  open: boolean;
  seif: number | null;
  items: CommentaryItem[];
}>();

const emit = defineEmits<{ close: [] }>();

const { locale, t } = useI18n();
const { activateAnchor } = useReaderState();

const titleId = useId();
const panelRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.open);

const close = () => emit("close");
useFocusTrap(panelRef, isOpen, close);

const openInCommentary = (item: CommentaryItem) => {
  activateAnchor(item.anchorId, "source");
  close();
};

// Swipe-down-to-dismiss: a plain pointer-events delta, no gesture library.
// `dragOffset` drives the panel's own `translateY` while dragging (clamped
// to "down only" — see `clampSheetDragOffset`); on release, a large-enough
// drag closes the sheet, otherwise it springs back to 0.
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

  if (shouldDismissSheetDrag(dragOffset.value)) {
    dragOffset.value = 0;
    close();
    return;
  }
  dragOffset.value = 0;
};

const panelStyle = computed(() =>
  dragOffset.value > 0
    ? { transform: `translateY(${dragOffset.value}px)`, transition: "none" }
    : {},
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
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-card border-t border-(--border) bg-(--surface) pb-[env(safe-area-inset-bottom)] shadow-lg"
        :style="panelStyle"
      >
        <div
          class="flex shrink-0 cursor-grab touch-none flex-col items-center gap-2 px-4 pt-2 pb-3 active:cursor-grabbing"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <span
            aria-hidden="true"
            class="h-1 w-10 shrink-0 rounded-full bg-(--border)"
          />
          <div class="flex w-full items-center justify-between gap-2">
            <h2
              :id="titleId"
              class="font-display text-sm text-(--text-primary)"
            >
              {{ t("reader.commentarySheet.title", { n: seif }) }}
            </h2>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-button text-(--text-muted) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
              :aria-label="t('reader.commentarySheet.close')"
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
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4">
          <ol v-if="items.length > 0" class="flex flex-col gap-4">
            <li
              v-for="item in items"
              :key="item.anchorId"
              class="rounded-card border border-(--border) p-3"
            >
              <p class="mb-1 text-xs font-semibold text-(--accent-text)">
                {{ localizedText(item.label, locale) }}
              </p>
              <div
                class="text-sm leading-relaxed text-(--text-primary)"
                v-html="item.html"
              />
              <button
                type="button"
                class="mt-2 rounded-button border border-teal px-2.5 py-1 text-xs font-medium text-(--accent-text) hover:bg-teal-strong hover:text-surface-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                @click="openInCommentary(item)"
              >
                {{ t("reader.commentarySheet.openInCommentary") }}
              </button>
            </li>
          </ol>
          <p v-else class="text-sm text-(--text-muted)">
            {{ t("reader.commentarySheet.empty") }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
