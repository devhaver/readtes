/**
 * Loads a chapter's layer/version content files. Only the specific files a
 * chapter actually has (per `toc.json`'s `availableVersions`) are ever
 * fetched — `import.meta.glob(..., { lazy: default })` over every content
 * file under `content/parts/**` gives each one its own dynamically-imported
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
 */
import type { ComputedRef } from "vue";
import type {
  ChapterLayerFile,
  CommentaryItem,
  LayerItem,
  LayerKind,
  SourceSegment,
  SummaryItem,
  TocChapter,
} from "~~/shared/types/content";

type AvailableVersions = TocChapter["availableVersions"];

// A relative path, not the `~~` alias: `import.meta.glob` patterns are
// statically analyzed (by Vite's own glob-import plugin) rather than run
// through normal module resolution, so a plain relative path is the safest
// choice — verified against the actual generated output, not assumed.
const chapterLayerModules = import.meta.glob<{ default: unknown }>(
  "../../content/parts/**/*.json",
);

const findLoader = (
  partId: string,
  chapterSlug: string,
  layer: LayerKind,
  versionId: string,
) => {
  const suffix = `/parts/${partId}/chapters/${chapterSlug}/${layer}.${versionId}.json`;
  const key = Object.keys(chapterLayerModules).find((candidate) =>
    candidate.endsWith(suffix),
  );
  return key ? chapterLayerModules[key] : undefined;
};

const loadLayerFile = async <T extends LayerItem>(
  partId: string,
  chapterSlug: string,
  layer: LayerKind,
  versionId: string,
): Promise<ChapterLayerFile<T> | null> => {
  const loader = findLoader(partId, chapterSlug, layer, versionId);
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
  summaryVersions: ComputedRef<string[]>;
  sourceByVersion: ComputedRef<
    Record<string, ChapterLayerFile<SourceSegment> | null>
  >;
  commentaryByVersion: ComputedRef<
    Record<string, ChapterLayerFile<CommentaryItem> | null>
  >;
  summaryByVersion: ComputedRef<
    Record<string, ChapterLayerFile<SummaryItem> | null>
  >;
}

export const useChapterContent = async (
  partId: string,
  chapterSlug: string,
  availableVersions: AvailableVersions,
): Promise<ChapterContent> => {
  const [source, commentary, summary] = await Promise.all([
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
    loadAllVersions<SummaryItem>(
      partId,
      chapterSlug,
      "summary",
      availableVersions.summary,
    ),
  ]);

  return {
    sourceVersions: computed(() => availableVersions.source),
    commentaryVersions: computed(() => availableVersions.commentary),
    summaryVersions: computed(() => availableVersions.summary),
    sourceByVersion: computed(() => source),
    commentaryByVersion: computed(() => commentary),
    summaryByVersion: computed(() => summary),
  };
};
