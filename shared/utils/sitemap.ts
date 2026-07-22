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

const urlBlock = (loc: string, entry: SitemapEntry): string =>
  [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${entry.en}"/>`,
    `    <xhtml:link rel="alternate" hreflang="he" href="${entry.he}"/>`,
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
