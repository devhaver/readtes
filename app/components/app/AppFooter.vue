<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <footer
    class="border-t border-(--border) bg-(--surface) px-4 py-6 text-center text-sm text-(--text-muted) sm:px-6"
  >
    <p>{{ t("footer.attribution") }}</p>
  </footer>
</template>
