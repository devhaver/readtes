<script setup lang="ts">
// The attribution names Bnei Baruch; the link to their source library is its
// own item whose text says where it goes, and is marked as opening a new tab.
const { t, locale } = useI18n();
const localePath = useLocalePath();

/** KabbalahMedia's own language path segment for each UI locale (Ukrainian is `ua` there). */
const KM_LANGUAGE_SEGMENTS: Record<string, string> = {
  en: "en",
  he: "he",
  ru: "ru",
  uk: "ua",
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  tr: "tr",
};

const sourcesUrl = computed(
  () =>
    `https://kabbalahmedia.info/${
      KM_LANGUAGE_SEGMENTS[locale.value] ?? "en"
    }/sources/`,
);

const links = computed(() => [
  { to: localePath("/about"), label: t("nav.aboutLink") },
  { to: localePath("/volumes"), label: t("nav.volumesLink") },
  { to: localePath("/glossary"), label: t("nav.glossaryLink") },
  { to: `${localePath("/about")}#licenses`, label: t("footer.licenses") },
]);

const linkClass =
  "rounded-button underline underline-offset-2 hover:text-(--accent-text) focus-visible:outline focus-visible:outline-2 focus-visible:outline-(--focus-ring)";
</script>

<template>
  <footer
    class="border-t border-(--border) bg-(--surface) px-4 py-8 text-sm text-(--text-muted) sm:px-6"
  >
    <div
      class="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-start"
    >
      <p>
        {{ t("footer.attribution", { academy: t("footer.academy") }) }}
      </p>
      <nav
        :aria-label="t('footer.navLabel')"
        class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.label"
          :to="link.to"
          :class="linkClass"
        >
          {{ link.label }}
        </NuxtLink>
        <a
          :href="sourcesUrl"
          target="_blank"
          rel="noopener noreferrer"
          :class="linkClass"
        >
          {{ t("footer.sourceLibrary")
          }}<span class="sr-only"> ({{ t("footer.newTab") }})</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="ms-1 inline h-3 w-3 rtl:-scale-x-100"
            aria-hidden="true"
          >
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </a>
      </nav>
    </div>
  </footer>
</template>
