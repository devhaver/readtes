<script setup lang="ts">
// Reading-first landing page. The hero recreates the approved mock's
// atmosphere (Figma node 4:4): a navy night field, the Baal HaSulam
// portrait duotone-blended at the inline-start, the book's own opening
// page as a faint typographic texture, and the ARI's Tzimtzum circles
// sketched at the inline-end. It stays dark in BOTH themes — the book as
// an object in the dark, framed by the page around it.
const { t, locale } = useI18n();
const localePath = useLocalePath();

// The hero anchors on a real line from the text (Talmud Eser Sefirot,
// Section I, Chapter 1, §1) rather than marketing copy — see
// content/parts/part-01/chapters/chapter-01/source.*.json for the source
// of both the English and Hebrew renderings quoted below.
const openingLine: Record<string, string> = {
  en: "Before the contraction, there was the Infinite, filling all of existence.",
  he: "לפני הצמצום היה אין סוף ממלא כל המציאות",
};

const quote = computed(() => openingLine[locale.value] ?? openingLine.en);

// The typographic texture layer: the actual opening of Chapter 1 from the
// 1956 Jerusalem edition (source.he-jerusalem-1956.json, items 1–3),
// inline anchor letters and footnote stars stripped. Hardcoded as plain
// strings — importing the chapter JSON here would ship the whole file in
// the client bundle for what is a purely decorative layer.
const heroTexture = [
  "מבאר ענין הצמצום הא' שנצטמצם אור אין סוף ב\"ה בכדי להאציל הנאצלים ולברוא הנבראים. ובו ה' ענינים: — לפני הצמצום היה אין סוף ממלא כל המציאות",
  "דע כי טרם שנאצלו הנאצלים ונבראו הנבראים, היה אור עליון פשוט ממלא כל המציאות. ולא היה שום מקום פנוי בבחינת אויר ריקני וחלל, אלא היה הכל ממולא מן אור א\"ס פשוט ההוא, ולא היה לו לא בחינת ראש ולא בחינת סוף, אלא הכל היה אור א' פשוט שוה בהשואה א', והוא הנקרא אור א\"ס.",
  "וכאשר עלה ברצונו הפשוט, לברוא העולמות ולהאציל הנאצלים. להוציא לאור שלימות פעולותיו ושמותיו וכינויו, אשר זאת היה סיבת בריאת העולמות.",
  'והנה אז צמצם את עצמו א"ס בנקודה האמצעית, אשר בו באמצע ממש, וצמצם האור ההוא, ונתרחק אל צדדי סביבות הנקודה האמצעית.',
];

// Subtle scroll parallax on the two decorative layers (transform-only, so
// no layout shift). Skipped entirely under prefers-reduced-motion — the
// CSS var never gets set and the calc() drift falls back to 0.
const heroEl = ref<HTMLElement | null>(null);
let rafId = 0;
let removeScrollListener: (() => void) | null = null;

const updateDrift = () => {
  rafId = 0;
  heroEl.value?.style.setProperty(
    "--hero-drift",
    String(Math.min(window.scrollY, 720)),
  );
};

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const onScroll = () => {
    if (!rafId) rafId = requestAnimationFrame(updateDrift);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  removeScrollListener = () => {
    window.removeEventListener("scroll", onScroll);
    if (rafId) cancelAnimationFrame(rafId);
  };
});

onBeforeUnmount(() => {
  removeScrollListener?.();
});

