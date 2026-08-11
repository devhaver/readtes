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
 * Citations arrive as props rather than being fetched here: they live in a
 * separate 216KB chunk (`useGlossaryCitations`) that the page loads once,
 * on the first open, for every row. `citations === null` means "not here
 * yet"; `citationsFailed` distinguishes "still arriving" from "the chunk
 * never came", which is the difference between a spinner and a retry.
 *
 * The collapsed row is rendered 125 times into the prerendered HTML, so its
 * markup is written for bytes rather than for the usual utility-class
 * house style: the repeated class strings, the chevron and the row's own
 * geometry live in the style block below instead of in `class` attributes.
 * That is the whole reason this file hand-writes CSS — see the note over
 * `.glossary-row`.
 */
import {
  glossaryAttestationTicks,
  glossaryVariantShares,
} from "~/utils/glossary";
import type {
  GlossaryCitation,
  GlossaryIndexEntry,
} from "~~/shared/types/content";

const props = withDefaults(
  defineProps<{
    entry: GlossaryIndexEntry;
    /** Part ids the English edition covers at all — the attestation strip's axis. */
    partsCovered: string[];
    /** `null` until the citations chunk has loaded. */
    citations: GlossaryCitation[] | null;
    /** True once the citations chunk has failed to load, so rows can offer a retry. */
    citationsFailed?: boolean;
  }>(),
  { citationsFailed: false },
);

const emit = defineEmits<{ open: []; retry: [] }>();

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
  <li class="glossary-row-item">
    <h3>
      <button
        type="button"
        class="glossary-row"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? panelId : undefined"
        @click="toggle"
      >
        <!--
          The Hebrew hugs the crossing rule rather than the page edge, and the
          English hugs it from the other side, so every rule and every English
          term lands on the same two vertical lines down all 125 rows — the
          ledger effect the page is built on. Both wrappers are flex boxes
          that inherit the *page's* direction, so `end` (Hebrew) and `start`
          (English) resolve toward the crossing under both locales, while the
          terms inside keep their own `dir`. Without the English wrapper the
          `dir="ltr"` span aligns against its own direction and, under /he,
          drifts to the far side of the flexible track.
        -->
        <span class="glossary-row-he">
          <!-- `overflow-wrap` is the safety valve for the one entry that
               spells its acronym out in full (נרנח״י) — without it that term
               runs out of its column and past the card's edge. -->
          <span class="glossary-term" dir="rtl" lang="he">{{ entry.he }}</span>
        </span>

        <span
          aria-hidden="true"
          class="glossary-crossing"
          :data-strategy="entry.strategy"
        />

        <span class="glossary-row-en">
          <span class="glossary-canonical" dir="ltr" lang="en">{{
            entry.canonicalEn
          }}</span>
        </span>

        <span class="glossary-row-meta">
          <GlossaryAttestationStrip
            :ticks="ticks"
            :description="attestationDescription"
          />
          <span class="glossary-row-strategy">{{
            t(`glossary.strategy.${entry.strategy}`)
          }}</span>
          <span aria-hidden="true" class="glossary-chevron" />
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
        <div v-if="citationsFailed" class="mt-2">
          <p class="text-sm text-(--warning-text)">
            {{ t("glossary.citationsFailed") }}
          </p>
          <button
            type="button"
            class="mt-2 rounded-button border border-(--border) px-3 py-1.5 text-sm text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
            @click="emit('retry')"
          >
            {{ t("glossary.citationsRetry") }}
          </button>
        </div>
        <p
          v-else-if="citations === null"
          class="mt-2 text-sm text-(--text-muted)"
        >
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

<style>
/*
 * Unscoped on purpose, and hand-written rather than composed from utility
 * classes, for one measured reason: this row is server-rendered 125 times,
 * so every character in a `class` attribute and every `data-v-…=""` scope
 * marker is paid 125 times over in the prerendered document. Rewriting the
 * row this way took it from 2,008 rendered characters to 880 and the page
 * from 342,276 to 190,618 — measured by
 * `tests/unit/glossary-page-weight.spec.ts`, which also keeps it there.
 * Naming everything `glossary-*` keeps the unscoped rules from reaching
 * anything else.
 *
 * All colours are design tokens; all box properties are logical.
 */
.glossary-row-item {
  border-block-start: 1px solid var(--border);
}

.glossary-row-item:first-child {
  border-block-start: 0;
}

.glossary-row {
  display: flex;
  inline-size: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.75rem;
  padding-block: 0.75rem;
  padding-inline: 1rem;
  text-align: start;
  transition: background-color 150ms ease;
}

.glossary-row:hover {
  background-color: var(--surface-raised);
}

/*
 * Byte-for-byte the ring the rest of the site draws with
 * `focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal
 * focus-visible:-outline-offset-2` — the same computed style, written out
 * because the class string is what costs 125 times over.
 */
.glossary-row:focus-visible {
  outline: 2px solid var(--color-teal);
  outline-offset: -2px;
}

/* Tailwind's `sm` breakpoint, matched by hand — see the note above. */
@media (min-width: 40rem) {
  .glossary-row {
    display: grid;
    grid-template-columns: 10rem 1.75rem minmax(0, 1fr) auto;
    padding-inline: 1.5rem;
  }
}

.glossary-row-he {
  display: flex;
  min-inline-size: 0;
}

.glossary-row-en {
  display: flex;
  min-inline-size: 0;
}

@media (min-width: 40rem) {
  .glossary-row-he {
    justify-content: end;
  }
}

.glossary-term {
  min-inline-size: 0;
  font-family: var(--font-hebrew);
  font-size: 1.5rem;
  line-height: 1.25;
  overflow-wrap: break-word;
  color: var(--text-primary);
}

.glossary-canonical {
  min-inline-size: 0;
  font-size: 1.125rem;
  line-height: 1.75rem;
  color: var(--text-primary);
}

.glossary-row-meta {
  display: flex;
  margin-inline-start: auto;
  flex: none;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--text-muted);
}

.glossary-row-strategy {
  display: none;
}

@media (min-width: 40rem) {
  .glossary-row-strategy {
    display: inline;
  }
}

/*
 * The disclosure chevron, drawn with `clip-path` rather than shipped as an
 * inline `<svg>` 125 times. `clip-path` percentages resolve against the box,
 * not against the writing direction, so the mark points down under both
 * locales without a physical property anywhere.
 */
.glossary-chevron {
  display: block;
  flex: none;
  inline-size: 0.85rem;
  block-size: 0.85rem;
  background-color: currentColor;
  clip-path: polygon(14% 30%, 50% 66%, 86% 30%, 100% 44%, 50% 94%, 0 44%);
  transition: transform 150ms ease;
}

.glossary-row[aria-expanded="true"] .glossary-chevron {
  transform: rotate(180deg);
}

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
  .glossary-row,
  .glossary-chevron {
    transition: none;
  }
}
</style>
