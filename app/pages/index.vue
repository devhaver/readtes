<script setup lang="ts">
// Reading-first landing page. The hero implements Figma node 180:182: a
// photographic composition — night field, the printed page of Chapter 1,
// the ARI's own Tzimtzum diagram, and the Baal HaSulam portrait — under a
// navy scrim that carries the overlaid copy. Assets live in
// public/images/hero/. It stays dark in BOTH themes: the book as an object
// in the dark, framed by the page around it.
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
    <!--
      Hero: the composition alone, as designed (Figma node 180:182) — night
      field, the printed page of Chapter 1, the ARI's own Tzimtzum diagram,
      and the portrait. No copy sits on it; the words live in their own band
      below, so nothing has to fight a photograph for contrast.
    -->
    <section
      ref="heroEl"
      aria-hidden="true"
      class="tes-starfield relative h-[clamp(17rem,46vw,40rem)] overflow-hidden"
    >
      <img
        src="/images/hero/night-field.webp"
        alt=""
        width="1440"
        height="737"
        fetchpriority="high"
        class="hero-night absolute inset-0 size-full object-cover"
      />

      <img
        src="/images/hero/page-scan.webp"
        alt=""
        width="1848"
        height="616"
        loading="lazy"
        decoding="async"
        class="hero-page absolute hidden sm:block"
      />

      <img
        src="/images/hero/tzimtzum.webp"
        alt=""
        width="722"
        height="593"
        loading="lazy"
        decoding="async"
        class="hero-diagram absolute hidden md:block"
      />

      <img
        src="/images/hero/baal-hasulam.webp"
        srcset="
          /images/hero/baal-hasulam-540.webp  540w,
          /images/hero/baal-hasulam.webp     1080w
        "
        sizes="(min-width: 640px) 30vw, 46vw"
        alt=""
        width="1080"
        height="1350"
        decoding="async"
        class="hero-portrait hero-enter-portrait absolute"
      />

      <div class="hero-scrim absolute inset-0" />
    </section>

    <!-- The words, on the page surface rather than over the photograph. -->
    <section class="mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div class="hero-enter-content">
        <!-- inline-block shrink-wraps the RTL run so the lockup sits at the
             column's inline-start instead of drifting to the paragraph
             box's far edge -->
        <p
          v-if="locale !== 'he'"
          class="inline-block font-hebrew-display text-2xl font-bold text-(--text-muted) sm:text-3xl"
          dir="rtl"
          lang="he"
        >
          {{ t("home.heroTitleHebrew") }}
        </p>
        <h1
          class="mt-1 max-w-2xl text-4xl text-(--text-primary) sm:text-5xl"
          :class="
            locale === 'he' ? 'font-hebrew-display font-black' : 'font-display'
          "
        >
          {{ t("home.heroTitle") }}
        </h1>
        <p
          class="mt-1 text-xl text-(--text-muted) sm:text-2xl"
          :class="
            locale === 'he' ? 'font-hebrew-display font-bold' : 'font-display'
          "
        >
          {{ t("home.heroSubtitle") }}
        </p>
        <p class="mt-5 max-w-prose text-lg text-(--text-muted)">
          {{ t("home.description") }}
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <NuxtLink
            :to="localePath('/read/part-01/chapter-01')"
            class="inline-flex items-center gap-2 rounded-button bg-navy-primary px-5 py-2.5 text-sm font-medium text-surface-white transition-colors hover:bg-teal-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-strong"
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
            class="inline-flex items-center gap-2 rounded-button border border-(--border) px-5 py-2.5 text-sm font-medium text-(--text-primary) transition-colors hover:border-teal-strong hover:text-(--accent-text) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-strong"
          >
            {{ t("home.browseVolumes") }}
          </NuxtLink>
        </div>

        <blockquote
          class="mt-10 max-w-xl border-s-2 border-teal-strong/60 ps-5"
          :dir="locale === 'he' ? 'rtl' : 'ltr'"
        >
          <p
            class="text-xl text-(--text-primary)"
            :class="locale === 'he' ? 'font-hebrew' : 'font-display italic'"
            :lang="locale === 'he' ? 'he' : undefined"
          >
            “{{ quote }}”
          </p>
          <cite class="mt-2 block text-sm text-(--text-muted) not-italic">
            {{ t("home.quoteSource") }}
          </cite>
        </blockquote>
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
 * NOTE ON PHYSICAL PROPERTIES — a deliberate, narrow exception.
 *
 * This project's rule is logical properties only, because Hebrew RTL is
 * first-class and layout must mirror. The four rules below use top/left/
 * right on purpose: they position layers of a *fixed artwork* (Figma node
 * 180:182), not a layout. The page scan is already Hebrew set RTL, and the
 * portrait belongs at the composition's left in both locales — mirroring
 * only shuffled the picture around to no benefit. Everything that is
 * actually layout, including all the copy below the hero, stays logical.
 *
 * Layout-only styles for the hero's decorative layers; the shared
 * atmosphere pieces (.tes-starfield, .tes-duotone) live in main.css.
 * Colors come from tokens. The two drift transforms read --hero-drift,
 * set from the scroll position in <script> — absent (reduced motion, or
 * before hydration) the calc() falls back to 0 and the layers hold still.
 */
