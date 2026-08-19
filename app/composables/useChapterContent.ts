/**
 * Loads a chapter's layer/version content files. Only the specific files a
 * chapter actually has (per `toc.json`'s `availableVersions`) are ever
 * fetched — `import.meta.glob(..., { lazy: default })`, one per part (see
 * `~/utils/content-loaders`), gives each file its own dynamically-imported
 * chunk, so a chapter's route bundle never pulls in the other 500+ files.
 *
 * All of a chapter's available versions (not just the currently-selected
 * one) are loaded up front: the reader is a static site, there is no
 * "fetch on version switch" — switching the version `<select>` just swaps
 * which already-loaded object a pane renders, so it's instant offline too.
 *
 * Direct `await import()`, no `useAsyncData`: these are statically bundled
 * JSON files, not a fetch — server and client resolve the identical module,
 * so there's nothing for `useAsyncData` to coordinate, and wrapping the
 * import would only re-add the payload-serialization cost this composable
 * exists to avoid (a chapter's full text would otherwise ride in the page
 * payload *in addition to* the rendered HTML markup — see T11 scaling notes
 * in AGENTS.md). A missing layer/version file resolves to `null`, never a
 * throw — most chapters simply don't have every layer/version.
 *
 * Takes the chapter's `availableVersions` as a plain argument (rather than
 * re-resolving the toc internally) so this composable's first statement is
 * its own logic, independent of how the caller resolved the chapter.
 *
 * Only loads the `source`/`commentary` layers — the reader no longer has a
 * summary pane (the layer is effectively dead: exactly 1 file exists across
 * the whole corpus) and `usePartScopedSections` covers the part-scoped
 * Inner Observation reference pane separately, so nothing here needs the
 * `summary` layer any more. `loadLayerFile` is exported for that composable
 * to reuse — same per-part lazy chunk maps, not a second set of
 * `import.meta.glob`s over the same files.
 *
 * T13 scaling fix — one `import.meta.glob` over all of `content/parts/**`
 * compiled its path→import-thunk map into a 1.4MB (135KB gz) chunk that
 * every reader page loaded in prod, plus a 2.1MB dev module. `findLoader` is
 * now async: it resolves only the requested chapter's *part* via
 * `~/utils/content-loaders`'s dispatcher, so a page only ever loads its own
 * part's map.
 */
import type { ComputedRef } from "vue";
import { loadPartContentModules } from "~/utils/content-loaders";
import type {
  ChapterLayerFile,
  CommentaryItem,
  LayerItem,
  LayerKind,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";

type AvailableVersions = TocChapter["availableVersions"];

const findLoader = async (
  partId: string,
  chapterSlug: string,
  layer: LayerKind,
  versionId: string,
) => {
  const partContentModules = await loadPartContentModules(partId);
  if (!partContentModules) return undefined;

  const suffix = `/parts/${partId}/chapters/${chapterSlug}/${layer}.${versionId}.json`;
  const key = Object.keys(partContentModules).find((candidate) =>
    candidate.endsWith(suffix),
  );
  return key ? partContentModules[key] : undefined;
};

export const loadLayerFile = async <T extends LayerItem>(
  partId: string,
  chapterSlug: string,
  layer: LayerKind,
  versionId: string,
): Promise<ChapterLayerFile<T> | null> => {
  const loader = await findLoader(partId, chapterSlug, layer, versionId);
  if (!loader) return null;

  const mod = await loader();
  return (mod as { default: ChapterLayerFile<T> }).default;
};

const loadAllVersions = async <T extends LayerItem>(
  partId: string,
  chapterSlug: string,
  layer: LayerKind,
  versionIds: string[],
): Promise<Record<string, ChapterLayerFile<T> | null>> => {
  const entries = await Promise.all(
    versionIds.map(async (versionId) => {
      const file = await loadLayerFile<T>(
        partId,
        chapterSlug,
        layer,
        versionId,
      );
      return [versionId, file] as const;
    }),
  );

  return Object.fromEntries(entries);
};

export interface ChapterContent {
  sourceVersions: ComputedRef<string[]>;
  commentaryVersions: ComputedRef<string[]>;
  sourceByVersion: ComputedRef<
    Record<string, ChapterLayerFile<SourceSegment> | null>
  >;
  commentaryByVersion: ComputedRef<
    Record<string, ChapterLayerFile<CommentaryItem> | null>
  >;
}

export const useChapterContent = async (
  partId: string,
  chapterSlug: string,
  availableVersions: AvailableVersions,
): Promise<ChapterContent> => {
  const [source, commentary] = await Promise.all([
    loadAllVersions<SourceSegment>(
      partId,
      chapterSlug,
      "source",
      availableVersions.source,
    ),
    loadAllVersions<CommentaryItem>(
      partId,
      chapterSlug,
      "commentary",
      availableVersions.commentary,
    ),
  ]);

  return {
    sourceVersions: computed(() => availableVersions.source),
    commentaryVersions: computed(() => availableVersions.commentary),
    sourceByVersion: computed(() => source),
    commentaryByVersion: computed(() => commentary),
  };
};
