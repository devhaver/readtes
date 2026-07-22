/**
 * KabbalahMedia importer for Talmud Eser HaSefirot — the official Bnei
 * Baruch translation, imported as `<lang>-bb` versions (`en-bb` etc.).
 *
 * `pnpm import:kabbalahmedia --part <N> --chapters <slug>[,<slug>...]`
 * fetches KabbalahMedia's `content_units` for each requested chapter,
 * iterates *every* language docx file it lists (not just English),
 * doc2html's each one, and — for languages whose document matches the
 * structural shape this importer knows how to parse (see
 * `km-chapter-parser.ts`) — builds `SourceSegment[]`/`CommentaryItem[]`
 * against that chapter's existing Hebrew ground truth
 * (`source.he-jerusalem-1956.json` / `commentary.he-jerusalem-1956.json`),
 * writes `content/`, updates `versions.json`/`toc.json`, and appends a
 * KabbalahMedia section to `content/COVERAGE.md`.
 *
 * Scope: only Part 1, chapters 1-2 have known KabbalahMedia content-unit
 * uids (`KM_CHAPTER_UIDS` below) — Inner Observation/Q&A alignment across
 * all 10 chapters is a follow-up job, deliberately not attempted here.
 *
 * A chapter/language combination whose document doesn't match the known
 * structure (verified so far: KabbalahMedia's English translation only —
 * Russian/German/Spanish/Turkish/Ukrainian all use different, not-yet-
 * supported docx->HTML shapes) is reported and skipped, never forced.
 *
 * See AGENTS.md for the shared HTTP client's politeness contract (cache
 * location, User-Agent, minimum interval between requests).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ChapterLayerFile,
  CommentaryItem,
  ContentVersion,
  SourceSegment,
  Toc,
  TocChapter,
} from "../shared/types/content.ts";
import {
  commentaryLayerFileSchema,
  sourceLayerFileSchema,
  tocSchema,
  versionsFileSchema,
} from "../shared/types/content.ts";
import { createHttpClient } from "./lib/http-client.ts";
import { DOCX_MIMETYPE, type KmContentUnit } from "./lib/km-api-types.ts";
import {
  groupKmChapterBlocks,
  matchLeadingNumber,
} from "./lib/km-chapter-parser.ts";
import {
  buildKmCoverageSection,
  KM_COVERAGE_HEADING,
  mergeMarkdownSection,
  type KmChapterOutcome,
  type KmLanguageOutcome,
} from "./lib/km-coverage.ts";
import { parseDocBlocks } from "./lib/km-doc-blocks.ts";
import { buildKmChapterGroundTruth } from "./lib/km-ground-truth.ts";
import {
  bcp47ForKmLanguage,
  kmVersionId,
  kmVersionTitle,
} from "./lib/km-language.ts";
import {
  buildKmCommentaryItems,
  buildKmSourceSegments,
} from "./lib/km-transform.ts";
import { validateContent } from "./validate-content.ts";

const KM_BASE = "https://kabbalahmedia.info";

/**
 * KabbalahMedia `content_units` uid for each chapter this importer knows
 * about. There is no discovery endpoint for this mapping (unlike Sefaria's
 * index) — verified manually per AGENTS.md/the task brief. Add an entry
 * here (never guess a uid) before importing a new chapter.
 */
const KM_CHAPTER_UIDS: Record<string, string> = {
  "part-01/chapter-01": "7scSATcZ",
  "part-01/chapter-02": "LIMg3y94",
};

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");
const cacheDir = join(repoRoot, ".superpowers/import-cache");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface CliArgs {
  part: number;
  chapters: string[];
  dryRun: boolean;
}

