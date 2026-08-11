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
  <span class="inline-flex items-center gap-1">
    <span class="sr-only">{{ description }}</span>
    <span
      aria-hidden="true"
      class="inline-flex items-end"
      :class="size === 'lg' ? 'gap-1' : 'gap-0.5'"
    >
      <span
        v-for="tick in ticks"
        :key="tick.partId"
        class="glossary-tick block rounded-[1px]"
        :class="[
          size === 'lg' ? 'h-4 w-1.5' : 'h-2.5 w-1',
          tick.attested ? 'is-attested' : 'is-absent',
        ]"
      />
    </span>
  </span>
</template>

<style scoped>
.glossary-tick.is-attested {
  background-color: var(--accent-text);
}

.glossary-tick.is-absent {
  background-color: var(--border);
}
</style>
