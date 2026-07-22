/**
 * Pure sitemap URL-list builder — no Nuxt/Nitro runtime context, so it's
 * directly unit-testable against the real `content/toc.json`
 * (`tests/unit/sitemap.spec.ts`). `server/routes/sitemap.xml.ts` is the
 * thin Nitro route that calls this at generate time and serves the
 * result.
 *
 * Route universe: the three static top-level pages (the home page, the
 * about page, the volumes index) plus every volume's contents page and
 * every chapter's reader page — the same universe as
 * `nitro.prerender.routes` in `nuxt.config.ts` plus the crawled static
 * pages. `/design-tokens` is a dev-only debug route with no entry in
 * `toc.json` and is never a candidate here — there's nothing to exclude,
 * since this builder only ever emits paths it derives from the ToC.
 */
import type { Toc } from "~~/shared/types/content";

export interface SitemapEntry {
  /** Locale-agnostic path, e.g. "/volumes/volume-1" or "/read/part-01/chapter-01". */
  path: string;
  /** Absolute URL of the English (default-locale) variant. */
  en: string;
  /** Absolute URL of the Hebrew variant. */
  he: string;
}

const STATIC_PATHS = ["/", "/about", "/volumes"];

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

/** `@nuxtjs/i18n`'s `prefix_except_default` strategy: en is unprefixed, he gets `/he`. */
const localizedPath = (path: string, locale: "en" | "he"): string => {
  if (locale === "en") return path;
  return path === "/" ? "/he" : `/he${path}`;
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

/** One entry (English + Hebrew absolute URL pair) per path in the route universe. */
export const buildSitemapEntries = (
  toc: Toc,
  siteUrl: string,
): SitemapEntry[] =>
  sitemapPaths(toc).map((path) => ({
    path,
    en: `${siteUrl}${localizedPath(path, "en")}`,
    he: `${siteUrl}${localizedPath(path, "he")}`,
  }));

/**
 * One `<url>` block, self-referentially listing en/he/x-default alternates
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
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(entry.en)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="he" href="${escapeXml(entry.he)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(entry.en)}"/>`,
    "  </url>",
  ].join("\n");

/** Serializes built entries into sitemap XML — one `<url>` per locale variant, each carrying both alternates. */
export const renderSitemapXml = (entries: SitemapEntry[]): string => {
  const urls = entries.flatMap((entry) => [
    urlBlock(entry.en, entry),
    urlBlock(entry.he, entry),
  ]);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
};
