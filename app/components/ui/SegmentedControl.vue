<script setup lang="ts" generic="T extends string">
// Generic segmented control (a `role="group"` of mutually-exclusive
// pressed/unpressed buttons) — extracted from `ReaderToolbar`'s study/panes
// mode toggle (T7/T8) so `ReadingPreferencesModal`'s font-size/theme
// pickers (T9) render the exact same segmented styling instead of
// re-implementing the pressed/border/hover classes. (The mobile pane
// switcher, `MobilePanePill`, is visually a different, bespoke pill+icon
// treatment — see that component — so it doesn't reuse this one.)
//
// `ariaLabel` (not `aria-label`) is deliberate: `aria-label`/`data-*`
// attribute names are special-cased in Vue's prop resolution for template
// type-checking, so binding `:aria-label` here doesn't reliably resolve to
// this declared prop the way `:model-value` resolves to `modelValue` —
// bind it as `:ariaLabel` at every call site instead.
export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

defineProps<{
  modelValue: T;
  options: SegmentedControlOption<T>[];
  ariaLabel: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: T] }>();
</script>

<template>
  <div
    role="group"
    :aria-label="ariaLabel"
    class="flex shrink-0 overflow-hidden rounded-button border border-(--border) text-xs"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      class="px-2.5 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      :class="[
        index > 0 && 'border-s border-(--border)',
        modelValue === option.value
          ? 'bg-teal text-surface-white'
          : 'text-(--text-primary) hover:bg-(--surface-raised)',
      ]"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
