/**
 * Derives `content/toc.volumes.json` and `content/toc.parts/part-NN.json`
 * (the app-facing split ToC — see AGENTS.md "Content model") from
 * `content/toc.json`, and writes them to disk. A pure local transform: this
 * never touches the network, only the already-in-memory/on-disk `toc.json`.
 *
 * Called by both importers right after they write `toc.json`, and by
 * `scripts/emit-toc-splits.ts` standalone (`pnpm emit:toc-splits`) to
 * regenerate the split files from a `toc.json` edited by hand. Idempotent:
 * running it twice against unchanged `toc.json`/`versions.json` produces a
 * byte-identical tree.
 *
 * `deriveTocVolumesFile`/`deriveTocPartFiles` are also the reference
 * implementation `scripts/validate-content.ts`'s equivalence check compares
 * the committed split files against.
 */
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  ChapterKind,
  ContentVersion,
  LanguageAvailability,
  PartAvailableSummary,
  Toc,
  TocChapter,
  TocPartFile,
  TocVolumesFile,
} from "../../shared/types/content.ts";

/**
 * Stable display/reading order for chapter kinds within a part. Duplicated
 * (rather than imported) from `app/utils/chapterGrouping.ts` and
 * `scripts/lib/toc-builder.ts` on purpose — `scripts/` and `app/` are
 * independent build graphs in this repo (see `toc-builder.ts`'s own copy)
 * so a shared import isn't available here. Keep all three in sync.
 */
const KIND_ORDER: ChapterKind[] = [
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "answers-terminology",
  "answers-topics",
];

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

export const deriveTocPartFiles = (toc: Toc): TocPartFile[] =>
  toc.volumes.flatMap((volume) =>
    volume.parts.map((part) => ({
      part: { id: part.id, number: part.number, title: part.title },
      volume: { id: volume.id, number: volume.number, title: volume.title },
      chapters: part.chapters,
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

  const partFiles = deriveTocPartFiles(toc);
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
