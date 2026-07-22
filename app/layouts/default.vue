<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-(--surface) font-body text-(--text-primary)"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-navy-primary focus:px-4 focus:py-2 focus:text-surface-white focus:outline focus:outline-2 focus:outline-teal"
    >
      {{ t("common.skipToContent") }}
    </a>
    <AppNavBar />
    <main id="main-content" class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
