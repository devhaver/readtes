/**
 * Pure sitemap URL-list builder — no Nuxt/Nitro runtime context, so it's
 * directly unit-testable against the real `content/toc.json`
 * (`tests/unit/sitemap.spec.ts`). `server/routes/sitemap.xml.ts` is the
 * thin Nitro route that calls this at generate time and serves the
 * result.
 *
 * Route universe: the four static top-level pages (the home page, the
 * about page, the glossary, the volumes index) plus every volume's contents
 * page and every chapter's reader page — the same universe as
 * `nitro.prerender.routes` in `nuxt.config.ts` plus the crawled static
 * pages. `/design-tokens` is a dev-only debug route with no entry in
 * `toc.json` and is never a candidate here — there's nothing to exclude,
 * since this builder only ever emits paths it derives from the ToC.
 */
import type { Toc } from "~~/shared/types/content";

/**
 * The fully prerendered locales, default first (`prefix_except_default`:
 * the default is unprefixed). The other interface languages
 * (`SPA_READER_LOCALES` in `nuxt.config.ts`) render their reader pages in
 * the browser from the 404 shell, so their chapter URLs are not listed
 * here as indexable pages.
 */
export const SITEMAP_LOCALES = ["en", "he", "ru"] as const;
export type SitemapLocale = string;

export interface SitemapEntry {
  /** Locale-agnostic path, e.g. "/volumes/volume-1" or "/read/part-01/chapter-01". */
  path: string;
  /** Absolute URL of each listed locale's variant, default locale first. */
  urls: Record<SitemapLocale, string>;
}

const STATIC_PATHS = ["/", "/about", "/glossary", "/volumes"];

/**
 * Escapes the five XML predefined entities so `siteUrl`/path values are
 * safe to interpolate into `<loc>`/`href` attribute text — defensive
 * hardening against a future `NUXT_PUBLIC_SITE_URL` or content-derived
 * path containing an XML metacharacter (none of `content/toc.json`'s
 * chapter ids do today, but this is a one-line guard against that ever
 * becoming a live bug). Order matters: `&` must be escaped first, or the
 * `&` introduced by escaping `<`/`>`/etc. would itself get re-escaped.
 */
export const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** `@nuxtjs/i18n`'s `prefix_except_default` strategy: en is unprefixed, others get `/<code>`. */
const localizedPath = (path: string, locale: SitemapLocale): string => {
  if (locale === "en") return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
};

/** Every locale-agnostic path in the site's public route universe. */
export const sitemapPaths = (toc: Toc): string[] => [
  ...STATIC_PATHS,
  ...toc.volumes.map((volume) => `/volumes/volume-${volume.number}`),
  ...toc.volumes.flatMap((volume) =>
    volume.parts.flatMap((part) =>
      part.chapters.map((chapter) => `/read/${chapter.id}`),
    ),
  ),
];

/** One entry (every locale's absolute URL) per path in the route universe. */
export const buildSitemapEntries = (
  toc: Toc,
  siteUrl: string,
  locales: readonly string[] = SITEMAP_LOCALES,
): SitemapEntry[] =>
  sitemapPaths(toc).map((path) => ({
    path,
    urls: Object.fromEntries(
      locales.map((locale) => [
        locale,
        `${siteUrl}${localizedPath(path, locale)}`,
      ]),
    ) as Record<SitemapLocale, string>,
  }));

/**
 * One `<url>` block, self-referentially listing every locale's alternate and x-default
 * alongside its own `<loc>` (Google's recommended pattern). `x-default`
 * points at the English (default-locale, `i18n.defaultLocale`) URL — the
 * variant to serve a user whose locale doesn't match any listed alternate
 * — mirroring the `x-default` link `useLocaleHead()` already emits on
 * every page (see `app.vue`).
 */
const urlBlock = (loc: string, entry: SitemapEntry): string =>
  [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    ...Object.entries(entry.urls).map(
      ([locale, url]) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(url)}"/>`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(entry.urls.en ?? loc)}"/>`,
    "  </url>",
  ].join("\n");

/** Serializes built entries into sitemap XML — one `<url>` per locale variant, each carrying every alternate. */
export const renderSitemapXml = (entries: SitemapEntry[]): string => {
  const urls = entries.flatMap((entry) =>
    Object.values(entry.urls).map((url) => urlBlock(url, entry)),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap-style.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
};
