<script setup lang="ts">
/**
 * `/glossary` — the terminology of Talmud Eser Sefirot, and the English the
 * official Bnei Baruch edition actually uses for each term.
 *
 * Payload discipline (see AGENTS.md "Content model"): the canonical
 * `content/glossary/tes-en.json` is 307KB and is build-time only. This page
 * loads the derived 77KB index via `useGlossaryIndex()` (50KB once
 * minified, 11.5KB gzipped from there), and the 216KB of citation excerpts
 * only when a reader
 * opens their first term (`useGlossaryCitations()`). Neither chunk is
 * prefetchable — both are stripped in `shared/utils/manifestPrefetch.ts` —
 * so no other page in the site pays a byte for this one.
 *
 * All 125 rows and all 13 house rules are server-rendered rather than
 * paged or virtualised: a glossary that cannot be found with the browser's
 * own find-in-page, or read without JavaScript, is not a reference. That
 * makes this the site's heaviest document by design, so the row markup is
 * written for bytes (see the style block in `GlossaryEntryRow.vue`).
 */
import {
  filteredGlossaryEntries,
  GLOSSARY_STRATEGIES,
  glossaryAttestationTicks,
  glossaryStrategyCounts,
  partNumberFromId,
} from "~/utils/glossary";
import type { GlossaryStrategy } from "~~/shared/types/content";

const { t, locale } = useI18n();

const { meta, entries, conventions, knownGaps } = await useGlossaryIndex();
const { citationsFor, hasFailed, hasLoaded, loadCitations } =
  useGlossaryCitations();
const { formatDate } = useFormattedDate();

const query = ref("");
const strategy = ref<GlossaryStrategy | null>(null);

const visibleEntries = computed(() =>
  filteredGlossaryEntries(entries.value, {
    query: query.value,
    strategy: strategy.value,
  }),
);

const strategyCounts = computed(() => glossaryStrategyCounts(entries.value));

const selectStrategy = (value: GlossaryStrategy | null) => {
  strategy.value = strategy.value === value ? null : value;
};

const clearFilters = () => {
  query.value = "";
  strategy.value = null;
};

/**
 * The header's evidence strip, over all sixteen parts rather than only the
 * covered ones: the eleven unlit ticks are the honest headline of this
 * page. Reuses the same tick shape every row carries, with a synthetic
 * "entry" attested exactly where the corpus is.
 */
const coverageTicks = computed(() => {
  const allParts = [...meta.value.partsCovered, ...meta.value.partsNotCovered]
    .slice()
    .sort((a, b) => (partNumberFromId(a) ?? 0) - (partNumberFromId(b) ?? 0));

  return glossaryAttestationTicks(
    {
      id: "corpus",
      he: "",
      canonicalEn: "",
      strategy: "translate",
      attestedInParts: meta.value.partsCovered,
      citationCount: 0,
    },
    allParts,
  );
});

const coveredPartNumbers = computed(() =>
  meta.value.partsCovered
    .flatMap((partId) => {
      const number = partNumberFromId(partId);
      return number === null ? [] : [number];
    })
    .join(", "),
);

useLocalizedSeo({
  title: () => t("glossary.title"),
  description: () => t("seo.glossary.description"),
});
</script>

