import tailwindcss from "@tailwindcss/vite";

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
  // /volumes doesn't exist yet (Task 5) — the homepage links to it ahead of
  // time, so a crawl-time 404 for it must not fail `nuxt generate`.
  // /read/** doesn't exist yet either (Task 6) — the homepage's primary CTA
  // links straight to a specific chapter ahead of time, same reasoning.
  routeRules: {
    "/design-tokens": { prerender: false },
    "/he/design-tokens": { prerender: false },
    "/volumes": { prerender: false }, // route lands in T5 — remove exclusion then
    "/he/volumes": { prerender: false }, // route lands in T5 — remove exclusion then
    "/read/**": { prerender: false }, // route lands in T6 — remove exclusion then
    "/he/read/**": { prerender: false }, // route lands in T6 — remove exclusion then
  },
  nitro: {
    prerender: {},
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
