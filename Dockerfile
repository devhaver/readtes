# syntax=docker/dockerfile:1

###############################################################################
# Base — node + pinned pnpm, shared by every stage
###############################################################################
FROM node:24-alpine AS base

# pnpm pinned to the `packageManager` field in package.json, not `latest`, so
# the container and the host resolve dependencies identically.
#
# PNPM_HOME matters: pnpm puts its store at $PNPM_HOME/store, which is what
# the cache mounts below target. Without it the store lands elsewhere and the
# cache mount is a silent no-op — every build re-downloads the whole tree.
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install -g pnpm@11.15.1

WORKDIR /app

###############################################################################
# Deps — dependency install only, so source edits don't bust the layer
###############################################################################
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --ignore-scripts: this package's postinstall is `nuxt prepare`, which needs
# nuxt.config.ts and the source tree — neither exists at this layer. Every
# stage below runs `nuxt prepare` itself once the source is in place.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

###############################################################################
# Development — hot reload; compose bind-mounts the source over this
###############################################################################
FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec nuxt prepare

# 6217 dev server, 6218 Vite HMR websocket — both pinned in nuxt.config.ts.
EXPOSE 6217 6218

# --host is required: Nuxt binds to localhost by default, which inside a
# container means unreachable from the host. The port itself still comes from
# nuxt.config.ts, so the 6217/6218 convention holds.
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

###############################################################################
# Build — static site generation
###############################################################################
FROM base AS build

# Baked into every absolute URL the site emits (canonical, hreflang, og:url,
# sitemap, robots). Must be correct at BUILD time — this is a static site,
# there is no runtime config to override later.
ARG NUXT_PUBLIC_SITE_URL=https://readtes.org
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec nuxt prepare && pnpm generate

###############################################################################
# Production — nginx serving the prerendered output
#
# Deliberately not a Node image. `nuxt generate` emits static files to
# .output/public with no server entrypoint, so weburz's
# `node .output/server/index.mjs` has nothing to run here.
###############################################################################
FROM nginx:1.27-alpine AS production

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
