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
  // `useRuntimeConfig()` without the event: Nuxt 4.5 pulls an h3 v2 RC into
  // the Nitro types alongside h3 v1, so `defineEventHandler`'s `event` and
  // `useRuntimeConfig`'s parameter no longer come from the same `H3Event`
  // declaration and the call does not typecheck. The event form only buys
  // request-scoped config overrides, which a fully prerendered static route
  // has no use for — the global config is what `NUXT_PUBLIC_SITE_URL`
  // populates at build time, and that is what this reads either way.
  const { siteUrl } = useRuntimeConfig().public;
  const entries = buildSitemapEntries(toc as Toc, siteUrl);

  setHeader(event, "content-type", "application/xml; charset=UTF-8");
  return renderSitemapXml(entries);
});
