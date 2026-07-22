/**
 * Loads the table of contents (`content/toc.json`) and the version registry
 * (`content/versions.json`) once, dynamically — keeping their (100+ chapter
 * entries and counting) JSON out of every page's initial bundle — and
 * exposes them as `computed()` refs plus a locale-aware title resolver.
 *
 * Async: `await useLocalizedToc()` at the top of `<script setup>`. Nuxt's
 * `useAsyncData` resolves before SSR/prerender output is finalized either
 * way, but pages that need to make a decision from the resolved data in the
 * same tick — e.g. `createError(404)` for an unknown volume slug, which
 * must also work correctly on a client-side navigation — need the explicit
 * await so `toc.value` is guaranteed populated immediately after the call.
 *
 * `zod` never enters this file: only the inferred types are imported (see
 * AGENTS.md "Content model").
 */
import type { ContentVersion, Toc } from "~~/shared/types/content";

interface LocalizedTocData {
  toc: Toc;
  versions: ContentVersion[];
}

export const useLocalizedToc = async () => {
  const { locale } = useI18n();

  const { data } = await useAsyncData<LocalizedTocData>(
    "localized-toc",
    async () => {
      const [tocModule, versionsModule] = await Promise.all([
        import("~~/content/toc.json"),
        import("~~/content/versions.json"),
      ]);

      return {
        toc: tocModule.default as Toc,
        versions: versionsModule.default as ContentVersion[],
      };
    },
  );

  const toc = computed<Toc>(() => data.value?.toc ?? { volumes: [] });
  const versions = computed<ContentVersion[]>(() => data.value?.versions ?? []);

  const localizedTitle = (title: LocalizedText): string =>
    localizedText(title, locale.value);

  return { toc, versions, localizedTitle };
};
