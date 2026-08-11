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
//
// `pending` exists because the bodies are deliberately not server-rendered
// (see `useInnerObservationContent`'s module doc — part-scoped content
// SSR'd into every chapter of the part was ~411MB of the build). Prerendered
// HTML and the hydrating client render therefore both show the skeleton;
// only once the browser has the part's chunks does this become sections, or
// the genuine empty state. Without the distinction the pane would render
// "no Inner Observation available" on every first paint and then flash the
// essays in — the empty message must only ever mean *empty*.
import type { LocalizedText } from "~/utils/localization";
import type { SourceSegment } from "~~/shared/types/content";

export interface InnerObservationSectionView {
  chapterId: string;
  title: LocalizedText;
  items: SourceSegment[];
}

withDefaults(
  defineProps<{
    sections: InnerObservationSectionView[];
    pending?: boolean;
  }>(),
  { pending: false },
);

const { t, locale } = useI18n();
</script>

<template>
  <div
    v-if="pending"
    role="status"
    :aria-label="t('reader.innerObservationLoading')"
    class="flex flex-col gap-8"
    data-testid="inner-observation-skeleton"
  >
    <div v-for="section in 2" :key="section" class="flex flex-col gap-4">
      <div
        class="h-3 w-1/3 animate-pulse rounded-full bg-(--border) motion-reduce:animate-none"
      />
      <div class="flex flex-col gap-3">
        <div
          v-for="line in 4"
          :key="line"
          class="h-3 animate-pulse rounded-full bg-(--border) motion-reduce:animate-none"
          :class="line === 4 ? 'w-2/3' : 'w-full'"
        />
      </div>
    </div>
  </div>

  <div v-else-if="sections.length > 0" class="flex flex-col gap-8">
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
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.innerObservationEmpty") }}
  </p>
</template>
