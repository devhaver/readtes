<script setup lang="ts">
// `useLocaleHead()` (default `seo: true`, `i18n.baseUrl` set in
// nuxt.config.ts) emits, on every route: the canonical `<link>`, hreflang
// `<link rel="alternate">` pairs (+ x-default), and `og:url`/`og:locale`/
// `og:locale:alternate` meta — all absolute, derived from `siteUrl`. Every
// page gets these for free just by living under this root; per-page
// title/description/og:title/og:image/etc. come from `useLocalizedSeo`
// (see that composable), called individually by each page.
const localeHead = useLocaleHead();

// Theme-change crossfade. `.theme-transition` is added to <html> only while a
// switch is in flight — see the rule in main.css for why it isn't permanent.
// Watching the resolved value rather than the preference means it also fires
// when "system" flips underneath us, and covers both places that change the
// theme (the navbar toggle and the reader's preferences modal) without either
// needing to know about this.
const colorMode = useColorMode();
let themeTransitionTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => colorMode.value,
  () => {
    if (import.meta.server) return;
    const root = document.documentElement;
    root.classList.add("theme-transition");
    clearTimeout(themeTransitionTimer);
    themeTransitionTimer = setTimeout(
      () => root.classList.remove("theme-transition"),
      240,
    );
  },
);

onBeforeUnmount(() => clearTimeout(themeTransitionTimer));

// `localeHead.value.link`/`.meta` are typed as `MetaAttrs[]` (a loose
// `Record<string, string>`) by `@nuxtjs/i18n` itself — looser than
// `useHead`'s own `ResolvableLink`/`ResolvableMeta` unions, even though
// the objects it actually returns (`{ rel, href, hreflang }`,
// `{ property, content }`, ...) are perfectly valid entries for those
// tags. The cast (via `useHead`'s own parameter type, not `any`) bridges
// that gap; the values themselves are exactly `useLocaleHead`'s
// documented return shape.
// Icons, the manifest and theme-color are static and locale-independent, so
// they live in `nuxt.config.ts`'s `app.head` rather than here — Unhead merges
// the two sources. This file stays limited to what `useLocaleHead` derives
// per route.
useHead((() => ({
  htmlAttrs: { ...localeHead.value.htmlAttrs },
  link: localeHead.value.link,
  meta: localeHead.value.meta,
})) as unknown as Parameters<typeof useHead>[0]);

// Umami analytics, env-gated. Both values are baked in at `pnpm generate`
// time from `NUXT_PUBLIC_UMAMI_SRC`/`NUXT_PUBLIC_UMAMI_WEBSITE_ID` (see the
// `runtimeConfig.public` comment in nuxt.config.ts for why a static site
// only ever sets these at build time) and default to empty strings, so a
// deploy that doesn't set them emits no script at all — local, dev and CI
// builds stay clean. Kept as its own `useHead` call rather than folded into
// the one above: that one is purely `useLocaleHead`'s per-route output,
// this is static and conditional.
const { umamiSrc, umamiWebsiteId } = useRuntimeConfig().public;
if (umamiSrc && umamiWebsiteId) {
  useHead({
    script: [{ defer: true, src: umamiSrc, "data-website-id": umamiWebsiteId }],
  });
}
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
