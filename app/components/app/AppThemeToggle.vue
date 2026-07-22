<script setup lang="ts">
const colorMode = useColorMode();
const { t } = useI18n();

const isDark = computed(() => colorMode.value === "dark");
const label = computed(() =>
  isDark.value ? t("nav.themeToggleToLight") : t("nav.themeToggleToDark"),
);

const toggleColorMode = () => {
  colorMode.preference = isDark.value ? "light" : "dark";
};
</script>

<template>
  <button
    type="button"
    class="inline-flex h-9 w-9 items-center justify-center rounded-button text-surface-white transition-colors hover:bg-surface-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    :aria-label="label"
    @click="toggleColorMode"
  >
    <svg
      v-if="isDark"
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
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  </button>
</template>
