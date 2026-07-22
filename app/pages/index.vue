<script setup lang="ts">
// Minimal, on-design placeholder home — the real landing page (volume
// index, search, progress) lands in Task 5. This page only proves the
// chrome/i18n foundation end to end.

const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <div
    class="mx-auto flex max-w-2xl flex-col items-start gap-6 px-4 py-16 sm:px-6"
  >
    <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
      {{ t("common.siteName") }}
    </h1>
    <p class="max-w-prose text-lg text-(--text-muted)">
      {{ t("home.description") }}
    </p>
    <NuxtLink
      :to="localePath('/volumes')"
      class="inline-flex items-center gap-2 rounded-button bg-navy-primary px-5 py-2.5 text-sm font-medium text-surface-white transition-colors hover:bg-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
    >
      {{ t("home.browseVolumes") }}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4 rtl:rotate-180"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </NuxtLink>
  </div>
</template>
