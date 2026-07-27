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
    <section
      ref="heroEl"
      class="tes-starfield hero-section relative overflow-hidden"
    >
      <!-- Decorative layers are positioned against this capped frame, not the
           viewport: past ~1920px they would otherwise drift to the far edges
           and leave the composition strung out across the middle. The night
           field itself stays full-bleed. -->
      <div aria-hidden="true" class="hero-frame absolute inset-0">
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

        <!--
        The ARI's own Tzimtzum plate (Figma node 109:3) — the drawn figure
        with its annotations and vessel sketches, not an SVG approximation
        of it. Deliberately NOT mirrored under RTL: it is a scanned artwork
        whose Hebrew annotations already read right-to-left, so flipping it
        would reverse the handwriting.
      -->
        <img
          aria-hidden="true"
          src="/images/tzimtzum-diagram.webp"
          alt=""
          width="722"
          height="593"
          loading="lazy"
          decoding="async"
          class="hero-circles absolute hidden md:block"
        />
      </div>

      <div
        dir="ltr"
        class="relative mx-auto grid max-w-7xl items-end gap-x-10 px-4 sm:grid-cols-[17rem_minmax(0,1fr)] sm:px-6 lg:grid-cols-[20rem_minmax(0,1fr)]"
      >
        <!-- Portrait: duotone, rising out of the hero's bottom edge -->
        <div
          class="hero-portrait hero-enter-portrait order-2 -mb-6 w-52 justify-self-center sm:order-1 sm:-mb-8 sm:w-full sm:justify-self-auto"
        >
          <!--
            Full-resolution cut-out (Figma node 117:724) at the same display
            size as before. The duotone wash existed to prop up a 24KB crop;
            over this source it only flattens the face.
          -->
          <img
            src="/images/baal-hasulam.webp"
            srcset="
              /images/baal-hasulam-540.webp  540w,
              /images/baal-hasulam.webp     1080w
            "
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 17rem, 13rem"
            fetchpriority="high"
            alt=""
            width="1080"
            height="1350"
            decoding="async"
            class="w-full"
          />
        </div>

        <!-- Content -->
        <div
          :dir="locale === 'he' ? 'rtl' : 'ltr'"
          class="hero-copy hero-enter-content order-1 py-12 text-surface-white sm:order-2 sm:py-16"
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
/*
 * The hero's height was whatever the copy happened to need, and Hebrew sets
 * more compactly than English — 462px against 526px at 1440. Because the
 * portrait is bottom-anchored and bleeds past the edge, that shorter section
 * cropped more of him off, which read as the image being a different size
 * between languages. It never was: both render at exactly 320x400. A floor
 * keeps the frame identical whatever the copy does.
 */
.hero-section {
  min-block-size: clamp(26rem, 38vw, 34rem);
  /*
   * The min-height above can exceed what the copy needs. Without this the
   * grid stays at the top of the section and the bottom-aligned portrait
   * floats, with starfield showing beneath his coat. Ending the flex column
   * puts the grid's bottom on the section's bottom, so he still rises out of
   * the edge.
   */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.hero-frame {
  inline-size: min(100%, 120rem);
  margin-inline: auto;
  pointer-events: none;
}

.hero-texture {
  /* Physical on purpose: this is the book's own page set as artwork, already
     RTL Hebrew. Mirroring it just moves the block for no reason. */
  inset-block: 0;
  left: 30%;
  right: 24%;
  padding-block-start: 3.5rem;
  font-size: 1.0625rem;
  line-height: 2.1;
  text-align: justify;
  /*
   * This layer sits directly behind the headline and body copy (it spans
   * 34%–96% of the inline axis, and the content column starts around 37%).
   * At a legible opacity the Hebrew reads as *text competing with the copy*
   * rather than as atmosphere. Two changes keep it subliminal: a lower
   * alpha, and a small blur so the glyphs never resolve into words.
   */
  color: color-mix(in srgb, var(--color-surface-white) 5%, transparent);
  filter: blur(1.1px);
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

/*
 * Physical padding-right, not padding-inline-end. The plate is pinned to the
 * physical right in both directions, so the copy needs to clear it on that
 * same side regardless of writing direction — a logical property would move
 * the gutter to the left under RTL and let the Hebrew, which right-aligns,
 * run straight across the drawing.
 */
.hero-copy {
  padding-right: 0;
}

@media (min-width: 48rem) {
  .hero-copy {
    padding-right: clamp(15rem, 23vw, 27rem);
  }
}

.hero-circles {
  inset-block-start: 50%;
  /*
   * Physical `right` on purpose. This is artwork, not layout — the plate's
   * Hebrew annotations are already RTL, so mirroring it would flip the
   * handwriting. Everything that is layout in this file stays logical.
   */
  /* Same gutter as the content grid (max-w-7xl + px-6), so the plate's right
     margin matches the portrait's left one instead of hugging the viewport
     edge. Tracks the capped frame, so it stays aligned on wide monitors. */
  right: calc(max(0px, (100% - 80rem) / 2) + 1.5rem);
  width: clamp(14rem, 18vw, 22rem);
  height: auto;
  /* Fully inside the frame — at negative offsets the vessel sketches on the
     plate's right edge were being clipped. Held back from full strength so
     it doesn't compete with the body copy it sits beside. */
  opacity: 0.7;
  transform: translateY(calc(-50% + var(--hero-drift, 0) * 0.09px));
}

/*
 * No mask. The source (Figma node 117:724) is a true cut-out — its top
 * corners are fully transparent — so the alpha channel already does the
 * blending. The radial mask that used to live here was centred at the
 * bottom, which meant it faded hardest at the TOP: it erased the crown of
 * the hat and left a visible boxy falloff around him. It existed to hide
 * the hard edges of the old 24KB rectangular crop, which no longer exists.
 */
.hero-portrait {
  filter: drop-shadow(
    0 0 2.5rem color-mix(in srgb, var(--color-navy-night) 70%, transparent)
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
