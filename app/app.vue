<script setup lang="ts">
// `useLocaleHead()` (default `seo: true`, `i18n.baseUrl` set in
// nuxt.config.ts) emits, on every route: the canonical `<link>`, hreflang
// `<link rel="alternate">` pairs (+ x-default), and `og:url`/`og:locale`/
// `og:locale:alternate` meta — all absolute, derived from `siteUrl`. Every
// page gets these for free just by living under this root; per-page
// title/description/og:title/og:image/etc. come from `useLocalizedSeo`
// (see that composable), called individually by each page.
const localeHead = useLocaleHead();

// `localeHead.value.link`/`.meta` are typed as `MetaAttrs[]` (a loose
// `Record<string, string>`) by `@nuxtjs/i18n` itself — looser than
// `useHead`'s own `ResolvableLink`/`ResolvableMeta` unions, even though
// the objects it actually returns (`{ rel, href, hreflang }`,
// `{ property, content }`, ...) are perfectly valid entries for those
// tags. The cast (via `useHead`'s own parameter type, not `any`) bridges
// that gap; the values themselves are exactly `useLocaleHead`'s
// documented return shape.
useHead((() => ({
  htmlAttrs: { ...localeHead.value.htmlAttrs },
  link: localeHead.value.link,
  meta: localeHead.value.meta,
})) as unknown as Parameters<typeof useHead>[0]);
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
