<script setup lang="ts">
// The honest replacement for a pane that would render empty: when a layer
// is absent for this chapter, `resolveReaderPanes` drops its pane entirely
// and this scholarly footnote at the end of the Source pane says why,
// instead of the reader silently wondering where the text went. Styled as
// an aside/footnote (muted, hairline top border), not an alert — neither
// absence is an error state.
//
// The two layers go absent for different reasons and the copy must not
// blur them, because on parts 5, 11, 14, 15 and 16 both notes render on the
// same page, one after the other:
//
// - `inner-light` is a digitization gap. Sefaria's Ohr Penimi index covers
//   25 of the 5,148 chapters, so the commentary is absent for ~99.5% of
//   them and its sentence keeps the "yet".
// - `inner-observation` is not a gap at all. Baal HaSulam wrote a Histaklut
//   Pnimit for 11 of the 16 parts; parts 5, 11, 14, 15 and 16 (2,193
//   chapters) have none, so there is nothing for any edition to carry and
//   the sentence must not promise text that was never written. See
//   `content/COVERAGE.md` for the evidence and its limits.
//
// A part that *does* have an Inner Observation keeps its own pane, and that
// pane's own empty state (`reader.innerObservationEmpty`) covers the
// ordinary case of an edition carrying no text for it yet.
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
    messageKey: "reader.innerObservationNeverWritten",
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
