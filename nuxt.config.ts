import type { ModuleOptions as FontsModuleOptions } from "@nuxt/fonts";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  vendoredFontFamilies,
  vendoredFontProvider,
} from "./scripts/lib/vendored-fonts";
import type { Toc } from "./shared/types/content";
import { CHAPTER_KIND_ORDER } from "./shared/utils/chapterKinds";
import { nativeLanguageName } from "./shared/utils/languages";
import { stripContentChunkPrefetchHints } from "./shared/utils/manifestPrefetch";

// The families, weights and subsets this site uses — the input to
// `pnpm fonts:vendor`, and the only place these choices are made.
//
// Weight discipline: every family lists only the weights actually used
// (Inter 400/500/600 for body, font-medium and the .tes-anchor chips;
// Taviraj 400 incl. italic for the display face and the en hero quote;
// Frank Ruhl Libre 700/900 as the Hebrew *display* face only — reading
// Hebrew moved to David Libre 400/700, the classic face of printed
// Hebrew holy books; Heebo 400/500/700 is the Hebrew UI-chrome sans
// under /he/). Keep this list tight — extra weights balloon the
// generated `_fonts` payload, and now the committed `public/fonts/` too.
//
// Subset discipline (T10 fix — real bug, verified on the generated
// output): `@nuxt/fonts`' own default subset list is latin-only and does
// NOT include `hebrew`. Left unset, every one of the three Hebrew faces
// below silently emitted zero `@font-face` rules covering U+0590–05FF,
// so all Hebrew text on the shipped site fell back to the browser's
// default serif/sans instead of David Libre/Frank Ruhl Libre/Heebo. Each
// Hebrew family lists `subsets: ["latin", "hebrew"]` explicitly (`latin`
// stays, since digits/punctuation/the odd Latin loanword still need it);
// Inter and Taviraj are untouched — they have no Hebrew glyphs to begin
// with and must not gain a subset that would only balloon their payload.
const GOOGLE_FONT_FAMILIES: NonNullable<FontsModuleOptions["families"]> = [
  { name: "Inter", provider: "google", weights: [400, 500, 600] },
  {
    name: "Taviraj",
    provider: "google",
    weights: [400],
    styles: ["normal", "italic"],
  },
  {
    name: "Frank Ruhl Libre",
    provider: "google",
    weights: [700, 900],
    subsets: ["latin", "hebrew"],
  },
  {
    name: "David Libre",
    provider: "google",
    weights: [400, 700],
    subsets: ["latin", "hebrew"],
  },
  {
    name: "Heebo",
    provider: "google",
    weights: [400, 500, 700],
    subsets: ["latin", "hebrew"],
  },
];

// Which generic each family's fallback metrics are computed against. The
// Google provider carries a `category` that decides this; a vendored family
// has no upstream metadata, so it is stated here — and it matters, because
// the wrong generic silently produces the wrong `size-adjust` for the three
// reading faces. Values are `fontaine`'s own DEFAULT_CATEGORY_FALLBACKS, so
// the generated rules are identical to what the Google path emits.
const SERIF_FALLBACKS = ["Times New Roman", "Georgia", "Noto Serif"];
const SANS_FALLBACKS = [
  "BlinkMacSystemFont",
  "Segoe UI",
  "Helvetica Neue",
  "Arial",
  "Noto Sans",
];
const FONT_FALLBACKS: Record<string, string[]> = {
  Inter: SANS_FALLBACKS,
  Heebo: SANS_FALLBACKS,
  Taviraj: SERIF_FALLBACKS,
  "Frank Ruhl Libre": SERIF_FALLBACKS,
  "David Libre": SERIF_FALLBACKS,
};

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

