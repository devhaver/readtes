<script setup lang="ts">
/**
 * One term, as a line in a ledger rather than a card: Hebrew, the crossing
 * mark, the English the official edition uses, and — once opened — the
 * project's note, every rendering the edition actually used with its
 * frequency, and the aligned passages the term was read off.
 *
 * The crossing mark is the row's one piece of encoding: a hairline whose
 * stroke says *how* the term travels into English (solid = it becomes an
 * English word, dotted = the Hebrew word stays in Latin letters, dashed =
 * the same with a gloss, double = a Hebrew acronym becomes an initialism).
 * The chip next to it names the same fact in words; the rule is what makes
 * it scannable down 125 rows.
 *
 * Citations arrive as a prop rather than being fetched here: they live in a
 * separate ~200KB chunk (`useGlossaryCitations`) that the page loads once,
 * on the first open, for every row.
 */
import {
  glossaryAttestationTicks,
  glossaryVariantShares,
} from "~/utils/glossary";
import type {
  GlossaryCitation,
  GlossaryIndexEntry,
} from "~~/shared/types/content";

const props = defineProps<{
  entry: GlossaryIndexEntry;
  /** Part ids the English edition covers at all — the attestation strip's axis. */
  partsCovered: string[];
  /** `null` until the citations chunk has loaded. */
  citations: GlossaryCitation[] | null;
}>();

const emit = defineEmits<{ open: [] }>();

const { t } = useI18n();

const isOpen = ref(false);
const panelId = computed(() => `glossary-entry-${props.entry.id}`);

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) emit("open");
};

const ticks = computed(() =>
  glossaryAttestationTicks(props.entry, props.partsCovered),
);

const attestedPartNumbers = computed(() =>
  ticks.value.filter((tick) => tick.attested).map((tick) => tick.partNumber),
);

const attestationDescription = computed(() =>
  attestedPartNumbers.value.length === 0
    ? t("glossary.attestedNowhere")
    : t("glossary.attestedIn", {
        parts: attestedPartNumbers.value.join(", "),
      }),
);

const variantShares = computed(() =>
  glossaryVariantShares(props.entry.variants ?? []),
);
</script>

