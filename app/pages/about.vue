<script setup lang="ts">
import versions from "~~/content/versions.json";
import type { ContentVersion } from "~~/shared/types/content";

const { t, te } = useI18n();

/** Order the source groups are listed in: the open library first, then Bnei Baruch's own editions, then this site's. */
const SOURCE_ORDER: ContentVersion["source"][] = [
  "sefaria",
  "kabbalahmedia",
  "kabbalah-info",
  "curated",
  "ai",
];

const LICENSE_KEYS: Record<string, string> = {
  "Public Domain": "publicDomain",
  CC0: "cc0",
  "CC-BY": "ccBy",
  "Used with permission": "usedWithPermission",
  unknown: "unknown",
};

const SOURCE_LABEL_KEYS: Record<ContentVersion["source"], string> = {
  sefaria: "about.sourceLabelSefaria",
  curated: "about.sourceLabelCurated",
  ai: "about.sourceLabelAi",
  kabbalahmedia: "about.sourceLabelKabbalahmedia",
  "kabbalah-info": "about.sourceLabelKabbalahInfo",
};

/** A message for `key` when the catalog has one, the raw value otherwise. */
const labelOr = (key: string, fallback: string): string =>
  te(key) ? t(key) : fallback;

const groups = computed(() =>
  SOURCE_ORDER.map((source) => ({
    source,
    label: t(SOURCE_LABEL_KEYS[source]),
    editions: (versions as ContentVersion[])
      .filter((version) => version.source === source)
      .map((version) => ({
        id: version.id,
        title: version.title,
        titleDir: version.direction,
        titleLang: version.language,
        // The reader's own words for the language, the language's native name
        // only for one the catalog has no entry for yet — never the bare code.
        language: labelOr(
          `about.languageNames.${version.language}`,
          nativeLanguageName(version.language),
        ),
        license: labelOr(
          `about.licenseNames.${LICENSE_KEYS[version.license] ?? ""}`,
          version.license,
        ),
      })),
  })).filter((group) => group.editions.length > 0),
);

useLocalizedSeo({
  title: () => `${t("about.title")} · ${t("common.siteName")}`,
  description: () => t("seo.about.description"),
});
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
    <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
      {{ t("about.title") }}
    </h1>
    <p class="mt-4 max-w-prose text-lg text-(--text-muted)">
      {{ t("about.intro") }}
    </p>

    <!-- The same full-resolution cut-out as the homepage hero (no duotone),
         on the night field it was drawn for; capped on phones so it does not
         fill the screen. -->
    <figure class="mx-auto mt-10 w-44 sm:float-end sm:ms-8 sm:mt-2 sm:w-56">
      <div
        class="rounded-card border border-(--border) bg-navy-night px-4 pt-4"
      >
        <img
          src="/images/baal-hasulam-540.webp"
          :alt="t('about.portraitAlt')"
          width="540"
          height="675"
          class="w-full"
          loading="lazy"
        />
      </div>
      <figcaption class="mt-2 text-center text-sm text-(--text-muted)">
        {{ t("about.portraitCaption") }}
      </figcaption>
    </figure>

    <section class="mt-12">
      <h2 class="font-display text-2xl text-(--text-primary)">
        {{ t("about.readingModelTitle") }}
      </h2>
      <p class="mt-3 max-w-prose text-(--text-muted)">
        {{ t("about.readingModelBody") }}
      </p>
    </section>

    <section id="licenses" class="mt-12 scroll-mt-20 clear-both">
      <h2 class="font-display text-2xl text-(--text-primary)">
        {{ t("about.licensesTitle") }}
      </h2>
      <p class="mt-3 max-w-prose text-(--text-muted)">
        {{ t("about.licensesIntro") }}
      </p>

      <!-- One list per source. A row is a title, then language and license:
           stacked on a phone (a four-column table scrolled sideways with no
           cue), three columns from `sm`. -->
      <div v-for="group in groups" :key="group.source" class="mt-8">
        <h3 class="font-display text-lg text-(--text-primary)">
          {{ group.label }}
        </h3>
        <ul class="mt-3 rounded-card border border-(--border)">
          <li
            v-for="edition in group.editions"
            :key="edition.id"
            class="grid gap-1 border-t border-(--border) px-4 py-3 text-sm first:border-t-0 sm:grid-cols-[minmax(0,1fr)_9rem_12rem] sm:items-baseline sm:gap-x-4"
          >
            <span class="text-start text-(--text-primary)"
              ><bdi :dir="edition.titleDir" :lang="edition.titleLang">{{
                edition.title
              }}</bdi></span
            >
            <span class="text-(--text-muted)">
              <span class="sr-only">{{ t("about.tableHeaderLanguage") }}: </span
              >{{ edition.language }}
            </span>
            <span class="text-(--text-muted)">
              <span class="sr-only">{{ t("about.tableHeaderLicense") }}: </span
              >{{ edition.license }}
            </span>
          </li>
        </ul>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="font-display text-2xl text-(--text-primary)">
        {{ t("about.attributionTitle") }}
      </h2>
      <p class="mt-3 max-w-prose text-(--text-muted)">
        {{ t("about.attributionBody") }}
      </p>
    </section>
  </div>
</template>
