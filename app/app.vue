<script setup lang="ts">
const localeHead = useLocaleHead();

useHead(() => ({
  htmlAttrs: { ...localeHead.value.htmlAttrs },
}));
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
