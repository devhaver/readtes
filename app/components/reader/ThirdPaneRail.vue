<script setup lang="ts">
// The third pane's toggle, as a slim always-present grid track on the
// inline-end edge of the desktop panes layout.
//
// It is a column in the grid rather than a floating button on purpose. A
// `position: fixed` control would have to be placed against a containing
// block that panes mode has already been burned by once (issue 122 — a
// fixed bottom bar came to rest a strip above the real bottom edge on
// Firefox for Android), and it would overlap the text it sits on top of. A
// track costs a few rem of width, always resolves correctly, and gives the
// closed pane a visible edge to reopen from — a collapsed pane with no
// persistent affordance is a feature nobody finds twice.
//
// `lg:` only: below it the third pane is a swipe slide reached from
// `MobilePanePill`, and there is nothing to collapse.
const props = defineProps<{ paneName?: string }>();

const { open, toggle } = useReaderThirdPane();

const { t } = useI18n();

// Named after the tab on screen: the pane is Inner Observation, Questions or
// Answers, and "Hide the Inner Observation pane" beside a Q&A pane is wrong.
const label = computed(() =>
  t(open.value ? "reader.thirdPane.collapse" : "reader.thirdPane.expand", {
    pane: props.paneName ?? t("reader.pane.innerObservation"),
  }),
);
</script>

<template>
  <div
    class="hidden lg:col-start-[-2] lg:row-start-1 lg:flex lg:h-full lg:shrink-0 lg:items-start lg:justify-center lg:border-s lg:border-(--border) lg:py-2.5"
  >
    <button
      type="button"
      class="tes-icon-btn"
      :aria-expanded="open"
      aria-controls="reader-inner-observation-pane"
      :title="label"
      @click="toggle"
    >
      <span class="sr-only">{{ label }}</span>
      <!-- One chevron asset, rotated, rather than two icons. Closed, it
           points inline-START (the direction the pane will come from when
           it opens); open, inline-END (the direction it will go back). The
           `rtl:` pair mirrors both, because "inline-start" is the right-hand
           side in Hebrew and a chevron that ignored that would point at the
           wrong edge of the screen. -->
      <span
        aria-hidden="true"
        class="tes-icon tes-icon-chevron-down h-4 w-4"
        :class="open ? '-rotate-90 rtl:rotate-90' : 'rotate-90 rtl:-rotate-90'"
      />
    </button>
  </div>
</template>
