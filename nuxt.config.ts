import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/fonts", "@nuxt/icon", "@nuxtjs/color-mode"],
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  colorMode: {
    classSuffix: "",
  },
  compatibilityDate: "2025-07-15",
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