// Every absolute URL the app emits (canonical links, og:url/og:image,
// hreflang alternates, sitemap.xml, robots.txt) derives from this single
// value, so the domain only ever needs to be set in one place. The default
// below is the live production domain — https://readtes.com is deployed and
// crawlable (verified 2026-08-11), so treat changes that move published URLs
// as changes real crawlers will see. `runtimeConfig.public.siteUrl` below is
// what app code reads at runtime (`useRuntimeConfig().public.siteUrl`);
// `i18n.baseUrl` needs the same literal at Nuxt-config-evaluation time so
// `useLocaleHead()` can emit absolute hreflang/canonical/og:url tags.
// Strips a trailing "/" (e.g. `NUXT_PUBLIC_SITE_URL=https://example.org/`)
// so every consumer below can safely do `${siteUrl}${path}` without
// producing a double slash — this is the single normalization point, so
// no call site needs its own `.replace(/\/$/, "")` footgun-guard.
const siteUrl = (
  process.env.NUXT_PUBLIC_SITE_URL ?? "https://readtes.com"
).replace(/\/$/, "");

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Static, locale-independent document head. Per-route canonical, hreflang
  // and og:* come from `useLocaleHead` in app.vue and `useLocalizedSeo` on
  // each page; Unhead merges all three.
  //
  // Before this, the app declared no icons at all — the scaffold's
  // favicon.ico was served only by /favicon.ico convention, and iOS, Android
  // and every bookmark surface got nothing.
  app: {
    head: {
      link: [
        // Browsers that support SVG icons prefer it, and it carries its own
        // prefers-color-scheme handling. The .ico (16/32/48) is the fallback
        // and what a bookmarks bar uses.
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
      // Navy browser chrome on Android and iOS Safari, matching the header.
      // Literal hex is unavoidable in a meta value; the token it mirrors is
      // --color-navy-primary in app/assets/css/main.css.
      meta: [{ name: "theme-color", content: "#003b65" }],
    },
  },
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
    // Three themes: light, sepia, dark. There is deliberately no `themes`
    // list — this version of @nuxtjs/color-mode has no such option, and none
    // is needed: `classSuffix: ""` puts the bare preference value on <html>,
    // so any value with a matching token block in main.css just works.
    fallback: "light",
  },
  i18n: {
    strategy: "prefix_except_default",
    defaultLocale: "en",
    // `name` is the native language name — same fact the reader's per-pane
    // language `<select>` renders, so both read `shared/utils/languages.ts`
    // rather than each keeping their own copy of "English"/"עברית".
    locales: [
      {
        code: "en",
        language: "en-US",
        name: nativeLanguageName("en"),
        file: "en.json",
      },
      {
        code: "he",
        language: "he-IL",
        name: nativeLanguageName("he"),
        dir: "rtl",
        file: "he.json",
      },
    ],
    detectBrowserLanguage: false,
    // Drives `useLocaleHead()`'s canonical link + hreflang alternates +
    // og:url/og:locale meta — same value as `runtimeConfig.public.siteUrl`
    // below, see the `siteUrl` comment above.
    baseUrl: siteUrl,
  },
  runtimeConfig: {
    public: {
      // Overridable at build time via `NUXT_PUBLIC_SITE_URL` (Nuxt's
      // standard public-runtime-config env override) — see the `siteUrl`
      // comment above for what derives from this.
      siteUrl,
      // Umami analytics, both empty by default. There is no runtime config
      // on a static site — Cloudflare Pages serves prerendered HTML, so
      // these are only ever settable at `pnpm generate` time via
      // `NUXT_PUBLIC_UMAMI_SRC`/`NUXT_PUBLIC_UMAMI_WEBSITE_ID` and get baked
      // into the output. Empty means "no analytics": local/dev/CI builds
      // stay clean, and app.vue only emits the script tag when both are set.
      umamiSrc: "",
      umamiWebsiteId: "",
    },
  },
  compatibilityDate: "2025-07-15",
  // T14 scaling fix — artifact is over Cloudflare Pages' 20,000-file limit
  // without this: `experimental.payloadExtraction` emits one `_payload.json`
  // per prerendered route (10,314 extra files). Safe here because chapter
  // text is deliberately NOT loaded through `useAsyncData` —
  // `useChapterContent`/`useLocalizedParts` ride statically bundled JSON
  // modules via direct `await import()`, so the payload carries only
  // incidental route state, duplicated per route.
  experimental: { payloadExtraction: false },
  // /design-tokens is a dev-only debug page kept around from the token
  // scaffolding task; never ship it (or its localized variants — @nuxtjs/i18n
  // seeds every locale's copy of every static page into the prerender crawl,
  // so each locale prefix needs its own rule) in the generated static site.
  //
  // No `redirect` rules live here, and the #85 volume regroup deliberately
  // did not add any: every `/volumes/volume-N` URL exists both before and
  // after that change, only the parts each one lists moved, and the moves
  // don't form a rename (old volume 3's parts 7 and 8 now sit in volumes 2
  // and 3), so no old volume URL has a single new home. See the
  // `tes-content-model` skill, "Volume grouping", for the full reasoning —
  // read it before adding a redirect for a volume URL.
  routeRules: {
    "/design-tokens": { prerender: false },
    "/he/design-tokens": { prerender: false },
  },
  // T12 scaling fix — dev-only route-rules matcher bloat: Nuxt turns every
  // explicit `nitro.prerender.routes` entry into a client route rule, and
  // the resulting matcher (`virtual:nuxt:.nuxt/route-rules.mjs`) is an
  // unminified 3.5MB module the dev server serves to the browser on *every*
  // page load — dev never prerenders, so none of this is needed there.
  // `$production` is a Nuxt env override key that only applies when
  // `NODE_ENV=production`, which `nuxi generate`/`nuxi build` set and `nuxi
  // dev` does not, so the 20,634-entry route list still reaches the actual
  // static build while `pnpm dev` never pays for it.
  $production: {
    nitro: {
      prerender: {
        // The volumes index is reachable by crawling the homepage's link to
        // it, and each `/volumes/[volume]` card renders as an <a> only while
        // `volumeHasContent` holds (an empty volume renders a disabled
        // "coming soon" card with no <a> for the crawler to follow) — list
        // every volume explicitly so all six contents pages ship in the
        // generated static site whatever the content coverage is. Reader
        // routes are listed explicitly for the same reason (see
        // `readerPrerenderRoutes` above) — the crawler alone would miss most
        // of the answers-terminology/answers-topics clusters.
        routes: [
          ...volumePrerenderRoutes,
          ...readerPrerenderRoutes,
          // Nitro server routes (`server/routes/`) with no `<a>` anywhere for
          // the crawler to find — need the same explicit treatment.
          "/sitemap.xml",
          "/robots.txt",
        ],
      },
    },
  },
  // T11 scaling fix — content-chunk prefetch-link bloat: strip every
  // `content/parts/**`/`content/toc.parts/**`/`content/glossary/**` chunk's
  // prefetch/preload eligibility from the client manifest before Nitro embeds it for
  // runtime use, so `vue-bundle-renderer`'s renderer stops emitting a
  // `<link rel="prefetch">` for (effectively) every chapter's content chunk
  // on every reader page. See `shared/utils/manifestPrefetch.ts`'s docblock
  // for the full measurement/mechanism writeup and AGENTS.md "Content
  // model" > "Known limitation" for the summary. Pure logic lives there
  // (unit-tested — `tests/unit/manifest-prefetch.spec.ts`) so this hook is
  // just wiring.
  hooks: {
    "build:manifest": (manifest) => {
      stripContentChunkPrefetchHints(manifest);
    },
  },
  // Non-standard ports so `pnpm dev` never fights other local dev servers
  // on the default range — see AGENTS.md "Dev server ports".
  devServer: {
    port: 6217,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // T14 scaling fix — one Rollup chunk per content JSON file (the
          // `import.meta.glob` in `app/utils/content-loaders/part-NN.ts`
          // emits ~10,356 of them) is what puts the artifact at 31,096
          // files total, over Cloudflare Pages' 20,000 cap. Every JSON
          // belonging to one chapter is always fetched together
          // (`useChapterContent` loads all of a chapter's layer/version
          // files up front — see its docblock), so grouping per chapter
          // changes zero runtime behavior. `manualChunks` must return
          // `undefined` for everything else so Vite's default chunking is
          // untouched. Matched on the module id without query string
          // (Rollup ids carry no query here anyway, defensive). Content
          // JSON outside a chapter dir groups per part.
          manualChunks(id) {
            const cleanId = id.split("?")[0] as string;
            const chapterMatch =
              /content\/parts\/(part-\d+)\/chapters\/([^/]+)\//.exec(cleanId);
            if (chapterMatch) {
              return `content-${chapterMatch[1]}-${chapterMatch[2]}`;
            }
            const partMatch = /content\/parts\/(part-\d+)\//.exec(cleanId);
            if (partMatch) {
              return `content-${partMatch[1]}`;
            }
            return undefined;
          },
        },
      },
    },
    server: {
      ws: {
        port: 6218,
      },
    },
  },
  // Where the files come from (issue #121): `public/fonts/`, vendored into
  // the repository, NOT `fonts.gstatic.com` at build time. A single 404 from
  // Google used to fail the whole deploy — twice in one day, on commits with
  // nothing wrong with them — and a failed deploy is invisible from outside,
  // because `main` merges and the site keeps serving the previous build.
  //
  // `FONTS_SOURCE=google` is the one path that still fetches, and exists for
  // exactly one caller: `pnpm fonts:vendor`, which builds through it and then
  // records what it produced. The list below is therefore not dead config —
  // it is the input to the refresh, and the only place a family, weight or
  // subset is chosen.
  fonts:
    process.env.FONTS_SOURCE === "google"
      ? { families: GOOGLE_FONT_FAMILIES }
      : {
          providers: {
            vendored: vendoredFontProvider,
            // Every remote provider off, so "this build makes no font
            // requests" is a property of the configuration rather than a
            // consequence of every family happening to name `vendored`.
            // `@nuxt/fonts` also resolves font families it finds in CSS that
            // are not listed in `families` at all — that path is how a
            // stylesheet edit could quietly put Google back in the build.
            google: false,
            bunny: false,
            fontshare: false,
            fontsource: false,
            adobe: false,
            googleicons: false,
          },
          families: vendoredFontFamilies(FONT_FALLBACKS),
        },
});
