/**
 * Derives `content/toc.volumes.json` and `content/toc.parts/part-NN.json`
 * (the app-facing split ToC — see AGENTS.md "Content model") from
 * `content/toc.json`, and writes them to disk. Never touches the network —
 * only `toc.json`/`versions.json`, already in memory or read from disk, plus
 * (see `itemCountFor` below) the committed content of the specific
 * `answers-*` chapters `toc.json` itself names, to compute their
 * `TocChapter.itemCount`.
 *
 * Called by both importers right after they write `toc.json`, and by
 * `scripts/emit-toc-splits.ts` standalone (`pnpm emit:toc-splits`) to
 * regenerate the split files from a `toc.json` edited by hand. Idempotent:
 * running it twice against unchanged `toc.json`/`versions.json`/content
 * produces a byte-identical tree.
 *
 * `deriveTocVolumesFile`/`deriveTocPartFiles` are also the reference
 * implementation `scripts/validate-content.ts`'s equivalence check compares
 * the committed split files against.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type {
  ContentVersion,
  LanguageAvailability,
  PartAvailableSummary,
  Toc,
  TocChapter,
  TocPartFile,
  TocVolumesFile,
} from "../../shared/types/content.ts";
import { chapterLayerFileSchema } from "../../shared/types/content.ts";
import { CHAPTER_KIND_ORDER } from "../../shared/utils/chapterKinds.ts";
import { isConsolidatedQaKind } from "./qa-consolidation.ts";

/**
 * The canonical Hebrew source is complete for every list chapter in the
 * corpus (checked against the full committed tree) — preferred over any
 * other version so `itemCountFor` reads the fullest available item set.
 * Falls back to the chapter's first available source version (sorted, for
 * determinism) on the off chance a future chapter lacks it.
 */
const CANONICAL_SOURCE_VERSION_ID = "he-jerusalem-1956";

/**
 * The highest `n` a consolidated `answers-*` chapter's own committed source
 * carries — see `TocChapter.itemCount`. Reads straight off disk rather than
 * `toc.json` because no ToC-level field records it otherwise: consolidation
 * (#91) folded what used to be one-chapter-per-answer (and so one
 * `TocChapter.number` per answer) into a single chapter, which lost that
 * per-answer accounting entirely. Returns `undefined` for a chapter with no
 * source versions at all (nothing to read).
 */
const itemCountFor = (
  contentDir: string,
  partId: string,
  chapter: TocChapter,
): number | undefined => {
  const sourceVersions = chapter.availableVersions.source;
  if (sourceVersions.length === 0) return undefined;

  const versionId = sourceVersions.includes(CANONICAL_SOURCE_VERSION_ID)
    ? CANONICAL_SOURCE_VERSION_ID
    : [...sourceVersions].sort()[0]!;

  const slug = chapter.id.split("/")[1] as string;
  const filePath = join(
    contentDir,
    "parts",
    partId,
    "chapters",
    slug,
    `source.${versionId}.json`,
  );
  if (!existsSync(filePath)) return undefined;

  const file = chapterLayerFileSchema.parse(
    JSON.parse(readFileSync(filePath, "utf-8")),
  );
  if (file.layer !== "source") return undefined;

  return file.items.reduce((highest, item) => Math.max(highest, item.n), 0);
};

/** Stable display/reading order for chapter kinds within a part — `shared/` is reachable from both build graphs, so there is one list. */
const KIND_ORDER = CHAPTER_KIND_ORDER;

/**
 * A part's chapters in true reading order: kind first, `number` within a
 * kind second — mirrors `app/utils/toc.ts`'s `orderedPartChapters`, which
 * the app-side reader relies on for the same ordering.
 */
const orderedChapters = (chapters: TocChapter[]): TocChapter[] =>
  [...chapters].sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      a.number - b.number,
  );

/**
 * Per-language ("he"/"en") coverage across a part's chapters: `"full"` when
 * every chapter has that language in some layer, `"partial"` when some do,
 * `"none"` when zero do (including an empty part). Duplicated (rather than
 * imported) from `app/utils/contentAvailability.ts`'s `partLanguageAvailability`
 * for the same cross-build-graph reason as `KIND_ORDER` above — this is the
 * one-time emit-time computation baked into `toc.volumes.json`, the app
 * itself never recomputes it.
 */
