---
paths:
  - "nuxt.config.ts"
  - "server/routes/**"
  - "app/composables/useLocalizedSeo.ts"
  - "shared/utils/sitemap.ts"
  - "shared/utils/manifestPrefetch.ts"
  - "app/app.vue"
  - "app/error.vue"
  - "designs/og-card.html"
---

# SSG / SEO — invariants

**Load the `tes-seo-ssg` skill** for the full wiring (canonical/hreflang, the
sitemap route, the 404 shell, accessibility conventions).

The ones that fail silently:

- **`runtimeConfig.public.siteUrl` is the single source** for every absolute
  URL. Override with `NUXT_PUBLIC_SITE_URL` at build time. Never hardcode a
  domain.
- **Hebrew font subsets.** `@nuxt/fonts` defaults to latin-only. Every
  Hebrew-facing family needs `subsets: ["latin", "hebrew"]` explicitly in
  `nuxt.config.ts`, or it ships with zero Hebrew glyph coverage and nothing
  errors.
- **Fonts are vendored** into `public/fonts/` + `fonts.manifest.json`, both
  **generated** — never hand-edit them, and never point the build back at
  Google. Change `GOOGLE_FONT_FAMILIES` in `nuxt.config.ts`, then run
  `pnpm fonts:vendor` and commit what it writes.
- **Contrast tokens.** Use `--color-teal-strong` for white-on-teal,
  `--accent-text` for teal text on ambient surface, `--color-orange-cta-strong`
  and `--warning-text` for the orange equivalents. Plain `text-teal` /
  `text-orange-cta` fail WCAG AA 4.5:1 for text.
- **Don't modify `public/images/og-card.png` or `designs/og-card.html`**
  without regenerating the PNG from the HTML.

`content/toc.json` **is** allowed here — `server/routes/` and `nuxt.config.ts`
are build-time, not `app/`.
