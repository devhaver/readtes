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
// `state` exists because the bodies are deliberately not server-rendered
// (see `useInnerObservationContent`'s module doc — issue #84 measured
// part-scoped content SSR'd into every chapter of its part at ~411MB of the
// built site). Prerendered HTML and the hydrating client render both show
// the skeleton;
// only once the browser has the part's chunks does this become sections, or
// the genuine empty state. Without the distinction the pane would render
// "no Inner Observation available" on every first paint and then flash the
// essays in — the empty message must only ever mean *empty*. `"failed"` is
// held apart from `"ready"` with no sections for exactly the same reason:
// a chunk that 404s (a redeploy under a cached HTML document) must say so,
// not claim the part has nothing. Its recovery is a page reload, which the
// parent owns (`reload`) — see `useInnerObservationContent` for why an
// in-place retry provably cannot work for a failed `import()`.
//
// A11y: the skeleton is decorative (`aria-hidden`) and the three states are
// announced instead by one persistent polite live region, which is what
// makes the *transition* audible — a `role="status"` that is destroyed the
// moment the content arrives announces the wait but never its end.
import type { InnerObservationLoadState } from "~/composables/useInnerObservationContent";
import type { LocalizedText } from "~/utils/localization";
import type { SourceSegment } from "~~/shared/types/content";

export interface InnerObservationSectionView {
  chapterId: string;
  title: LocalizedText;
  items: SourceSegment[];
}

const props = withDefaults(
  defineProps<{
    sections: InnerObservationSectionView[];
    state?: InnerObservationLoadState;
  }>(),
  { state: "ready" },
);

const emit = defineEmits<{ reload: [] }>();

const { t, locale } = useI18n();

const statusMessage = computed(() => {
  if (props.state === "pending") return t("reader.innerObservationLoading");
  if (props.state === "failed") return t("reader.innerObservationFailed");
  return props.sections.length > 0
    ? t("reader.innerObservationLoaded")
    : t("reader.innerObservationEmpty");
});
</script>

<template>
  <div class="flex flex-col gap-8">
    <p
      role="status"
      aria-live="polite"
      class="sr-only"
      data-testid="inner-observation-status"
    >
      {{ statusMessage }}
    </p>

    <div
      v-if="state === 'pending'"
      aria-hidden="true"
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

    <div
      v-else-if="state === 'failed'"
      class="flex flex-col items-start gap-3"
      data-testid="inner-observation-failed"
    >
      <p class="text-sm text-(--text-muted)">
        {{ t("reader.innerObservationFailed") }}
      </p>
      <button
        type="button"
        class="rounded-button border border-(--border) px-3 py-1.5 text-sm text-(--text-primary) underline underline-offset-2"
        @click="emit('reload')"
      >
        {{ t("reader.innerObservationReload") }}
      </button>
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
  </div>
</template>
