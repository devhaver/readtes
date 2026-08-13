/**
 * Replaces the old static `public/robots.txt` (deleted alongside this —
 * see AGENTS.md) with a prerendered server route so the `Sitemap:` line
 * can derive from `runtimeConfig.public.siteUrl` instead of being
 * hardcoded. Permissive intent unchanged from the old file (it said
 * `Disallow:`, i.e. disallow nothing — `Allow: /` says the same thing
 * explicitly).
 */
export default defineEventHandler((event) => {
  // `useRuntimeConfig()` without the event: Nuxt 4.5 pulls an h3 v2 RC into
  // the Nitro types alongside h3 v1, so `defineEventHandler`'s `event` and
  // `useRuntimeConfig`'s parameter no longer come from the same `H3Event`
  // declaration and the call does not typecheck. The event form only buys
  // request-scoped config overrides, which a fully prerendered static route
  // has no use for — the global config is what `NUXT_PUBLIC_SITE_URL`
  // populates at build time, and that is what this reads either way.
  const { siteUrl } = useRuntimeConfig().public;

  setHeader(event, "content-type", "text/plain; charset=UTF-8");
  return [
    "User-Agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
});
