/**
 * Liveness for the Node server (Coolify's health check and the image's own
 * HEALTHCHECK — docs/deploy-coolify.md). Answers without touching content,
 * so it measures only that the process serves requests.
 */
export default defineEventHandler((event) => {
  setHeader(event, "cache-control", "no-store");
  return "ok";
});