const partAvailableSummary = (
  chapters: TocChapter[],
  versions: ContentVersion[],
): PartAvailableSummary => {
  const languageById = new Map(versions.map((v) => [v.id, v.language]));
  const total = chapters.length;

  if (total === 0) return { he: "none", en: "none" };

  const versionIdsOf = (chapter: TocChapter): string[] => [
    ...chapter.availableVersions.summary,
    ...chapter.availableVersions.source,
    ...chapter.availableVersions.commentary,
  ];

  let heCount = 0;
  let enCount = 0;
  for (const chapter of chapters) {
    const languages = new Set(
      versionIdsOf(chapter).map((id) => languageById.get(id)),
    );
    if (languages.has("he")) heCount++;
    if (languages.has("en")) enCount++;
  }

  const stateFor = (count: number): LanguageAvailability =>
    count === 0 ? "none" : count === total ? "full" : "partial";

  return { he: stateFor(heCount), en: stateFor(enCount) };
};

export const deriveTocVolumesFile = (
  toc: Toc,
  versions: ContentVersion[],
): TocVolumesFile => ({
  volumes: toc.volumes.map((volume) => ({
    id: volume.id,
    number: volume.number,
    title: volume.title,
    parts: volume.parts.map((part) => {
      const ordered = orderedChapters(part.chapters);
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const kindsPresent = KIND_ORDER.filter((kind) =>
        part.chapters.some((chapter) => chapter.kind === kind),
      );

      return {
        id: part.id,
        number: part.number,
        title: part.title,
        sefariaNode: part.sefariaNode,
        chapterCount: part.chapters.length,
        kindsPresent,
        firstChapterId: first?.id ?? null,
        lastChapterId: last?.id ?? null,
        firstChapterTitle: first?.title ?? null,
        lastChapterTitle: last?.title ?? null,
        availableSummary: partAvailableSummary(part.chapters, versions),
      };
    }),
  })),
});

/**
 * `contentDir` is only ever consulted for `answers-*` chapters — see
 * `itemCountFor`. Every other chapter's `TocChapter` passes through
 * untouched, same as before.
 */
export const deriveTocPartFiles = (
  toc: Toc,
  contentDir: string,
): TocPartFile[] =>
  toc.volumes.flatMap((volume) =>
    volume.parts.map((part) => ({
      part: { id: part.id, number: part.number, title: part.title },
      volume: { id: volume.id, number: volume.number, title: volume.title },
      chapters: part.chapters.map((chapter) =>
        isConsolidatedQaKind(chapter.kind)
          ? {
              ...chapter,
              itemCount: itemCountFor(contentDir, part.id, chapter),
            }
          : chapter,
      ),
    })),
  );

const writeJsonFile = (path: string, data: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

/**
 * Derives and writes `toc.volumes.json` + `toc.parts/*.json` from an
 * in-memory `toc`/`versions`, removing any stale `toc.parts/*.json` left
 * over from a part id that no longer exists in `toc.json`.
 */
export const writeTocSplitFiles = (
  contentDir: string,
  toc: Toc,
  versions: ContentVersion[],
): void => {
  const volumesFile = deriveTocVolumesFile(toc, versions);
  writeJsonFile(join(contentDir, "toc.volumes.json"), volumesFile);

  const partFiles = deriveTocPartFiles(toc, contentDir);
  const partsDir = join(contentDir, "toc.parts");
  const expectedFileNames = new Set(
    partFiles.map((file) => `${file.part.id}.json`),
  );

  for (const file of partFiles) {
    writeJsonFile(join(partsDir, `${file.part.id}.json`), file);
  }

  const existingFileNames = ((): string[] => {
    try {
      return readdirSync(partsDir);
    } catch {
      return [];
    }
  })();
  for (const name of existingFileNames) {
    if (name.endsWith(".json") && !expectedFileNames.has(name)) {
      unlinkSync(join(partsDir, name));
    }
  }
};