useLocalizedSeo({
  title: () => `${t("common.siteName")} — ${t("home.heroSubtitle")}`,
  description: () => t("seo.home.description"),
});

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
  <div>
    <!-- Hero: full-bleed night field, deliberately dark in both themes -->
    <section ref="heroEl" class="tes-starfield relative overflow-hidden">
      <!-- Chapter 1 as texture: real text, purely atmospheric -->
      <div
        aria-hidden="true"
        lang="he"
        dir="rtl"
        class="hero-texture absolute hidden select-none sm:block"
      >
        <p class="hero-texture-heading">{{ heroTexture[0] }}</p>
        <p v-for="line in heroTexture.slice(1)" :key="line.slice(0, 24)">
          {{ line }}
        </p>
      </div>

      <!-- The ARI's Tzimtzum circles at the inline-end -->
      <div aria-hidden="true" class="hero-circles absolute hidden md:block">
        <HomeTzimtzumDiagram class="h-full w-full" />
      </div>

      <div
        class="relative mx-auto grid max-w-5xl items-end gap-x-10 px-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:px-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
      >
        <!-- Portrait: duotone, rising out of the hero's bottom edge -->
        <div
          class="hero-portrait hero-enter-portrait order-2 -mb-px w-44 justify-self-center sm:order-1 sm:w-full sm:justify-self-auto"
        >
          <div class="tes-duotone">
            <img
              src="/images/baal-hasulam.webp"
              fetchpriority="high"
              alt=""
              width="720"
              height="900"
              decoding="async"
              class="w-full"
            />
          </div>
        </div>

        <!-- Content -->
        <div
          class="hero-enter-content order-1 py-12 text-surface-white sm:order-2 sm:py-16"
        >
          <!-- inline-block shrink-wraps the RTL run so the lockup sits at
               the content column's inline-start instead of drifting to the
               paragraph box's far edge -->
          <p
            v-if="locale !== 'he'"
            class="inline-block font-hebrew-display text-2xl font-bold text-surface-white/85 sm:text-3xl"
            dir="rtl"
            lang="he"
          >
            {{ t("home.heroTitleHebrew") }}
          </p>
          <h1
            class="mt-1 max-w-2xl text-4xl sm:text-5xl"
            :class="
              locale === 'he'
                ? 'font-hebrew-display font-black'
                : 'font-display'
            "
          >
            {{ t("home.heroTitle") }}
          </h1>
          <p
            class="mt-1 text-xl text-surface-white/70 sm:text-2xl"
            :class="
              locale === 'he' ? 'font-hebrew-display font-bold' : 'font-display'
            "
          >
            {{ t("home.heroSubtitle") }}
          </p>
          <p class="mt-5 max-w-prose text-lg text-surface-white/75">
            {{ t("home.description") }}
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <NuxtLink
              :to="localePath('/read/part-01/chapter-01')"
              class="inline-flex items-center gap-2 rounded-button bg-surface-warm px-5 py-2.5 text-sm font-medium text-navy-primary transition-colors hover:bg-surface-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
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
              class="inline-flex items-center gap-2 rounded-button border border-surface-white/30 px-5 py-2.5 text-sm font-medium text-surface-white transition-colors hover:border-teal hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              {{ t("home.browseVolumes") }}
            </NuxtLink>
          </div>

          <blockquote
            class="mt-10 max-w-xl border-s-2 border-teal/60 ps-5"
            :dir="locale === 'he' ? 'rtl' : 'ltr'"
          >
            <p
              class="text-xl"
              :class="locale === 'he' ? 'font-hebrew' : 'font-display italic'"
              :lang="locale === 'he' ? 'he' : undefined"
            >
              “{{ quote }}”
            </p>
            <cite class="mt-2 block text-sm text-surface-white/60 not-italic">
              {{ t("home.quoteSource") }}
            </cite>
          </blockquote>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16">
      <!-- How this reader works -->
      <section class="mt-16">
        <h2 class="font-display text-2xl text-(--text-primary)">
          {{ t("home.howItWorksTitle") }}
        </h2>
        <div class="mt-6 grid gap-6 sm:grid-cols-3">
          <article
            v-for="(layer, index) in layers"
            :key="layer.title"
            class="layer-card relative overflow-hidden rounded-card border border-(--border) bg-(--surface) p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-teal-strong/45 hover:shadow-lg"
            :style="{ '--layer-index': index }"
          >
            <span
              aria-hidden="true"
              class="absolute inset-block-0 inset-inline-start-0 w-1 bg-teal-strong"
            />
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
          </article>
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
  </div>
</template>

<style scoped>
/*
 * Layout-only styles for the hero's decorative layers; the shared
 * atmosphere pieces (.tes-starfield, .tes-duotone) live in main.css.
 * Colors come from tokens. The two drift transforms read --hero-drift,
 * set from the scroll position in <script> — absent (reduced motion, or
 * before hydration) the calc() falls back to 0 and the layers hold still.
 */
.hero-texture {
  inset-block: 0;
  inset-inline-start: 34%;
  inset-inline-end: 4%;
  padding-block-start: 3.5rem;
  font-size: 1.0625rem;
  line-height: 2.1;
  text-align: justify;
  color: color-mix(in srgb, var(--color-surface-white) 9%, transparent);
  pointer-events: none;
  transform: translateY(calc(var(--hero-drift, 0) * 0.045px));
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    black 12%,
    black 62%,
    transparent 96%
  );
}

.hero-texture p + p {
  margin-block-start: 1.4em;
}

.hero-texture-heading {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.9;
  text-align: center;
}

.hero-circles {
  inset-block-start: 50%;
  inset-inline-end: -7rem;
  width: clamp(22rem, 30vw, 28rem);
  aspect-ratio: 1;
  transform: translateY(calc(-50% + var(--hero-drift, 0) * 0.09px));
  color: color-mix(in srgb, var(--color-teal) 24%, var(--color-surface-white));
  opacity: 0.34;
}

/*
 * The portrait melts into the night on every side except the bottom edge
 * it rises from — a direction-agnostic radial mask, so the RTL mirror
 * needs no per-direction override.
 */
.hero-portrait {
  mask-image: radial-gradient(
    130% 118% at 50% 100%,
    black 58%,
    transparent 87%
  );
}

.hero-enter-content {
  animation: hero-content-in 650ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-enter-portrait {
  animation: hero-portrait-in 750ms 100ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.layer-card {
  animation: layer-card-in 520ms calc(180ms + var(--layer-index, 0) * 90ms)
    cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes hero-content-in {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
}

@keyframes hero-portrait-in {
  from {
    opacity: 0;
    transform: translateY(1.5rem) scale(0.98);
  }
}

@keyframes layer-card-in {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-enter-content,
  .hero-enter-portrait,
  .layer-card {
    animation: none;
  }

  .layer-card:hover {
    transform: none;
  }
}
</style>
