<script setup lang="ts">
import versions from "~~/content/versions.json";
import type { ContentVersion } from "~~/shared/types/content";

const { t } = useI18n();

const sourceLabels: Record<ContentVersion["source"], string> = {
  sefaria: t("about.sourceLabelSefaria"),
  curated: t("about.sourceLabelCurated"),
  ai: t("about.sourceLabelAi"),
  kabbalahmedia: t("about.sourceLabelKabbalahmedia"),
};

const languageLabels: Record<string, string> = {
  en: t("about.languageLabelEn"),
  he: t("about.languageLabelHe"),
};

const editions = computed(() =>
  (versions as ContentVersion[]).map((version) => ({
    id: version.id,
    title: version.title,
    titleDir: version.direction,
    titleLang: version.language,
    language: languageLabels[version.language] ?? version.language,
    license: version.license,
    source: sourceLabels[version.source],
    isAi: version.source === "ai",
  })),
);

useLocalizedSeo({
  title: () => t("about.title"),
  description: () => t("seo.about.description"),
});
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
      {{ t("about.title") }}
    </h1>
    <p class="mt-4 max-w-prose text-lg text-(--text-muted)">
      {{ t("about.intro") }}
    </p>

    <!-- Same night-field duotone treatment as the homepage hero, so the
         portrait reads as one object across the site. -->
    <figure class="mt-10 sm:float-end sm:ms-8 sm:mt-2 sm:w-56">
      <div
        class="tes-duotone rounded-card border border-(--border) bg-navy-night"
      >
        <img
          src="/images/baal-hasulam.webp"
          :alt="t('about.portraitAlt')"
          width="720"
          height="900"
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

    <section class="mt-12">
      <h2 class="font-display text-2xl text-(--text-primary)">
        {{ t("about.licensesTitle") }}
      </h2>
      <p class="mt-3 max-w-prose text-(--text-muted)">
        {{ t("about.licensesIntro") }}
      </p>

      <div class="mt-6 overflow-x-auto rounded-card border border-(--border)">
        <table class="w-full text-start text-sm">
          <caption class="sr-only">
            {{
              t("about.licensesTableCaption")
            }}
          </caption>
          <thead class="bg-(--surface-raised)">
            <tr>
              <th scope="col" class="px-4 py-3 text-start font-medium">
                {{ t("about.tableHeaderTitle") }}
              </th>
              <th scope="col" class="px-4 py-3 text-start font-medium">
                {{ t("about.tableHeaderLanguage") }}
              </th>
              <th scope="col" class="px-4 py-3 text-start font-medium">
                {{ t("about.tableHeaderLicense") }}
              </th>
              <th scope="col" class="px-4 py-3 text-start font-medium">
                {{ t("about.tableHeaderSource") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="edition in editions"
              :key="edition.id"
              class="border-t border-(--border)"
            >
              <th
                scope="row"
                class="px-4 py-3 text-start font-normal"
                :dir="edition.titleDir"
                :lang="edition.titleLang"
              >
                {{ edition.title }}
              </th>
              <td class="px-4 py-3 text-(--text-muted)">
                {{ edition.language }}
              </td>
              <td class="px-4 py-3 text-(--text-muted)">
                {{ edition.license }}
              </td>
              <td class="px-4 py-3 text-(--text-muted)">
                <span class="inline-flex items-center gap-1.5">
                  {{ edition.source }}
                  <span
                    v-if="edition.isAi"
                    aria-hidden="true"
                    class="h-1.5 w-1.5 rounded-full bg-orange-cta"
                  />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
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
