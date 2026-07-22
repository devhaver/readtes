/**
 * Per-page SEO meta beyond what `app.vue`'s `useLocaleHead()` call already
 * gives every page for free (canonical link, hreflang alternates, og:url,
 * og:locale/og:locale:alternate — see that file). This composable adds:
 * `<title>` + meta description, og:title/og:description/og:type/
 * og:site_name, the shared og:image (+ dimensions + alt), and
 * twitter:card. Call it once per page, near the top of `<script setup>`.
 *
 * `title`/`description` accept a getter so callers can pass a `computed`-
 * backed string (e.g. one that interpolates a chapter/volume title loaded
 * from `content/toc.json`) without this composable needing to know
 * anything about where the string comes from.
 */
interface LocalizedSeoOptions {
  title: () => string;
  description: () => string;
  /** @default "website" */
  type?: "website" | "article";
}

export const useLocalizedSeo = (options: LocalizedSeoOptions): void => {
  const { t } = useI18n();
  const { public: publicConfig } = useRuntimeConfig();

  const ogImageUrl = computed(
    () => `${publicConfig.siteUrl}/images/og-card.png`,
  );

  useSeoMeta({
    title: options.title,
    description: options.description,
    ogTitle: options.title,
    ogDescription: options.description,
    ogType: options.type ?? "website",
    ogSiteName: () => t("common.siteName"),
    ogImage: () => ogImageUrl.value,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => t("seo.ogImageAlt"),
    twitterCard: "summary_large_image",
  });
};
