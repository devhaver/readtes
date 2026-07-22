import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Toc } from "./shared/types/content";

// Mirrors `KIND_ORDER` in `app/utils/chapterGrouping.ts` — duplicated
// (rather than imported) on purpose: this file is type-checked as part of
// the project *root* (not through the Nuxt app's own tsconfig/path-alias
// setup), so pulling in an `app/` module here drags its `~~/shared/types/content`
// import along with it and breaks under the root tsconfig's path mapping.
// Keep in sync if the reading-order rule ever changes.
const CHAPTER_KIND_ORDER = [
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "answers-terminology",
  "answers-topics",
] as const;

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

// `/read/<chapterId>` for every chapter that exists, in both locales.
// Listed explicitly rather than left to the crawler: a volume's contents
// page collapses the 54/51-chapter answers-terminology/answers-topics
// clusters into a single link to their first chapter (see
// `~/utils/chapterGrouping`), so the crawler alone would never discover
// chapters 2+ of a cluster. Same kind-then-number reading order as
// `~/utils/toc`'s `flattenChapters` — irrelevant to prerendering itself,
// just keeps this list's order legible.
const readerPrerenderRoutes = toc.volumes.flatMap((volume) =>
  volume.parts.flatMap((part) =>
    [...part.chapters]
      .sort(
        (a, b) =>
          CHAPTER_KIND_ORDER.indexOf(a.kind) -
            CHAPTER_KIND_ORDER.indexOf(b.kind) || a.number - b.number,
      )
      .flatMap((chapter) => [`/read/${chapter.id}`, `/he/read/${chapter.id}`]),
  ),
);

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
  routeRules: {
    "/design-tokens": { prerender: false },
    "/he/design-tokens": { prerender: false },
  },
  nitro: {
    prerender: {
      // The volumes index is reachable by crawling the homepage's link to
      // it, but each `/volumes/[volume]` page's own link only exists for
      // Volume 1 (the rest render disabled/"coming soon", with no <a> for
      // the crawler to follow) — list every volume explicitly so all six
      // contents pages still ship in the generated static site. Reader
      // routes are listed explicitly for the same reason (see
      // `readerPrerenderRoutes` above) — the crawler alone would miss most
      // of the answers-terminology/answers-topics clusters.
      routes: [...volumePrerenderRoutes, ...readerPrerenderRoutes],
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
  // Weight discipline: every family lists only the weights actually used
  // (Inter 400/500/600 for body, font-medium and the .tes-anchor chips;
  // Taviraj 400 incl. italic for the display face and the en hero quote;
  // Frank Ruhl Libre 700/900 as the Hebrew *display* face only — reading
  // Hebrew moved to David Libre 400/700, the classic face of printed
  // Hebrew holy books; Heebo 400/500/700 is the Hebrew UI-chrome sans
  // under /he/). Keep this list tight — extra weights balloon the
  // generated `_fonts` payload.
  fonts: {
    families: [
      { name: "Inter", provider: "google", weights: [400, 500, 600] },
      {
        name: "Taviraj",
        provider: "google",
        weights: [400],
        styles: ["normal", "italic"],
      },
      { name: "Frank Ruhl Libre", provider: "google", weights: [700, 900] },
      { name: "David Libre", provider: "google", weights: [400, 700] },
      { name: "Heebo", provider: "google", weights: [400, 500, 700] },
    ],
  },
});
