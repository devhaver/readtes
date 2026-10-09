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

const nextOf = (theme: Theme): Theme =>
  CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length] as Theme;

// `preference` may also be "system", which isn't in the cycle. Fall back to
// the *resolved* value so the first press moves somewhere visually adjacent
// instead of snapping to light.
const current = computed<Theme>(() => {
  const preference = colorMode.preference as Theme;
  if (CYCLE.includes(preference)) return preference;
  return colorMode.value === "dark" ? "dark" : "light";
});

// The prerendered page can't read the persisted preference, so it always says
// "light". Rendering the label straight from `current` would hydrate a
// returning dark/sepia visitor against that markup, and Vue does not patch an
// attribute mismatch in production — the label would stay stale. So the label
// starts on the server's answer and catches up once mounted. (The icon needs
// none of this: CSS picks it off the class on <html>.)
const displayed = ref<Theme>("light");
onMounted(() => {
  displayed.value = current.value;
});
watch(current, (value) => {
  displayed.value = value;
});

const themeName = (theme: Theme) => t(`reader.prefs.theme.${theme}`);

// Names the current theme AND where the press goes, so the one icon reads as
// one stop of a three-way cycle rather than a two-state switch.
const label = computed(() =>
  t("nav.themeToggleLabel", {
    current: themeName(displayed.value),
    next: themeName(nextOf(displayed.value)),
  }),
);

const cycleColorMode = () => {
  colorMode.preference = nextOf(current.value);
};
</script>

<template>
  <button
    type="button"
    class="tes-theme-toggle tes-focus-ring tes-focus-ring-inverse tes-touch-target relative inline-flex h-9 w-9 items-center justify-center rounded-button text-surface-white transition-colors hover:bg-surface-white/10"
    :aria-label="label"
    :title="label"
    @click="cycleColorMode"
  >
    <!-- All three icons are always rendered; CSS shows the one matching the
         class on <html> (see `.tes-theme-toggle` in main.css). Prerendered
         HTML can't know the visitor's theme, and Vue does not patch a
         class-only mismatch at hydration — picking the icon in the template
         left a returning dark/sepia visitor looking at the sun. -->
    <span
      class="tes-icon tes-icon-theme-light tes-theme-icon h-5 w-5"
      aria-hidden="true"
    />
    <span
      class="tes-icon tes-icon-theme-sepia tes-theme-icon h-5 w-5"
      aria-hidden="true"
    />
    <span
      class="tes-icon tes-icon-theme-dark tes-theme-icon h-5 w-5"
      aria-hidden="true"
    />
    <!-- One dot per stop of the cycle; the current one is lit. -->
    <span
      class="absolute inset-x-0 bottom-0.5 flex justify-center gap-0.5"
      aria-hidden="true"
    >
      <span class="tes-theme-dot tes-theme-dot-light" />
      <span class="tes-theme-dot tes-theme-dot-sepia" />
      <span class="tes-theme-dot tes-theme-dot-dark" />
    </span>
  </button>
</template>
