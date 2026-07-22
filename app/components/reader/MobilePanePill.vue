<script setup lang="ts">
// Mobile panes swipe mode's pane switcher (T9): a floating pill fixed near
// the bottom of the viewport (the thumb zone) — not a top tab bar — so it
// stays reachable one-handed and never competes with the toolbar for space.
// Always visible while this mode is active: it does not participate in
// study mode's auto-hiding chrome (that mechanism doesn't run in panes
// mode at all — see `useAutoHidingChrome`), and hides only while
// `CommentarySheet` is open (`useCommentarySheet`), so the two floating
// surfaces never overlap.
//
// `role="tablist"`/`role="tab"`: each segment both reflects and jumps to
// one of the three swipe slides, which is close enough to the ARIA "Tabs"
// pattern to reuse it — `aria-selected`, `aria-controls` (pointing at each
// slide's own id in `MobileSwipePanes`), and roving-tabindex Left/Right/
// Home/End navigation, per the APG tabs pattern. The slides themselves
// aren't marked up as `role="tabpanel"` — a deliberate relaxation, since
// unlike classic tabs all three stay mounted and simply differ in scroll
// position, not shown/hidden visibility.
//
// RTL: plain reading-order markup, no manual reordering — `dir="rtl"`
// flips the pill's own row direction the same way it flips
// `MobileSwipePanes`' track, and the browser's own Tab-focus order follows
// suit automatically.
import type { ComponentPublicInstance } from "vue";
import type { PaneId } from "~/utils/readerAnchorState";

interface Segment {
  pane: PaneId;
  labelKey: string;
  controls: string;
}

const SEGMENTS: Segment[] = [
  {
    pane: "summary",
    labelKey: "reader.mobilePane.chapter",
    controls: "reader-summary-pane",
  },
  {
    pane: "source",
    labelKey: "reader.mobilePane.source",
    controls: "reader-source-pane",
  },
  {
    pane: "commentary",
    labelKey: "reader.mobilePane.commentary",
    controls: "reader-commentary-pane",
  },
];

const { t } = useI18n();
const { activePane, setActivePane } = useReaderState();
const { isOpen: isSheetOpen } = useCommentarySheet();

const tabRefs = ref<(HTMLElement | null)[]>([]);
const setTabRef = (
  el: Element | ComponentPublicInstance | null,
  index: number,
) => {
  tabRefs.value[index] = el as HTMLElement | null;
};

const focusTabAt = (index: number) => {
  const wrapped = (index + SEGMENTS.length) % SEGMENTS.length;
  const segment = SEGMENTS[wrapped];
  if (!segment) return;
  tabRefs.value[wrapped]?.focus();
  setActivePane(segment.pane);
};

const onKeydown = (event: KeyboardEvent, index: number) => {
  switch (event.key) {
    case "ArrowRight":
      event.preventDefault();
      focusTabAt(index + 1);
      break;
    case "ArrowLeft":
      event.preventDefault();
      focusTabAt(index - 1);
      break;
    case "Home":
      event.preventDefault();
      focusTabAt(0);
      break;
    case "End":
      event.preventDefault();
      focusTabAt(SEGMENTS.length - 1);
      break;
  }
};
</script>

<template>
  <div
    v-if="!isSheetOpen"
    class="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center lg:hidden"
  >
    <div
      role="tablist"
      :aria-label="t('reader.mobilePane.label')"
      class="pointer-events-auto flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-raised) p-1 shadow-lg"
    >
      <button
        v-for="(segment, index) in SEGMENTS"
        :key="segment.pane"
        :ref="(el) => setTabRef(el, index)"
        type="button"
        role="tab"
        :aria-selected="activePane === segment.pane"
        :aria-controls="segment.controls"
        :tabindex="activePane === segment.pane ? 0 : -1"
        class="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        :class="
          activePane === segment.pane
            ? 'bg-teal text-surface-white'
            : 'text-(--text-primary) hover:bg-(--surface)'
        "
        @click="setActivePane(segment.pane)"
        @keydown="onKeydown($event, index)"
      >
        <svg
          v-if="segment.pane === 'summary'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="14" y2="18" />
        </svg>
        <svg
          v-else-if="segment.pane === 'source'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M4 5c2.5-1 5-1 8 0v14c-3-1-5.5-1-8 0Z" />
          <path d="M20 5c-2.5-1-5-1-8 0v14c3-1 5.5-1 8 0Z" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M4 5h16v10H8l-4 4Z" />
        </svg>
        <span>{{ t(segment.labelKey) }}</span>
      </button>
    </div>
  </div>
</template>
