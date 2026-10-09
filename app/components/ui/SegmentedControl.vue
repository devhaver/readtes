<script setup lang="ts" generic="T extends string">
// Generic segmented control (a `role="group"` of mutually-exclusive
// pressed/unpressed buttons) — extracted from `ReaderToolbar`'s study/panes
// mode toggle (T7/T8) so `ReadingPreferencesModal`'s font-size/theme
// pickers (T9) render the exact same segmented styling instead of
// re-implementing the pressed/border/hover classes. (The mobile pane
// switcher, `MobilePanePill`, is visually a different, bespoke pill+icon
// treatment — see that component — so it doesn't reuse this one.)
//
export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

defineProps<{
  modelValue: T;
  options: SegmentedControlOption<T>[];
  accessibleLabel: string;
  /** Stretch to the container, segments sharing the width equally. */
  fill?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: T] }>();
</script>

<template>
  <!-- No `overflow-hidden` on the group: it clipped the focus ring on the
       first and last segment. The ends are rounded on the segments instead,
       and the ring is drawn inset (see `.tes-segment`). -->
  <div
    role="group"
    :aria-label="accessibleLabel"
    class="max-w-full text-xs"
    :class="fill ? 'flex w-full' : 'inline-flex shrink-0'"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      class="tes-segment tes-segment-target border border-(--border-control) px-2.5 py-1 text-center leading-tight first:rounded-s-button last:rounded-e-button"
      :class="[
        fill ? 'min-w-0 flex-1' : 'whitespace-nowrap',
        index > 0 && '-ms-px',
        modelValue === option.value
          ? 'border-teal-strong bg-teal-strong text-surface-white'
          : 'text-(--text-primary) hover:bg-(--surface-raised)',
      ]"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
