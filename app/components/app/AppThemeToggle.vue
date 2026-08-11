<script setup lang="ts">
// Three themes, so this cycles rather than toggles: light -> sepia -> dark.
// Sepia is itself a light theme, so the order runs brightest to darkest and
// a press never jumps between extremes.
//
// A cycling button is fine for three; at four it becomes a guessing game and
// should turn into a menu. Anyone who wants to pick directly — or choose
// "system" — has the labelled picker in the reader's preferences modal.
const colorMode = useColorMode();
const { t } = useI18n();

const CYCLE = ["light", "sepia", "dark"] as const;
type Theme = (typeof CYCLE)[number];

// `preference` may also be "system", which isn't in the cycle. Fall back to
// the *resolved* value so the first press moves somewhere visually adjacent
// instead of snapping to light.
const current = computed<Theme>(() => {
  const preference = colorMode.preference as Theme;
  if (CYCLE.includes(preference)) return preference;
  return colorMode.value === "dark" ? "dark" : "light";
});

const next = computed<Theme>(
  () => CYCLE[(CYCLE.indexOf(current.value) + 1) % CYCLE.length] as Theme,
);

// The label names where the press will take you, not where you are.
const label = computed(() =>
  t(
    {
      light: "nav.themeToggleToLight",
      sepia: "nav.themeToggleToSepia",
      dark: "nav.themeToggleToDark",
    }[next.value],
  ),
);

const cycleColorMode = () => {
  colorMode.preference = next.value;
};
</script>

<template>
  <button
    type="button"
    class="tes-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-button text-surface-white transition-colors hover:bg-surface-white/10"
    :aria-label="label"
    :title="label"
    @click="cycleColorMode"
  >
    <!-- Three structurally distinct spans, NOT one span with a dynamic
         class: prerendered HTML always says "light" (SSR can't read the
         persisted preference), and Vue does not patch a class-only
         mismatch at hydration — a returning dark/sepia visitor would keep
         the sun icon until their first click. The v-if chain forces the
         structural hydration bail-out that re-renders the right icon,
         which is exactly how the original three-SVG version behaved. -->
    <span
      v-if="current === 'dark'"
      class="tes-icon tes-icon-theme-dark h-5 w-5"
      aria-hidden="true"
    />
    <span
      v-else-if="current === 'sepia'"
      class="tes-icon tes-icon-theme-sepia h-5 w-5"
      aria-hidden="true"
    />
    <span
      v-else
      class="tes-icon tes-icon-theme-light h-5 w-5"
      aria-hidden="true"
    />
  </button>
</template>
