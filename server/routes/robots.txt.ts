/**
 * Replaces the old static `public/robots.txt` (deleted alongside this —
 * see AGENTS.md) with a prerendered server route so the `Sitemap:` line
 * can derive from `runtimeConfig.public.siteUrl` instead of being
 * hardcoded. Permissive intent unchanged from the old file (it said
 * `Disallow:`, i.e. disallow nothing — `Allow: /` says the same thing
 * explicitly).
 */
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public;

  setHeader(event, "content-type", "text/plain; charset=UTF-8");
  return [
    "User-Agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
});