.hero-night {
  /* Behind everything. object-cover so the 1440x737 source fills any ratio.
     Full strength: the plate is a luminous nebula and dimming it flattens
     the whole composition to navy. */
  z-index: 0;
}

/*
 * The printed page, positioned as in the comp: reading column toward the
 * inline-start half, rising with the drift. Masked at every edge so it reads
 * as a page emerging from the dark rather than a rectangle pasted on.
 */
.hero-page {
  z-index: 1;
  top: 3%;
  left: 5%;
  width: clamp(32rem, 62vw, 68rem);
  height: auto;
  opacity: 0.95;
  pointer-events: none;
  transform: translateY(calc(var(--hero-drift, 0) * 0.045px));
  mask-image: radial-gradient(118% 102% at 50% 45%, black 44%, transparent 88%);
}

/* The ARI's own diagram, at the inline-end, clear of the content column. */
.hero-diagram {
  z-index: 2;
  /* right: 3rem keeps the vessel sketches on the right of the plate inside
     the frame — at 1rem they clipped off the edge. */
  top: 46%;
  right: 3rem;
  width: clamp(19rem, 30vw, 32rem);
  height: auto;
  pointer-events: none;
  transform: translateY(calc(-50% + var(--hero-drift, 0) * 0.09px));
}

/*
 * Legibility scrim. `to right` is deliberately physical-agnostic here: it is
 * expressed in logical terms via the RTL override below, so the dense end
 * always falls under the content column in both directions.
 */
.hero-scrim {
  /*
   * Was a heavy navy gradient carrying overlaid copy. The copy moved below
   * the image, so the gradient only muted the nebula and the plate. All that
   * remains is a short fade so the section doesn't end on a hard edge.
   */
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 86%,
    color-mix(in srgb, var(--surface) 30%, transparent) 100%
  );
}

/*
 * The portrait melts into the night on every side except the bottom edge
 * it rises from — a direction-agnostic radial mask, so the RTL mirror
 * needs no per-direction override.
 */
.hero-portrait {
  /*
   * Absolutely placed in the composition now, not a grid cell: inline-start,
   * taller than the frame so it bleeds off the bottom edge, which the
   * section clips. The radial mask melts every other side into the night.
   */
  z-index: 2;
  bottom: -6%;
  left: 0;
  width: clamp(12rem, 34vw, 31rem);
  height: auto;
  pointer-events: none;
  mask-image: radial-gradient(104% 96% at 50% 88%, black 42%, transparent 80%);
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
