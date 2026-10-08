<script setup lang="ts">
import type { LocaleObject } from "@nuxtjs/i18n";

// A disclosure menu rather than a row of links: nine languages in a row
// pushed the site name onto two lines on desktop and ran off a phone's
// edge. A native `<details>` keeps every link in the server-rendered markup
// — the prerender crawler discovers each language's pages through them —
// and opens without JavaScript.
const { locale, locales, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const availableLocales = computed(() => locales.value as LocaleObject[]);
const current = computed(() =>
  availableLocales.value.find((entry) => entry.code === locale.value),
);

const menu = ref<HTMLDetailsElement | null>(null);
const close = (): void => {
  if (menu.value) menu.value.open = false;
};

// Close on navigation and on Escape, like any other menu.
const route = useRoute();
watch(() => route.fullPath, close);
const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape") close();
};
onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<template>
  <nav :aria-label="t('nav.languageSwitcherLabel')">
    <details ref="menu" class="relative">
      <summary
        class="tes-focus-ring flex cursor-pointer list-none items-center gap-1.5 rounded-button px-2 py-1 text-sm text-surface-white/90 hover:text-teal [&::-webkit-details-marker]:hidden"
      >
        <span class="sr-only">{{ t("nav.languageSwitcherLabel") }}:</span>
        <span :lang="current?.code">{{ current?.name }}</span>
        <span
          aria-hidden="true"
          class="tes-icon tes-icon-chevron-down h-3.5 w-3.5"
        />
      </summary>
      <ul
        class="absolute end-0 z-50 mt-1 flex min-w-40 flex-col rounded-card border border-(--border) bg-(--surface) py-1 shadow-lg"
      >
        <li v-for="entry in availableLocales" :key="entry.code">
          <NuxtLink
            :to="switchLocalePath(entry.code)"
            class="tes-focus-ring block px-3 py-1.5 text-sm"
            :class="
              entry.code === locale
                ? 'font-medium text-(--accent-text)'
                : 'text-(--text-primary) hover:bg-(--surface-raised)'
            "
            :aria-current="entry.code === locale ? 'true' : undefined"
            :hreflang="entry.language"
            :lang="entry.code"
            @click="close"
          >
            {{ entry.name }}
          </NuxtLink>
        </li>
      </ul>
    </details>
  </nav>
</template>
