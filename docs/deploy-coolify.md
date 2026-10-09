# Deploying the Node server with Coolify

Read TES runs in two shapes from the same code:

|                                      | `static` (GitHub Pages, current)                                                                      | `server` (Coolify)                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Build                                | `pnpm generate`                                                                                       | `READTES_DEPLOY_TARGET=server pnpm build`                   |
| Reader pages                         | prerendered for en/he/ru; the other six languages render in the browser from the 404 shell (HTTP 404) | rendered on request by Node, every language a real 200 page |
| Sitemap                              | en, he, ru                                                                                            | all nine languages                                          |
| Size limits                          | GitHub Pages' 1 GB                                                                                    | none                                                        |
| Runtime features (search, accounts…) | impossible                                                                                            | possible                                                    |

`server` is a superset of `static` for readers: the same pages, plus the six
newer languages becoming indexable.

## What the image is

`Dockerfile` target `server` (the default final stage): `nuxt build` with
`READTES_DEPLOY_TARGET=server`, then a bare `node:24-alpine` running
`.output/server/index.mjs` on port **3000** as the unprivileged `node` user.
`.output` is self-contained — no `node_modules`, no pnpm in the image.

- Health check: `GET /healthz` → `ok` (built into the image's `HEALTHCHECK`).
- Measured locally: ~105 MB resident, 400 random chapter pages in 3 s.
- HTML responses carry
  `cache-control: public, max-age=0, must-revalidate, s-maxage=600, stale-while-revalidate=86400`;
  `/_nuxt/*` assets are immutable for a year.

## The build runs in GitHub Actions, not on the server

`.github/workflows/server-image.yml` builds the image on every push to `main`
and publishes `ghcr.io/devhaver/readtes:latest` (and `:<commit sha>`). A full
`generate` peaks around 7 GB of RAM; even the server build wants a few GB, and
the VPS should spend its memory serving. GitHub's runners for public repos
have 16 GB.

## Coolify setup

1. **New resource → Docker Image** (not "Git repository"):
   image `ghcr.io/devhaver/readtes:latest`. The package is public with the
   repository; if it is not, add a GHCR registry with a read-only token.
2. **Port**: `3000`. **Health check path**: `/healthz`.
3. **Domain**: `https://readtes.com` (and `www` if wanted). Coolify issues the
   certificate.
4. **Environment variables** (all optional — the image works without them):
   - `NUXT_PUBLIC_SITE_URL=https://readtes.com` — already baked in at build; a
     runtime value overrides it.
   - `NUXT_PUBLIC_UMAMI_SRC`, `NUXT_PUBLIC_UMAMI_WEBSITE_ID` — analytics.
5. **Redeploy on every push**: Coolify → the resource → **Webhooks** → copy the
   deploy webhook URL; create an API token with deploy permission. Add both to
   the GitHub repository as secrets `COOLIFY_WEBHOOK` and `COOLIFY_TOKEN`. The
   workflow calls the webhook after pushing the image.
6. **Resources**: 512 MB of memory is ample; one CPU core.

## Cloudflare in front

Cloudflare already proxies readtes.com. Two settings make it cache the HTML:

- **Cache Rule**: hostname equals `readtes.com` → _Eligible for cache_, edge
  TTL _Use cache-control header if present_. (Cloudflare does not cache HTML
  without a rule.)
- **After a deploy**, either wait out the 10-minute `s-maxage` or purge the
  cache (Caching → Purge Everything).

## Switching over from GitHub Pages

1. Deploy the image in Coolify on a temporary domain and check it:
   `/`, `/es/read/part-06/chapter-01` (Spanish text, HTTP 200),
   `/sitemap.xml` (nine languages), `/nope` (HTTP 404), `/healthz`.
2. Point readtes.com's DNS (in Cloudflare) at the Coolify server.
3. Once traffic has moved, disable `.github/workflows/deploy-pages.yml` (or
   leave it running as a fallback — it does not interfere).

## Locally

`task docker:server` builds and runs the image on <http://localhost:6220>.
Without Docker: `READTES_DEPLOY_TARGET=server pnpm build && pnpm start`.
