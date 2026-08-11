<script setup lang="ts">
/**
 * The glossary's one data device: a tick per part of the corpus the English
 * edition actually covers, lit where the thing being described is attested.
 *
 * At `size="sm"` it rides in every term's meta line, so reading down the
 * list shows at a glance which terms run through the whole evidenced corpus
 * and which are local to one part. At `size="lg"` it appears once in the
 * page header over all sixteen parts, where the eleven unlit ticks are the
 * point: they are the parts with no English text to read the terminology
 * off at all.
 *
 * Purely decorative in the accessibility tree — the caller passes the same
 * fact as a sentence in `description`, which is what a screen reader gets.
 *
 * Geometry and lit/unlit state ride on attributes rather than utility
 * classes, and the style block is deliberately unscoped, because seven of
 * these elements are server-rendered inside each of 125 prerendered rows —
 * a scope marker plus a long class string on every tick is a real fraction
 * of the document. `tests/unit/glossary-page-weight.spec.ts` holds the line.
 * Every selector is namespaced, so nothing here reaches outside the page.
 */
import type { GlossaryAttestationTick } from "~/utils/glossary";

withDefaults(
  defineProps<{
    ticks: GlossaryAttestationTick[];
    /** Sentence read instead of the ticks, e.g. "Attested in parts 1, 2 and 5". */
    description: string;
    size?: "sm" | "lg";
  }>(),
  { size: "sm" },
);
</script>

<template>
  <span class="glossary-strip" :data-size="size === 'lg' ? 'lg' : undefined">
    <span class="sr-only">{{ description }}</span>
    <span aria-hidden="true" class="glossary-ticks">
      <span
        v-for="tick in ticks"
        :key="tick.partId"
        class="glossary-tick"
        :data-lit="tick.attested ? '' : undefined"
      />
    </span>
  </span>
</template>

<style>
.glossary-strip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.glossary-ticks {
  display: inline-flex;
  align-items: end;
  gap: 0.125rem;
}

.glossary-strip[data-size="lg"] .glossary-ticks {
  gap: 0.25rem;
}

.glossary-tick {
  display: block;
  inline-size: 0.25rem;
  block-size: 0.625rem;
  border-radius: 1px;
  background-color: var(--border);
}

.glossary-tick[data-lit] {
  background-color: var(--accent-text);
}

.glossary-strip[data-size="lg"] .glossary-tick {
  inline-size: 0.375rem;
  block-size: 1rem;
}
</style>
