<script setup lang="ts">
// The third pane's tablist: Inner Observation / Questions / Answers.
//
// It sits in the pane header where every other pane prints a single layer
// title, because that is what it is — the third pane names three layers
// instead of one, and the reader picks between them.
//
// Only the tabs the part actually HAS are rendered. Five parts have no
// Inner Observation (Baal HaSulam wrote none — see `ReaderLayerAbsenceNote`),
// and those parts get a two-tab pane rather than a tab that opens onto an
// explanation. The explanation stays where it already was: the footnote in
// the Source pane.
//
// Keyboard: ArrowLeft/ArrowRight move between tabs and activate as they go
// (`aria-selected` follows focus), which is the pattern for a tablist whose
// panels are cheap to show. Combined with the roving `tabindex` below, Tab
// moves past the whole tablist rather than through each of its buttons.
//
// The handler sits on each tab, not on the `role="tablist"` container: only
// a focusable element may carry key handling (the container is not one, and
// `vuejs-accessibility/interactive-supports-focus` says so), and the tab is
// where the focus actually is when the key is pressed.
//
// `dir="rtl"` is resolved through the element's own computed direction
// rather than hardcoding left = previous: in Hebrew the visually-previous
// tab is the one to the right.
import type { ThirdPaneTab } from "~/composables/useReaderThirdPane";

const props = defineProps<{
  tabs: ThirdPaneTab[];
  active: ThirdPaneTab;
}>();

const emit = defineEmits<{ select: [tab: ThirdPaneTab] }>();

const { t } = useI18n();

const LABEL_KEYS: Record<ThirdPaneTab, string> = {
  "inner-observation": "reader.pane.innerObservation",
  questions: "reader.pane.questions",
  answers: "reader.pane.answers",
};

const tabId = (tab: ThirdPaneTab) => `reader-third-pane-tab-${tab}`;

// Every other pane prints an <h2> naming its layer, and readers who
// navigate by heading rely on that. Replacing this pane's heading with a
// tablist would have quietly removed it from that list, so the heading
// stays — visually hidden, since the tabs already say the same thing on
// screen — and labels the tablist rather than repeating itself in an
// `aria-label`.
const HEADING_ID = "reader-third-pane-heading";

// Named from static message keys rather than joined with `Intl.ListFormat`:
// this string is server-rendered and then hydrated, and Node and the browser
// carry independent ICU/CLDR versions — the exact trap that made
// `NATIVE_LANGUAGE_NAMES` a fixed table instead of `Intl.DisplayNames`. A
// conjunction that differed between the two would be a hydration mismatch in
// the pane header.
//
// Two shapes occur in the corpus: every part has Questions and Answers
// (issue #91 consolidated them to one chapter per kind), and eleven of the
// sixteen also have Inner Observation. A single remaining tab falls back to
// its own label so this can never name a tab the part does not have.
const headingText = computed(() => {
  if (props.tabs.length === 1)
    return t(LABEL_KEYS[props.tabs[0] as ThirdPaneTab]);
  return props.tabs.includes("inner-observation")
    ? t("reader.pane.thirdPaneTablist")
    : t("reader.pane.thirdPaneTablistQaOnly");
});

const rootRef = ref<HTMLElement | null>(null);

const focusTab = (tab: ThirdPaneTab) => {
  rootRef.value
    ?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(tab))}`)
    ?.focus();
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

  // In an RTL pane, ArrowLeft means "the tab drawn to the left", which is
  // the NEXT one in reading order. Resolve against the element's own
  // computed direction so this follows the locale without a prop.
  const rtl =
    rootRef.value && getComputedStyle(rootRef.value).direction === "rtl";
  const forward = rtl ? event.key === "ArrowLeft" : event.key === "ArrowRight";

  const index = props.tabs.indexOf(props.active);
  if (index === -1) return;

  const next =
    props.tabs[
      (index + (forward ? 1 : -1) + props.tabs.length) % props.tabs.length
    ];
  if (!next) return;

  event.preventDefault();
  emit("select", next);
  void nextTick(() => focusTab(next));
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-1">
    <h2 :id="HEADING_ID" class="sr-only">
      {{ headingText }}
    </h2>

    <div
      ref="rootRef"
      role="tablist"
      :aria-labelledby="HEADING_ID"
      class="flex flex-wrap items-center gap-1"
    >
      <button
        v-for="tab in tabs"
        :id="tabId(tab)"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="tab === active"
        :aria-controls="`reader-third-pane-panel-${tab}`"
        :tabindex="tab === active ? 0 : -1"
        class="tes-third-pane-tab"
        :class="
          tab === active
            ? 'tes-third-pane-tab-active'
            : 'text-(--text-muted) hover:text-(--text-primary)'
        "
        @click="emit('select', tab)"
        @keydown="onKeydown"
      >
        {{ t(LABEL_KEYS[tab]) }}
      </button>
    </div>
  </div>
</template>
