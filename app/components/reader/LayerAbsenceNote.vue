<script setup lang="ts">
// The honest replacement for what used to be an empty Inner Light pane:
// when a chapter has no commentary in ANY edition (the overwhelmingly
// common case — see `resolveReaderPanes`' docblock for the corpus numbers),
// the pane is not rendered at all and this scholarly footnote at the end of
// the Source pane says why, instead of the reader silently wondering where
// the commentary went. Styled as an aside/footnote (muted, hairline top
// border), not an alert — an absent 1950s digitization is a property of the
// corpus, not an error state.
//
// Two layers go absent this way and they must not read the same. Inner
// Light is a digitization gap ("not yet"). Inner Observation, when a part
// has none, is a fact about what Baal HaSulam wrote — so this note only
// ever states the `never-written` case for it; a part that *has* an Inner
// Observation still gets its own pane, and that pane's empty state carries
// the "not in this edition yet" wording (see `InnerObservationAbsence`).
const props = withDefaults(
  defineProps<{ layer?: "inner-light" | "inner-observation" }>(),
  { layer: "inner-light" },
);

const { t } = useI18n();

const NOTE_COPY = {
  "inner-light": {
    titleKey: "reader.pane.innerLight",
    messageKey: "reader.innerLightAbsent",
  },
  "inner-observation": {
    titleKey: "reader.pane.innerObservation",
    messageKey: INNER_OBSERVATION_ABSENCE_MESSAGE_KEYS["never-written"],
  },
} as const;

const copy = computed(() => NOTE_COPY[props.layer]);
</script>

<template>
  <aside role="note" class="mt-10 border-t border-(--border) pt-4">
    <h3
      class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
    >
      {{ t(copy.titleKey) }}
    </h3>
    <p class="mt-1 text-sm leading-relaxed text-(--text-muted)">
      {{ t(copy.messageKey) }}
    </p>
  </aside>
</template>
