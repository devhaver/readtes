<script setup lang="ts">
// Inner Observation (Histaklut Pnimit) is PART-scoped, not chapter-scoped —
// see the content model skill / `useInnerObservationContent`: every chapter
// in a part shares the exact same Inner Observation content, concatenated
// from that part's own `kind: "inner-observation"` chapters in section
// order, each rendered under its own title heading. None of the corpus's
// Inner Observation items carry anchors and there is no commentary layer
// for them, so unlike Source/Inner Light this pane never participates in
// cross-pane anchor sync — it's a standalone reference panel with its own
// scroll, hence no `id`s on its segments (a section's own seif numbering
// restarts at 1, so ids here would collide with the Source pane's).
import type { LocalizedText } from "~/utils/localization";
import type { InnerObservationAbsence } from "~/utils/readerPanes";
import type { SourceSegment } from "~~/shared/types/content";

export interface InnerObservationSectionView {
  chapterId: string;
  title: LocalizedText;
  items: SourceSegment[];
}

const props = defineProps<{
  sections: InnerObservationSectionView[];
  /**
   * Why an empty `sections` would be empty — decides which absence sentence
   * the reader gets. In the page this is always `not-in-this-edition` (a
   * part with no Inner Observation at all gets no pane, just the footnote
   * in the Source pane), but the pane states whichever it is handed rather
   * than assuming, so the "not yet" wording can never reach a part that has
   * none.
   */
  absence: InnerObservationAbsence;
}>();

const { t, locale } = useI18n();

const absenceMessage = computed(() =>
  t(INNER_OBSERVATION_ABSENCE_MESSAGE_KEYS[props.absence]),
);
</script>

<template>
  <div v-if="sections.length > 0" class="flex flex-col gap-8">
    <section
      v-for="section in sections"
      :key="section.chapterId"
      class="flex flex-col gap-4"
    >
      <h3
        class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
      >
        {{ localizedText(section.title, locale) }}
      </h3>

      <ol v-if="section.items.length > 0" class="flex flex-col gap-6">
        <li
          v-for="segment in section.items"
          :key="segment.n"
          class="text-[length:calc(1.125rem*var(--reading-scale))] leading-relaxed text-(--text-primary)"
        >
          <ReaderSourceSegment :segment="segment" />
        </li>
      </ol>
    </section>
  </div>
  <p v-else class="text-sm leading-relaxed text-(--text-muted)">
    {{ absenceMessage }}
  </p>
</template>
