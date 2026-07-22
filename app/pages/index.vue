<script setup lang="ts">
// Reading-first landing page. The hero anchors on a real line from the text
// (Talmud Eser Sefirot, Section I, Chapter 1, §1) rather than marketing
// copy — see content/parts/part-01/chapters/chapter-01/source.*.json for
// the source of both the English and Hebrew renderings quoted below.
const { t, locale } = useI18n();
const localePath = useLocalePath();

const openingLine: Record<string, string> = {
  en: "Before the contraction, there was the Infinite, filling all of existence.",
  he: "לפני הצמצום היה אין סוף ממלא כל המציאות",
};

const quote = computed(() => openingLine[locale.value] ?? openingLine.en);

const layers = computed(() => [
  {
    title: t("home.howItWorksSourceTitle"),
    hebrewName: t("home.howItWorksSourceHebrew"),
    body: t("home.howItWorksSourceBody"),
  },
  {
    title: t("home.howItWorksLightTitle"),
    hebrewName: t("home.howItWorksLightHebrew"),
    body: t("home.howItWorksLightBody"),
  },
  {
    title: t("home.howItWorksObservationTitle"),
    hebrewName: t("home.howItWorksObservationHebrew"),
    body: t("home.howItWorksObservationBody"),
  },
]);
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
    <!-- Hero -->
    <section
      class="relative overflow-hidden rounded-card border border-(--border) bg-(--surface-reading) px-6 py-10 sm:px-12 sm:py-14"
    >
      <div
        aria-hidden="true"
        class="absolute end-8 top-0 h-14 w-3 bg-orange-cta [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)] sm:end-12"
      />

      <p
        v-if="locale !== 'he'"
        class="font-hebrew text-lg text-(--text-muted) sm:text-xl"
        dir="rtl"
        lang="he"
      >
        {{ t("home.heroTitleHebrew") }}
      </p>
      <h1
        class="mt-1 max-w-2xl font-display text-4xl text-(--text-primary) sm:text-5xl"
      >
        {{ t("home.heroTitle") }}
      </h1>
      <p class="font-display text-xl text-(--text-muted) sm:text-2xl">
        {{ t("home.heroSubtitle") }}
      </p>
      <p class="mt-4 max-w-prose text-lg text-(--text-muted)">
        {{ t("home.description") }}
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-4">
        <NuxtLink
          :to="localePath('/read/part-01/chapter-01')"
          class="inline-flex items-center gap-2 rounded-button bg-navy-primary px-5 py-2.5 text-sm font-medium text-surface-white transition-colors hover:bg-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        >
          {{ t("home.beginReading") }}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4 rtl:rotate-180"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </NuxtLink>
        <NuxtLink
          :to="localePath('/volumes')"
          class="inline-flex items-center gap-2 rounded-button border border-(--border) px-5 py-2.5 text-sm font-medium text-(--text-primary) transition-colors hover:border-teal hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        >
          {{ t("home.browseVolumes") }}
        </NuxtLink>
      </div>

      <blockquote
        class="mt-10 max-w-xl border-s-4 border-orange-cta ps-5"
        :dir="locale === 'he' ? 'rtl' : 'ltr'"
      >
        <p
          class="text-xl text-(--text-primary)"
          :class="locale === 'he' ? 'font-hebrew' : 'font-display italic'"
        >
          “{{ quote }}”
        </p>
        <cite class="mt-2 block text-sm text-(--text-muted) not-italic">
          {{ t("home.quoteSource") }}
        </cite>
      </blockquote>
    </section>

    <!-- How this reader works -->
    <section class="mt-16">
      <h2 class="font-display text-2xl text-(--text-primary)">
        {{ t("home.howItWorksTitle") }}
      </h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-3">
        <div
          v-for="layer in layers"
          :key="layer.title"
          class="rounded-card border border-(--border) bg-(--surface) p-6"
        >
          <p
            class="font-hebrew text-sm text-(--text-muted)"
            dir="rtl"
            lang="he"
          >
            {{ layer.hebrewName }}
          </p>
          <h3 class="mt-1 font-display text-lg text-(--text-primary)">
            {{ layer.title }}
          </h3>
          <p class="mt-2 text-sm text-(--text-muted)">
            {{ layer.body }}
          </p>
        </div>
      </div>
    </section>

    <!-- Coverage note -->
    <section
      class="mt-12 rounded-card border border-(--border) bg-(--surface-raised) p-6"
    >
      <h2 class="font-display text-lg text-(--text-primary)">
        {{ t("home.coverageTitle") }}
      </h2>
      <ul class="mt-3 space-y-2 text-sm text-(--text-muted)">
        <li class="flex items-start gap-2">
          <span
            aria-hidden="true"
            class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-progress"
          />
          <span>{{ t("home.coverageHebrew") }}</span>
        </li>
        <li class="flex items-start gap-2">
          <span
            aria-hidden="true"
            class="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-(--border)"
          />
          <span>{{ t("home.coverageEnglish") }}</span>
        </li>
      </ul>
      <p class="mt-3 text-sm text-(--text-muted)">
        {{ t("home.coverageMore") }}
      </p>
    </section>
  </div>
</template>
