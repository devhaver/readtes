/**
 * Loads the volumes skeleton (`content/toc.volumes.json`, ~17KB — the
 * volumes -> parts shape without chapter lists, see AGENTS.md "Content
 * model") and the version registry (`content/versions.json`) via direct
 * `await import()`, and exposes them as `computed()` refs plus a
 * locale-aware title resolver.
 *
 * No `useAsyncData`: both files are statically bundled JSON, so the client
 * gets byte-identical data by importing the same chunk during hydration —
 * there's no fetch to coordinate, and wrapping a plain synchronous import in
 * `useAsyncData` would only re-add the payload-serialization cost this
 * composable exists to avoid (see T11 scaling notes in AGENTS.md). App code
 * must never import `content/toc.json` directly — that 2.9MB+ file is
 * build-time-only (importer, `validate-content`, `nuxt.config.ts` prerender
 * routes, the sitemap route).
 *
 * Async: `await useLocalizedVolumes()` at the top of `<script setup>`, same
 * calling convention as the composable this replaces.
 *
 * `zod` never enters this file: only the inferred types are imported (see
 * AGENTS.md "Content model").
 */
import type {
  ContentVersion,
  TocVolumeSkeleton,
} from "~~/shared/types/content";

export const useLocalizedVolumes = async () => {
  const { locale } = useI18n();

  const [volumesModule, versionsModule] = await Promise.all([
    import("~~/content/toc.volumes.json"),
    import("~~/content/versions.json"),
  ]);

  const volumesData = (
    volumesModule.default as { volumes: TocVolumeSkeleton[] }
  ).volumes;
  const versionsData = versionsModule.default as ContentVersion[];

  const volumes = computed<TocVolumeSkeleton[]>(() => volumesData);
  const versions = computed<ContentVersion[]>(() => versionsData);

  const localizedTitle = (title: LocalizedText): string =>
    localizedText(title, locale.value);

  return { volumes, versions, localizedTitle };
};
