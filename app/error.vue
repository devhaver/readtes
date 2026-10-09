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
  bodyAttrs: { class: "font-body" },
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

// Real links, so they can be opened in a new tab or copied; `clearError` on
// click resets Nuxt's error boundary, which a plain NuxtLink navigation can
// otherwise leave stuck.
const actions = computed(() => [
  { to: localePath("/"), label: t("errors.notFoundBackHome"), primary: true },
  { to: localePath("/volumes"), label: t("nav.volumesLink") },
  { to: localePath("/glossary"), label: t("nav.glossaryLink") },
  { to: localePath("/about"), label: t("nav.aboutLink") },
]);
</script>

<template>
  <div
    class="flex min-h-screen flex-col bg-(--surface) font-body text-(--text-primary)"
  >
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-button focus:bg-navy-primary focus:px-4 focus:py-2 focus:text-surface-white focus:outline focus:outline-2 focus:outline-(--focus-ring-inverse)"
    >
      {{ t("common.skipToContent") }}
    </a>
    <AppNavBar />
    <main
      id="main-content"
      tabindex="-1"
      class="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-6 px-4 py-16 sm:px-6"
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
        <NuxtLink
          v-for="action in actions"
          :key="action.to"
          :to="action.to"
          class="inline-flex items-center gap-2 rounded-button px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)"
          :class="
            action.primary
              ? 'bg-teal-strong text-surface-white hover:bg-navy-primary'
              : 'border border-(--border-control) text-(--text-primary) hover:border-teal hover:text-(--accent-text) hover:underline'
          "
          @click="clearError()"
        >
          {{ action.label }}
        </NuxtLink>
      </div>
    </main>
    <AppFooter />
  </div>
</template>