<template>
  <div class="pb-16">
    <header class="border-b border-(--border) bg-(--surface-reading)">
      <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <!-- The Hebrew lockup over the English title, as on the homepage
             hero. Dropped under /he/, where the h1 is already Hebrew. -->
        <p
          v-if="locale !== 'he'"
          class="inline-block font-hebrew-display text-lg font-bold text-(--text-muted)"
          dir="rtl"
          lang="he"
        >
          {{ t("glossary.titleHebrew") }}
        </p>
        <h1
          class="mt-1 font-display text-3xl text-(--text-primary) sm:text-4xl"
        >
          {{ t("glossary.title") }}
        </h1>
        <p class="mt-4 max-w-prose text-lg text-(--text-muted)">
          {{ t("glossary.lede", { count: meta.entryCount }) }}
        </p>

        <!-- Evidence, stated before anything is claimed. -->
        <div
          class="mt-8 rounded-card border border-(--border) bg-(--surface) p-4 sm:p-5"
        >
          <p class="max-w-prose text-sm/relaxed text-(--text-muted)">
            {{
              t("glossary.evidence", {
                chapters: meta.alignedChapters,
                items: meta.alignedItemPairs,
              })
            }}
          </p>
          <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <GlossaryAttestationStrip
              size="lg"
              :ticks="coverageTicks"
              :description="
                t('glossary.coverageStripDescription', {
                  parts: coveredPartNumbers,
                })
              "
            />
            <p class="text-sm text-(--text-primary)">
              {{ t("glossary.coverageParts", { parts: coveredPartNumbers }) }}
            </p>
          </div>
          <p class="mt-4 max-w-prose text-xs/relaxed text-(--text-muted)">
            {{ t("glossary.languageNote") }}
          </p>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-4xl px-4 sm:px-6">
      <!-- Lookup bar. Sticky, because looking a term up is why anyone is
           here and 125 rows is well past a screenful. -->
      <section
        class="sticky top-0 z-10 -mx-4 border-b border-(--border) bg-(--surface)/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
        :aria-label="t('glossary.filtersLabel')"
      >
        <label class="block">
          <span class="sr-only">{{ t("glossary.searchLabel") }}</span>
          <input
            v-model="query"
            type="search"
            autocomplete="off"
            :placeholder="
              t('glossary.searchPlaceholder', { count: meta.entryCount })
            "
            class="w-full rounded-input border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          />
        </label>

        <div
          role="group"
          :aria-label="t('glossary.strategyFilterLabel')"
          class="mt-2 flex flex-wrap items-center gap-1.5"
        >
          <button
            v-for="option in GLOSSARY_STRATEGIES"
            :key="option"
            type="button"
            :aria-pressed="strategy === option"
            class="rounded-button border px-2.5 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
            :class="
              strategy === option
                ? 'border-teal-strong bg-teal-strong text-surface-white'
                : 'border-(--border) text-(--text-muted) hover:bg-(--surface-raised)'
            "
            @click="selectStrategy(option)"
          >
            {{ t(`glossary.strategy.${option}`) }}
            <span class="tabular-nums opacity-70">{{
              strategyCounts[option]
            }}</span>
          </button>
        </div>
      </section>

      <!-- The heading is visually redundant next to the lookup bar, but the
           125 term rows are `h3`s: without it the document jumps h1 → h3,
           which is a real outline break for anyone navigating by heading. -->
      <section class="mt-6" aria-labelledby="glossary-terms-heading">
        <h2 id="glossary-terms-heading" class="sr-only">
          {{ t("glossary.termsLabel") }}
        </h2>
        <p class="text-xs text-(--text-muted)" aria-live="polite">
          {{
            t("glossary.resultCount", {
              shown: visibleEntries.length,
              total: meta.entryCount,
            })
          }}
        </p>

        <ul
          v-if="visibleEntries.length > 0"
          class="mt-2 overflow-hidden rounded-card border border-(--border)"
        >
          <GlossaryEntryRow
            v-for="entry in visibleEntries"
            :key="entry.id"
            :entry="entry"
            :parts-covered="meta.partsCovered"
            :citations="hasLoaded ? citationsFor(entry.id) : null"
            :citations-failed="hasFailed"
            @open="loadCitations"
            @retry="loadCitations"
          />
        </ul>

        <div
          v-else
          class="mt-2 rounded-card border border-(--border) px-4 py-10 text-center"
        >
          <p class="text-(--text-primary)">
            {{ t("glossary.emptyTitle") }}
          </p>
          <p class="mt-1 text-sm text-(--text-muted)">
            {{ t("glossary.emptyBody") }}
          </p>
          <button
            type="button"
            class="mt-4 rounded-button border border-(--border) px-3 py-1.5 text-sm text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
            @click="clearFilters"
          >
            {{ t("glossary.clearFilters") }}
          </button>
        </div>
      </section>

      <section class="mt-14">
        <h2 class="font-display text-2xl text-(--text-primary)">
          {{ t("glossary.conventionsTitle") }}
        </h2>
        <p class="mt-2 max-w-prose text-(--text-muted)">
          {{ t("glossary.conventionsIntro") }}
        </p>
        <GlossaryConventionList :conventions="conventions" />
      </section>

      <section class="mt-14">
        <h2 class="font-display text-2xl text-(--text-primary)">
          {{ t("glossary.limitsTitle") }}
        </h2>
        <p class="mt-2 max-w-prose text-(--text-muted)">
          {{ t("glossary.limitsIntro") }}
        </p>
        <ul class="mt-4 space-y-3">
          <li
            v-for="(gap, index) in knownGaps"
            :key="index"
            class="flex items-start gap-2 text-sm/relaxed text-(--text-muted)"
          >
            <span
              aria-hidden="true"
              class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-cta"
            />
            <span dir="ltr" lang="en">{{ gap }}</span>
          </li>
        </ul>

        <details class="mt-6 rounded-card border border-(--border)">
          <summary
            class="cursor-pointer px-4 py-3 text-sm text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal sm:px-6"
          >
            {{ t("glossary.methodTitle") }}
          </summary>
          <div class="px-4 pb-5 sm:px-6">
            <p
              class="max-w-prose text-sm/relaxed text-(--text-muted)"
              dir="ltr"
              lang="en"
            >
              {{ meta.method }}
            </p>
            <dl class="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs text-(--text-muted)">
                  {{ t("glossary.methodSource") }}
                </dt>
                <dd class="text-(--text-primary)" dir="ltr" lang="en">
                  {{ meta.sourceVersion }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-(--text-muted)">
                  {{ t("glossary.methodReference") }}
                </dt>
                <dd class="text-(--text-primary)" dir="ltr" lang="en">
                  {{ meta.referenceVersion }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-(--text-muted)">
                  {{ t("glossary.methodGeneratedOn") }}
                </dt>
                <dd class="text-(--text-primary)">
                  <time :datetime="meta.generatedOn">{{
                    formatDate(meta.generatedOn)
                  }}</time>
                </dd>
              </div>
            </dl>
          </div>
        </details>
      </section>
    </div>
  </div>
</template>
