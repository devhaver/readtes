<script setup lang="ts">
/**
 * The house rules the official English edition follows — the part of the
 * glossary that is about the *prose* rather than the vocabulary (item
 * markers set as gematria numerals, commentary items opening with a bolded
 * lemma, honorifics dropped, and so on).
 *
 * Native `<details>` rather than a JS accordion: the rules and their
 * evidence prerender into the page's HTML (so they are readable without
 * JavaScript and indexable), while staying collapsed so 13 rules cost 13
 * lines of a reader's screen instead of three screenfuls.
 */
import type { GlossaryConvention } from "~~/shared/types/content";

defineProps<{ conventions: GlossaryConvention[] }>();

const { t } = useI18n();
</script>

<template>
  <ul class="mt-4 overflow-hidden rounded-card border border-(--border)">
    <li
      v-for="convention in conventions"
      :key="convention.id"
      class="border-t border-(--border) first:border-t-0"
    >
      <details class="group">
        <summary
          class="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal sm:px-6"
        >
          <span class="min-w-0 flex-1 text-sm text-(--text-primary)">
            {{ convention.topic }}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4 shrink-0 text-(--text-muted) transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>

        <div class="px-4 pb-6 sm:px-6">
          <p class="max-w-prose text-sm/relaxed text-(--text-primary)">
            {{ convention.rule }}
          </p>
          <p class="mt-2 max-w-prose text-xs/relaxed text-(--text-muted)">
            {{
              t("glossary.conventionEvidence", {
                evidence: convention.evidence,
              })
            }}
          </p>
          <ul v-if="convention.examples.length > 0" class="mt-4 space-y-4">
            <li v-for="(example, index) in convention.examples" :key="index">
              <GlossaryQuotePair
                :he="example.he"
                :en="example.en"
                :chapter-id="example.chapterId"
                :layer="example.layer"
              />
            </li>
          </ul>
        </div>
      </details>
    </li>
  </ul>
</template>

<style scoped>
/* Safari still paints its own disclosure triangle without this. */
summary::-webkit-details-marker {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .transition-transform,
  .transition-colors {
    transition: none;
  }
}
</style>
