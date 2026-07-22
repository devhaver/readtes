<script setup lang="ts">
import type { NuxtError } from "#app";

// error.vue replaces app.vue entirely when a fatal error reaches the root
// (unmatched routes at runtime, thrown errors during render) — it doesn't
// inherit app.vue's <NuxtLayout>/<NuxtPage> or its locale <html> handling,
// so both are reproduced here directly.
const props = defineProps<{ error: NuxtError }>();

const { t } = useI18n();
const localePath = useLocalePath();
const localeHead = useLocaleHead();

// See app.vue for why this cast — `@nuxtjs/i18n`'s own `MetaAttrs[]`
// return type for `link`/`meta` is looser than `useHead`'s.
useHead((() => ({
  htmlAttrs: { ...localeHead.value.htmlAttrs },
  link: localeHead.value.link,
  meta: localeHead.value.meta,
})) as unknown as Parameters<typeof useHead>[0]);

const isNotFound = computed(() => props.error.statusCode === 404);
const title = computed(() =>
  isNotFound.value ? t("errors.notFoundTitle") : t("errors.genericTitle"),
);
const message = computed(() =>
  isNotFound.value ? t("errors.notFoundMessage") : t("errors.genericMessage"),
);

useLocalizedSeo({
  title: () => `${title.value} · ${t("common.siteName")}`,
  description: () =>
    isNotFound.value
      ? t("seo.notFound.description")
      : t("errors.genericMessage"),
});

// clearError resets Nuxt's error boundary before navigating away — a plain
// NuxtLink navigation can leave the error state stuck.
const goTo = (path: string) => clearError({ redirect: path });
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
    <main
      id="main-content"
      class="mx-auto flex max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-4 py-16 sm:px-6"
    >
      <p class="font-display text-sm tracking-widest text-(--text-muted)">
        {{ error.statusCode }}
      </p>
      <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
        {{ title }}
      </h1>
      <p class="max-w-prose text-lg text-(--text-muted)">
        {{ message }}
      </p>

      <div class="flex flex-wrap items-center gap-4">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-button bg-navy-primary px-5 py-2.5 text-sm font-medium text-surface-white transition-colors hover:bg-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          @click="goTo(localePath('/'))"
        >
          {{ t("errors.notFoundBackHome") }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-button border border-(--border) px-5 py-2.5 text-sm font-medium text-(--text-primary) transition-colors hover:border-teal hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          @click="goTo(localePath('/volumes'))"
        >
          {{ t("home.browseVolumes") }}
        </button>
      </div>
    </main>
    <AppFooter />
  </div>
</template>
