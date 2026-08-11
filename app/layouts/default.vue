<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-(--surface) font-body text-(--text-primary)"
  >
    <a href="#main-content" class="tes-skip-link">
      {{ t("common.skipToContent") }}
    </a>
    <AppNavBar />
    <main id="main-content" class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
