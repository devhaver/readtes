/**
 * Emits `sitemap.xml` at the site root — prerendered into the static
 * output (see `nitro.prerender.routes` in `nuxt.config.ts`, since nothing
 * on the site links to this route for the crawler to find on its own).
 * All the actual URL-list logic lives in the pure, unit-tested
 * `shared/utils/sitemap.ts`; this route is just plumbing: read the
 * committed ToC, read `siteUrl` from runtime config, serialize.
 */
import toc from "~~/content/toc.json";
import type { Toc } from "~~/shared/types/content";
import { buildSitemapEntries, renderSitemapXml } from "~~/shared/utils/sitemap";

export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public;
  const entries = buildSitemapEntries(toc as Toc, siteUrl);

  setHeader(event, "content-type", "application/xml; charset=UTF-8");
  return renderSitemapXml(entries);
});
