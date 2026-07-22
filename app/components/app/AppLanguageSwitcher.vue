<script setup lang="ts">
import type { LocaleObject } from "@nuxtjs/i18n";

const { locale, locales, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const availableLocales = computed(() => locales.value as LocaleObject[]);
</script>

<template>
  <nav :aria-label="t('nav.languageSwitcherLabel')" class="flex items-center gap-1">
    <NuxtLink
      v-for="entry in availableLocales"
      :key="entry.code"
      :to="switchLocalePath(entry.code)"
      class="rounded-button px-2 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      :class="
        entry.code === locale
          ? 'font-medium text-teal'
          : 'text-surface-white/80 hover:text-teal'
      "
      :aria-current="entry.code === locale ? 'true' : undefined"
      :hreflang="entry.language"
    >
      {{ entry.name }}
    </NuxtLink>
  </nav>
</template>