<template>
  <li class="border-t border-(--border) first:border-t-0">
    <h3>
      <button
        type="button"
        class="group flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start transition-colors hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal sm:grid sm:grid-cols-[10rem_1.75rem_minmax(0,1fr)_auto] sm:px-6"
        :aria-expanded="isOpen"
        :aria-controls="panelId"
        @click="toggle"
      >
        <!--
          The Hebrew hugs the crossing rule rather than the page edge, so
          every rule and every English term lands on the same two vertical
          lines down all 125 rows — the ledger effect the page is built on.
          `justify-end` is resolved against the *page's* direction (this
          wrapper inherits it), while the term inside keeps its own
          `dir="rtl"`, so the two agree under both locales.
        -->
        <span class="flex min-w-0 sm:justify-end">
          <!-- `break-words` is the safety valve for the one entry that spells
               its acronym out in full (נרנח״י) — without it that term runs
               out of its column and past the card's edge. -->
          <span
            class="min-w-0 font-hebrew text-2xl leading-tight break-words text-(--text-primary)"
            dir="rtl"
            lang="he"
          >
            {{ entry.he }}
          </span>
        </span>

        <span
          aria-hidden="true"
          class="glossary-crossing"
          :data-strategy="entry.strategy"
        />

        <span class="min-w-0 text-lg text-(--text-primary)" dir="ltr" lang="en">
          {{ entry.canonicalEn }}
        </span>

        <span
          class="ms-auto flex shrink-0 items-center gap-2 text-xs text-(--text-muted)"
        >
          <GlossaryAttestationStrip
            :ticks="ticks"
            :description="attestationDescription"
          />
          <span class="hidden sm:inline">{{
            t(`glossary.strategy.${entry.strategy}`)
          }}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4 transition-transform"
            :class="isOpen && 'rotate-180'"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
    </h3>

    <div v-if="isOpen" :id="panelId" class="px-4 pb-6 sm:px-6">
      <p class="text-xs text-(--text-muted) sm:hidden">
        {{ t(`glossary.strategy.${entry.strategy}`) }}
      </p>

      <p
        v-if="entry.note"
        class="mt-2 max-w-prose text-sm/relaxed text-(--text-primary)"
        dir="ltr"
        lang="en"
      >
        {{ entry.note }}
      </p>

      <p
        v-if="entry.attestation && entry.attestation !== 'attested'"
        class="mt-2 max-w-prose text-sm/relaxed text-(--warning-text)"
        dir="ltr"
        lang="en"
      >
        {{ entry.attestation }}
      </p>

      <section v-if="variantShares.length > 0" class="mt-5">
        <h4
          class="text-xs font-medium tracking-wide text-(--text-muted) uppercase"
        >
          {{ t("glossary.variantsTitle") }}
        </h4>
        <ul class="mt-2 space-y-1.5">
          <li
            v-for="{ variant, sharePct } in variantShares"
            :key="variant.en"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3"
          >
            <span class="min-w-0 truncate text-sm" dir="ltr" lang="en">
              {{ variant.en }}
            </span>
            <span class="text-xs tabular-nums text-(--text-muted)">
              {{ variant.occurrences }}
            </span>
            <span aria-hidden="true" class="glossary-variant-track col-span-2">
              <span
                class="glossary-variant-bar"
                :style="{ inlineSize: `${sharePct}%` }"
              />
            </span>
          </li>
        </ul>
        <p class="mt-2 text-xs text-(--text-muted)">
          {{ t("glossary.variantsHint") }}
        </p>
      </section>

      <section v-if="entry.citationCount > 0" class="mt-5">
        <h4
          class="text-xs font-medium tracking-wide text-(--text-muted) uppercase"
        >
          {{ t("glossary.citationsTitle") }}
        </h4>
        <p v-if="citations === null" class="mt-2 text-sm text-(--text-muted)">
          {{ t("glossary.citationsLoading") }}
        </p>
        <ul v-else class="mt-2 space-y-4">
          <li v-for="(citation, index) in citations" :key="index">
            <GlossaryQuotePair
              :he="citation.he"
              :en="citation.en"
              :chapter-id="citation.chapterId"
              :layer="citation.layer"
              :item="citation.item"
            />
          </li>
        </ul>
      </section>
    </div>
  </li>
</template>

<style scoped>
/*
 * The crossing mark. Four stroke styles for the four ways a Hebrew term
 * reaches English — the whole point is that it reads as one continuous
 * signal down the list, so it stays a hairline and never grows a label of
 * its own (the chip beside it does that job).
 *
 * `border-block-start` rather than `border-top`: the rule is drawn across
 * the inline axis and must not care which direction the page reads.
 */
.glossary-crossing {
  display: block;
  flex: none;
  inline-size: 1.75rem;
  block-size: 0;
  border-block-start-width: 1px;
  border-block-start-style: solid;
  border-block-start-color: color-mix(
    in srgb,
    var(--accent-text) 55%,
    transparent
  );
}

.glossary-crossing[data-strategy="transliterate"] {
  border-block-start-style: dotted;
}

.glossary-crossing[data-strategy="transliterate-with-gloss"] {
  border-block-start-style: dashed;
}

.glossary-crossing[data-strategy="acronym"] {
  border-block-start-width: 3px;
  border-block-start-style: double;
}

/*
 * Variant frequency, as a bar in a groove. The groove matters: without it
 * a rendering used 7 times against one used 1250 draws a 1%-wide mark that
 * reads as nothing at all, rather than as "almost never".
 */
.glossary-variant-track {
  display: block;
  block-size: 3px;
  border-radius: 2px;
  background-color: var(--border);
}

.glossary-variant-bar {
  display: block;
  block-size: 100%;
  min-inline-size: 3px;
  border-radius: 2px;
  background-color: var(--accent-text);
}

@media (prefers-reduced-motion: reduce) {
  .transition-transform,
  .transition-colors {
    transition: none;
  }
}
</style>
