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
    class="inline-flex h-9 w-9 items-center justify-center rounded-button text-surface-white transition-colors hover:bg-surface-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    :aria-label="label"
    :title="label"
    @click="cycleColorMode"
  >
    <!-- Sun — currently light -->
    <svg
      v-if="current === 'light'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>

    <!-- Open book — currently sepia, the reading theme -->
    <svg
      v-else-if="current === 'sepia'"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 7c-1.8-1.3-4-2-6.5-2H3v13h2.5c2.5 0 4.7.7 6.5 2" />
      <path d="M12 7c1.8-1.3 4-2 6.5-2H21v13h-2.5c-2.5 0-4.7.7-6.5 2" />
      <path d="M12 7v13" />
    </svg>

    <!-- Moon — currently dark -->
    <svg
      v-else
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  </button>
</template>
