<script setup lang="ts">
// Mobile panes swipe mode's pane switcher (T9): a bar docked to the bottom
// of the reader (the thumb zone) — not a top tab bar — so it
// stays reachable one-handed and never competes with the toolbar for space.
// Always visible while this mode is active: it does not participate in
// study mode's auto-hiding chrome (that mechanism doesn't run in panes
// mode at all — see `useAutoHidingChrome`).
//
// In normal flow, not `position: fixed`. It is the last child of
// `.tes-pane-shell`, which is a flex column, so it simply occupies the
// bottom row and the swipe track shrinks above it. `fixed` looked
// equivalent and was not: on Firefox for Android the dynamic address bar
// moves the viewport a fixed element anchors to, and `bottom: 0` came to
// rest a strip above the actual bottom edge with the page background
// showing beneath it (issue #122). Everything else on the page is placed
// by layout — sized off the reader root's `h-dvh` — and rendered correctly
// throughout; only the one element positioned against the viewport did
// not. Being in flow also means the pane body needs no compensating
// bottom padding to avoid it.
//
// It stays rendered while `CommentarySheet` (`useCommentarySheet`) or the
// Contents panel (`useContentsPanel`) is open, and goes `inert` instead.
// Removing it from the DOM would reflow the pane underneath every time one
// opens or closes; `inert` takes it out of the tab order and the
// accessibility tree without moving anything, which is what a modal above
// it wants anyway.
//
// `panes`: the panes that actually exist for this chapter (from
// `resolveReaderPanes` via `MobileSwipePanes`) — `segments` renders a tab
// per existing pane rather than empty/disabled ones, matching
// `MobileSwipePanes`' own slide rendering. With a single pane there is
// nothing to switch between, so the pill doesn't render at all.
//
// `role="tablist"`/`role="tab"`: each segment both reflects and jumps to
// one of the swipe slides, which is close enough to the ARIA "Tabs"
// pattern to reuse it — `aria-selected`, `aria-controls` (pointing at each
// slide's own id in `MobileSwipePanes`), and roving-tabindex Left/Right/
// Home/End navigation, per the APG tabs pattern. The slides themselves
// aren't marked up as `role="tabpanel"` — a deliberate relaxation, since
// unlike classic tabs all slides stay mounted and simply differ in scroll
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
  /** This pane's `.tes-icon-*` mask class (`main.css`). */
  iconClass: string;
}

const props = defineProps<{ panes: PaneId[] }>();

const SEGMENT_BY_PANE: Record<PaneId, Segment> = {
  source: {
    pane: "source",
    labelKey: "reader.mobilePane.source",
    controls: "reader-source-pane",
    iconClass: "tes-icon-pane-source",
  },
  commentary: {
    pane: "commentary",
    labelKey: "reader.mobilePane.innerLight",
    controls: "reader-commentary-pane",
    iconClass: "tes-icon-pane-commentary",
  },
  "inner-observation": {
    pane: "inner-observation",
    labelKey: "reader.mobilePane.innerObservation",
    controls: "reader-inner-observation-pane",
    iconClass: "tes-icon-pane-inner-observation",
  },
};

const segments = computed<Segment[]>(() =>
  props.panes.map((pane) => SEGMENT_BY_PANE[pane]),
);

const { t } = useI18n();
const { activePane, setActivePane } = useReaderState();
const { isOpen: isSheetOpen } = useCommentarySheet();
const { isOpen: isContentsOpen } = useContentsPanel();

const tabRefs = ref<(HTMLElement | null)[]>([]);
const setTabRef = (
  el: Element | ComponentPublicInstance | null,
  index: number,
) => {
  tabRefs.value[index] = el as HTMLElement | null;
};

const focusTabAt = (index: number) => {
  const wrapped = (index + segments.value.length) % segments.value.length;
  const segment = segments.value[wrapped];
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
      focusTabAt(segments.value.length - 1);
      break;
  }
};
</script>

<template>
  <div
    v-if="segments.length > 1"
    :inert="isSheetOpen || isContentsOpen"
    class="shrink-0 border-t border-(--border) bg-(--surface-raised) pb-[env(safe-area-inset-bottom)] lg:hidden"
  >
    <div
      role="tablist"
      :aria-label="t('reader.mobilePane.label')"
      class="flex items-stretch gap-1 p-0.5"
    >
      <button
        v-for="(segment, index) in segments"
        :key="segment.pane"
        :ref="(el) => setTabRef(el, index)"
        type="button"
        role="tab"
        :aria-selected="activePane === segment.pane"
        :aria-controls="segment.controls"
        :tabindex="activePane === segment.pane ? 0 : -1"
        class="tes-pill-tab flex-1"
        :class="
          activePane === segment.pane
            ? 'bg-teal-strong text-surface-white'
            : 'text-(--text-primary) hover:bg-(--surface)'
        "
        @click="setActivePane(segment.pane)"
        @keydown="onKeydown($event, index)"
      >
        <span
          class="tes-icon h-4 w-4 shrink-0"
          :class="segment.iconClass"
          aria-hidden="true"
        />
        <span>{{ t(segment.labelKey) }}</span>
      </button>
    </div>
  </div>
</template>
