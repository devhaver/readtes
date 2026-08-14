---
name: tes-seo-ssg
description: Static-generation and SEO wiring — siteUrl runtime config, canonical/hreflang/og meta, prerendered sitemap.xml and robots.txt, Hebrew font subsetting, the 404.html shell, and the accessibility/contrast token conventions. Use when touching nuxt.config.ts, server/routes/, useLocalizedSeo, fonts, og-card assets, or any focus-ring/contrast styling.
---

# SSG / SEO

- **`runtimeConfig.public.siteUrl`** (`nuxt.config.ts`) is the single source
  of truth for every absolute URL the app emits — canonical links, hreflang
  alternates, `og:url`/`og:image`, `sitemap.xml`, `robots.txt`'s `Sitemap:`
  line. Default `https://readtes.com` (the production domain);
  override at build time with `NUXT_PUBLIC_SITE_URL` (Nuxt's standard
  public-runtime-config env convention). `i18n.baseUrl` is wired from the
  same value, so `useLocaleHead()` emits absolute alternates.
- **`app.vue`/`error.vue`** forward `useLocaleHead()`'s `link`/`meta`
  arrays into `useHead` (canonical, hreflang + x-default, `og:url`,
  `og:locale`/`og:locale:alternate`) — every page gets these for free.
  Per-page `<title>`/description/`og:title`/`og:description`/`og:type`/
  `og:site_name`/`og:image` (+ dims/alt)/`twitter:card` come from
  `useLocalizedSeo()` (`app/composables/useLocalizedSeo.ts`), called once
  near the top of each page's `<script setup>`; description copy lives
  under the `seo.*` i18n namespace (real English + Hebrew, not
  placeholder). `public/images/og-card.png` (1200×630, rendered from
  `designs/og-card.html`) is the shared `og:image` for every page — don't
  modify either file.
- **`sitemap.xml`/`robots.txt`** are Nitro server routes
  (`server/routes/sitemap.xml.ts`, `robots.txt.ts`), prerendered into the
  static output (both listed in `nitro.prerender.routes`, since nothing
  links to them for the crawler to find). The URL-list logic is a pure,
  unit-tested function (`shared/utils/sitemap.ts`,
  `tests/unit/sitemap.spec.ts`) over `content/toc.json` — the site's route
  universe is a pure function of the ToC, so no heavyweight sitemap/SEO
  module is needed. `public/robots.txt` was deleted (it's now the dynamic
  route, which derives its `Sitemap:` line from `siteUrl`).
- **Fonts are vendored, and the build makes no font requests** (issue
  #121). `public/fonts/*.woff2` holds the files; `fonts.manifest.json`
  records every `@font-face` (family, weight, style, `unicode-range`, file);
  `scripts/lib/vendored-fonts.ts` is the `@nuxt/fonts` provider that reads
  them, and every remote provider is set to `false` in `nuxt.config.ts` so
  this is a property of the config rather than of every family happening to
  name `vendored`. Both artifacts are **generated — never hand-edit them**.

  Why: `@nuxt/fonts` downloaded each subset at build time and a single
  `fonts.gstatic.com` 404 failed the whole deploy — twice in one day, on
  commits with nothing wrong with them — and a failed deploy is invisible
  from outside, because `main` merges and the site keeps serving the
  previous build.

  **To change a family, weight, style or subset**, edit
  `GOOGLE_FONT_FAMILIES` in `nuxt.config.ts` and run **`pnpm fonts:vendor`**.
  It builds once with `FONTS_SOURCE=google` (the only path that still
  fetches) and records exactly what that produced, so the vendored output is
  a recording of the real provider rather than a second guess at it. Review
  the diff, commit both artifacts.

- **Hebrew font subsets.** `@nuxt/fonts`' default subset list is
  latin-only and does not include `hebrew` — the three Hebrew faces
  (Frank Ruhl Libre, David Libre, Heebo) each list
  `subsets: ["latin", "hebrew"]` explicitly in `GOOGLE_FONT_FAMILIES`.
  Inter and Taviraj (no Hebrew glyphs) are left alone. If you add a
  new Hebrew-facing font family, give it the same `subsets` entry or it
  will silently render with zero Hebrew glyph coverage.
- **`scripts/verify-font-output.mjs` runs in `task check` and both
  workflows**, after `generate`. Every way the fonts go missing leaves the
  build _succeeding_: a dropped Hebrew subset ships zero glyphs for
  U+0590–05FF, and a provider whose shape the module doesn't recognise
  resolves no faces at all (measured — the site shipped with no
  `@font-face` rules whatsoever and nothing complained).
- **`404.html`.** `pnpm generate`'s static Nitro preset prerenders
  `/404.html` automatically. Its raw HTML is an empty pre-hydration shell
  (`data-ssr="false"` — Nuxt's standard static-hosting fallback: the file
  exists so a static host serves _something_ with a 404 status for an
  unmatched path, and client-side hydration then renders `error.vue`'s
  styled 404 state once JS runs) — this is expected, not a bug. Verify
  with a headless browser (not just `curl`/viewing raw HTML) if you need
  to confirm the rendered state.

## Accessibility conventions

Every layout (`default`, `reader`, `error.vue`) starts with a
visually-hidden skip link to `#main-content` (localized via
`common.skipToContent`), and exactly one `<main id="main-content">`
landmark. The reader page's toolbar carries that page's one `<h1>`
(`sr-only`, the chapter title — `ReaderToolbar`'s `chapterTitle` prop),
since nothing else on that page is heading-shaped.

Interactive elements get a `focus-visible:outline focus-visible:outline-2
focus-visible:outline-teal` (or the token-derived contrast-safe variants
below) — match this exact utility set rather than inventing a new ring
style.

Four contrast-driven tokens live in `main.css`:

- `--color-teal-strong` — a darkened teal that clears 4.5:1 against every
  light-mode surface and against white text. Use for any "white text on a
  teal background" active/selected state.
- `--accent-text` — theme-aware semantic variable (teal-strong in light
  mode, the bright `--color-teal` in dark mode). Use for teal-colored
  _text_ sitting directly on the ambient surface, e.g. `.tes-anchor`.
- `--color-orange-cta-strong` — a darkened orange that clears 4.5:1
  against every light-mode surface.
- `--warning-text` — theme-aware semantic variable (orange-cta-strong in
  light mode, the brighter `--color-orange-cta` in dark mode, where the
  original already clears 4.5:1). Use for the "AI translated" badge and
  the missing-anchor notice text.

Don't reintroduce plain `text-teal`/`bg-teal` or `text-orange-cta` for
text-on-surface or white-on-teal contexts; all measured under WCAG AA's
4.5:1 there. `--color-orange-cta` itself stays fine for non-text uses
(badge/notice borders, decorative bullets).