const parseArgs = (argv: string[]): CliArgs => {
  let part: number | undefined;
  let chapters: string[] | undefined;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--part") {
      part = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
    } else if (arg === "--chapters") {
      chapters = (argv[i + 1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      i += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  if (
    part === undefined ||
    Number.isNaN(part) ||
    !chapters ||
    chapters.length === 0
  ) {
    throw new Error(
      "Usage: import-kabbalahmedia --part <N> --chapters <slug>[,<slug>...] [--dry-run]",
    );
  }

  return { part, chapters, dryRun };
};

// ---------------------------------------------------------------------------
// File I/O helpers (see AGENTS.md "Content model" — mirrors import-sefaria.ts)
// ---------------------------------------------------------------------------

const chapterDirFor = (partId: string, slug: string): string =>
  join(contentDir, "parts", partId, "chapters", slug);

const writeJsonFile = (path: string, data: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

const readHeSourceSegments = (dir: string): SourceSegment[] => {
  const path = join(dir, "source.he-jerusalem-1956.json");
  if (!existsSync(path)) {
    throw new Error(
      `${path}: missing — the KabbalahMedia importer requires the Hebrew ground truth to already exist for this chapter`,
    );
  }
  const parsed = sourceLayerFileSchema.parse(
    JSON.parse(readFileSync(path, "utf-8")),
  );
  return parsed.items;
};

const readHeCommentaryItems = (dir: string): CommentaryItem[] => {
  const path = join(dir, "commentary.he-jerusalem-1956.json");
  if (!existsSync(path)) {
    throw new Error(
      `${path}: missing — the KabbalahMedia importer requires the Hebrew ground truth to already exist for this chapter`,
    );
  }
  const parsed = commentaryLayerFileSchema.parse(
    JSON.parse(readFileSync(path, "utf-8")),
  );
  return parsed.items;
};

const heSefariaRef = (
  dir: string,
  layerFileName: string,
): string | undefined => {
  const path = join(dir, layerFileName);
  if (!existsSync(path)) return undefined;
  const raw = JSON.parse(readFileSync(path, "utf-8")) as {
    sefariaRef?: string;
  };
  return raw.sefariaRef;
};

// ---------------------------------------------------------------------------
// Structure detection
// ---------------------------------------------------------------------------

/**
 * A document matches the shape this importer knows how to parse when it has
 * at least one numbered `h5` item and at least one `h6` (commentary-section)
 * heading. Verified true for KabbalahMedia's English translation; verified
 * FALSE (different docx->HTML shapes entirely) for Russian, German,
 * Spanish, Turkish, and Ukrainian as of this writing — those are reported
 * as "structure-unsupported", never force-parsed.
 */
const isSupportedKmStructure = (
  blocks: { tag: string; html: string }[],
): boolean =>
  blocks.some(
    (b) => b.tag === "h5" && matchLeadingNumber(b.html) !== undefined,
  ) && blocks.some((b) => b.tag === "h6");

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

interface LanguageAccumulator {
  kmLanguage: string;
  versionId: string;
  title: string;
  chapters: KmChapterOutcome[];
  warnings: string[];
  sourceByChapter: Map<
    string,
    { sefariaRef?: string; segments: SourceSegment[] }
  >;
  commentaryByChapter: Map<
    string,
    { sefariaRef?: string; items: CommentaryItem[] }
  >;
}

const createLanguageAccumulator = (
  kmLanguage: string,
): LanguageAccumulator => ({
  kmLanguage,
  versionId: kmVersionId(kmLanguage),
  title: kmVersionTitle(kmLanguage),
  chapters: [],
  warnings: [],
  sourceByChapter: new Map(),
  commentaryByChapter: new Map(),
});

export const main = async (argv: string[]): Promise<void> => {
  const args = parseArgs(argv);
  const partId = `part-${String(args.part).padStart(2, "0")}`;

  const toc: Toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions: ContentVersion[] = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );
  const versionsById = new Map(versions.map((v) => [v.id, v]));

  const client = createHttpClient({ cacheDir });
  const languages = new Map<string, LanguageAccumulator>();
  const chapterLevelWarnings: string[] = [];

  for (const slug of args.chapters) {
    const chapterId = `${partId}/${slug}`;
    const uid = KM_CHAPTER_UIDS[chapterId];
    if (!uid) {
      chapterLevelWarnings.push(
        `${chapterId}: no known KabbalahMedia content-unit uid — add one to KM_CHAPTER_UIDS before importing this chapter (skipped)`,
      );
      continue;
    }

    const dir = chapterDirFor(partId, slug);
    const heSegments = readHeSourceSegments(dir);
    const heCommentaryItems = readHeCommentaryItems(dir);
    const groundTruth = buildKmChapterGroundTruth(heCommentaryItems);
    const sourceRef = heSefariaRef(dir, "source.he-jerusalem-1956.json");
    const commentaryRef = heSefariaRef(
      dir,
      "commentary.he-jerusalem-1956.json",
    );

    console.log(`Fetching ${chapterId} (KabbalahMedia uid ${uid})...`);
    const unit = await client.getJson<KmContentUnit>(
      `${KM_BASE}/backend/content_units/${uid}`,
    );

    const docFiles = (unit.files ?? []).filter(
      (f) => f.mimetype === DOCX_MIMETYPE && f.language !== "he",
    );

    for (const file of docFiles) {
      const acc =
        languages.get(file.language) ??
        createLanguageAccumulator(file.language);
      languages.set(file.language, acc);

      const html = await client.getText(
        `${KM_BASE}/assets/api/doc2html/${file.id}`,
      );
      const blocks = parseDocBlocks(html);

      if (!isSupportedKmStructure(blocks)) {
        acc.chapters.push({
          chapterId,
          status: "structure-unsupported",
          sourceSegments: 0,
          commentaryItems: 0,
          sourceItemsSkipped: 0,
          commentaryParagraphsSkipped: 0,
          unmatchedNumerals: 0,
        });
        continue;
      }

      const structure = groupKmChapterBlocks(blocks);
      const sourceResult = buildKmSourceSegments(
        structure.items,
        heSegments,
        groundTruth,
      );
      const commentaryResult = buildKmCommentaryItems(
        structure.commentaryParagraphs,
        groundTruth,
      );

      acc.warnings.push(
        ...sourceResult.warnings.map((w) => `${chapterId} source: ${w}`),
        ...commentaryResult.warnings.map(
          (w) => `${chapterId} commentary: ${w}`,
        ),
      );
      acc.chapters.push({
        chapterId,
        status: "imported",
        sourceSegments: sourceResult.segments.length,
        commentaryItems: commentaryResult.items.length,
        sourceItemsSkipped:
          structure.items.length - sourceResult.segments.length,
        commentaryParagraphsSkipped:
          structure.commentaryParagraphs.length - commentaryResult.items.length,
        unmatchedNumerals: [
          ...sourceResult.warnings,
          ...commentaryResult.warnings,
        ].filter((w) => w.includes("no matching anchor")).length,
      });

      if (sourceResult.segments.length > 0) {
        acc.sourceByChapter.set(chapterId, {
          sefariaRef: sourceRef,
          segments: sourceResult.segments,
        });
      }
      if (commentaryResult.items.length > 0) {
        acc.commentaryByChapter.set(chapterId, {
          sefariaRef: commentaryRef,
          items: commentaryResult.items,
        });
      }
    }
  }

  // --- Write content files, update versions.json/toc.json -------------------
  const tocChapterIndex = new Map<string, TocChapter>();
  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters)
        tocChapterIndex.set(chapter.id, chapter);
    }
  }

  let versionsChanged = false;
  for (const acc of languages.values()) {
    const hasContent =
      acc.sourceByChapter.size > 0 || acc.commentaryByChapter.size > 0;
    if (!hasContent) continue;

    if (!versionsById.has(acc.versionId)) {
      const version: ContentVersion = {
        id: acc.versionId,
        language: bcp47ForKmLanguage(acc.kmLanguage),
        direction: "ltr",
        title: acc.title,
        license: "Used with permission",
        source: "kabbalahmedia",
      };
      versions.push(version);
      versionsById.set(version.id, version);
      versionsChanged = true;
    }

    for (const [chapterId, { sefariaRef, segments }] of acc.sourceByChapter) {
      const [chapterPartId, slug] = chapterId.split("/") as [string, string];
      const dir = chapterDirFor(chapterPartId, slug);
      const file: ChapterLayerFile<SourceSegment> = {
        chapterId,
        layer: "source",
        versionId: acc.versionId,
        ...(sefariaRef ? { sefariaRef } : {}),
        items: segments,
      };
      if (!args.dryRun) {
        writeJsonFile(join(dir, `source.${acc.versionId}.json`), file);
      }
      const tocChapter = tocChapterIndex.get(chapterId);
      if (
        tocChapter &&
        !tocChapter.availableVersions.source.includes(acc.versionId)
      ) {
        tocChapter.availableVersions.source.unshift(acc.versionId);
        if (!tocChapter.availableLayers.includes("source")) {
          tocChapter.availableLayers.push("source");
        }
      }
    }

    for (const [chapterId, { sefariaRef, items }] of acc.commentaryByChapter) {
      const [chapterPartId, slug] = chapterId.split("/") as [string, string];
      const dir = chapterDirFor(chapterPartId, slug);
      const file: ChapterLayerFile<CommentaryItem> = {
        chapterId,
        layer: "commentary",
        versionId: acc.versionId,
        ...(sefariaRef ? { sefariaRef } : {}),
        items,
      };
      if (!args.dryRun) {
        writeJsonFile(join(dir, `commentary.${acc.versionId}.json`), file);
      }
      const tocChapter = tocChapterIndex.get(chapterId);
      if (
        tocChapter &&
        !tocChapter.availableVersions.commentary.includes(acc.versionId)
      ) {
        tocChapter.availableVersions.commentary.unshift(acc.versionId);
        if (!tocChapter.availableLayers.includes("commentary")) {
          tocChapter.availableLayers.push("commentary");
        }
      }
    }
  }

  if (!args.dryRun) {
    if (versionsChanged) {
      writeJsonFile(join(contentDir, "versions.json"), versions);
    }
    writeJsonFile(join(contentDir, "toc.json"), toc);
  }

  // --- Coverage report --------------------------------------------------------
  const languageOutcomes: KmLanguageOutcome[] = [...languages.values()].map(
    (acc) => ({
      versionId: acc.versionId,
      kmLanguage: acc.kmLanguage,
      title: acc.title,
      chapters: acc.chapters,
      warnings: acc.warnings,
    }),
  );
  const coverageSection = buildKmCoverageSection(languageOutcomes);
  console.log(`\n${KM_COVERAGE_HEADING}\n\n${coverageSection}`);
  for (const warning of chapterLevelWarnings) console.warn(`! ${warning}`);

  if (!args.dryRun) {
    const coveragePath = join(contentDir, "COVERAGE.md");
    const existing = existsSync(coveragePath)
      ? readFileSync(coveragePath, "utf-8")
      : "# Import coverage\n";
    writeFileSync(
      coveragePath,
      mergeMarkdownSection(existing, KM_COVERAGE_HEADING, coverageSection),
      "utf-8",
    );

    const { errors } = validateContent(contentDir);
    if (errors.length > 0) {
      for (const error of errors) console.error(`✖ ${error}`);
      console.error(
        `\n${errors.length} content validation error(s) after import.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log("\n✓ Content validation passed.");
  }

  const stats = client.stats();
  console.log(
    `\nHTTP: ${stats.requests} request(s), ${stats.cacheHits} cache hit(s).`,
  );
};

const isRunAsScript = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === `file://${entry}`;
};

if (isRunAsScript()) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
