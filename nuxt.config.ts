import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Toc } from "./shared/types/content";

// `nitro.prerender.routes` needs each volume's contents page listed
// explicitly (see the comment below) — read straight from the committed
// ToC, the same way `scripts/validate-content.ts` reads content JSON, so
// this list never drifts from `content/toc.json`.
const toc: Toc = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("./content/toc.json", import.meta.url)),
    "utf-8",
  ),
);

// `/volumes/volume-<N>` for every volume, in both locales — `@nuxtjs/i18n`
// does not itself multiply explicit `nitro.prerender.routes` entries across
// locale prefixes (unlike the crawler, which follows a page's own localized
// links), so each locale needs its own literal path here.
const volumePrerenderRoutes = toc.volumes.flatMap((volume) => [
  `/volumes/volume-${volume.number}`,
  `/he/volumes/volume-${volume.number}`,
]);

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@nuxtjs/i18n",
  ],
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  colorMode: {
    classSuffix: "",
  },
  i18n: {
    strategy: "prefix_except_default",
    defaultLocale: "en",
    locales: [
      { code: "en", language: "en-US", name: "English", file: "en.json" },
      {
        code: "he",
        language: "he-IL",
        name: "עברית",
        dir: "rtl",
        file: "he.json",
      },
    ],
    detectBrowserLanguage: false,
  },
  compatibilityDate: "2025-07-15",
  // /design-tokens is a dev-only debug page kept around from the token
  // scaffolding task; never ship it (or its localized variants — @nuxtjs/i18n
  // seeds every locale's copy of every static page into the prerender crawl,
  // so each locale prefix needs its own rule) in the generated static site.
  // /read/** doesn't exist yet — volume contents pages and the homepage CTA
  // link chapters ahead of time; excluding the routes keeps the crawler from
  // failing the build on them. The reader task removes these.
  routeRules: {
    "/design-tokens": { prerender: false },
    "/he/design-tokens": { prerender: false },
    "/read/**": { prerender: false }, // route lands in T7 — remove exclusion then
    "/he/read/**": { prerender: false }, // route lands in T7 — remove exclusion then
  },
  nitro: {
    prerender: {
      // The volumes index is reachable by crawling the homepage's link to
      // it, but each `/volumes/[volume]` page's own link only exists for
      // Volume 1 (the rest render disabled/"coming soon", with no <a> for
      // the crawler to follow) — list every volume explicitly so all six
      // contents pages still ship in the generated static site.
      routes: volumePrerenderRoutes,
    },
  },
  // Non-standard ports so `pnpm dev` never fights other local dev servers
  // (weburz's Nuxt app on 3000, etc.) — see AGENTS.md "Dev server ports".
  devServer: {
    port: 6217,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      ws: {
        port: 6218,
      },
    },
  },
  fonts: {
    families: [
      { name: "Inter", provider: "google" },
      { name: "Taviraj", provider: "google" },
      { name: "Frank Ruhl Libre", provider: "google" },
    ],
  },
});
