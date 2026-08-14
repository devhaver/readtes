/**
 * KabbalahMedia importer for Talmud Eser HaSefirot — the official Bnei
 * Baruch translation, imported as `<lang>-bb` versions (`en-bb` etc.).
 *
 * `pnpm import:kabbalahmedia (--part <N> | --all) [--dry-run]` discovers
 * every part/chapter this importer knows how to fetch straight from
 * KabbalahMedia's `sqdata` tree (see `scripts/lib/km-tree.ts` — there is no
 * hardcoded uid table anymore), classifies each of a part's tree leaves by
 * name, and — depending on that classification — runs one of three parsing
 * dialects, each with its own verified doc shape (see AGENTS.md
 * "KabbalahMedia import"):
 *
 *  1. **Per-chapter leaf** (`"Chapter N"` articles, Parts 1-4): numbered
 *     `(N)` markers convert to anchors against the chapter's existing
 *     Hebrew ground truth; commentary paragraphs align by the printed
 *     numeral's *gematria value* (`km-chapter-parser.ts` /
 *     `km-transform.ts`, unchanged from the original single-part
 *     implementation, just now invoked once per discovered leaf instead of
 *     from a hardcoded uid table).
 *  2. **Whole-part doc** (Parts 5-8, 16, which have no per-chapter leaves
 *     for their main "chapter" kind at all): one doc holds every chapter's
 *     single seif in document order; each numbered `h5` item aligns
 *     *positionally* against the part's Nth "chapter" chapter — source
 *     only, since none of these parts' Hebrew ground truth has a
 *     commentary layer to align KM's Ohr Pnimi text against (never
 *     fabricated: no Sefaria ref exists for it, so it is parsed out of the
 *     doc but not written — see `km-order-align.ts`).
 *  3. **Combined Q&A table doc** ("Table of Questions/Answers for the
 *     Meaning of the Words"/"...for Topics"): one doc holds `h6` question +
 *     `p` answer pairs in document order; the questions half writes one
 *     `questions-*` chapter with all N items, the answers half splits
 *     positionally into N single-item `answers-*` chapters (`km-qa-blocks.ts`
 *     + `km-order-align.ts`).
 *
 * Anything this importer doesn't recognize (Inner Observation — verified to
 * use a different doc shape per part; the Cause/Consequence family, which
 * has no `ChapterKind` yet; Parts 9-15, which have no non-Hebrew
 * KabbalahMedia files at all) is reported in the coverage output, never
 * force-parsed or guessed.
 *
 * See AGENTS.md for the shared HTTP client's politeness contract (cache
 * location, User-Agent, minimum interval between requests).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ChapterKind,
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
import {
  createHttpClient,
  HttpClientError,
  type HttpClient,
} from "./lib/http-client.ts";
import {
  DOCX_MIMETYPE,
  type KmContentUnit,
  type KmFile,
} from "./lib/km-api-types.ts";
import {
  dedupeKmDocumentCandidates,
  resolveKmDocumentCandidate,
  type KmDocumentCandidate,
} from "./lib/km-candidates.ts";
import {
  groupKmChapterBlocks,
  hasNumberedKmItems,
  isSupportedKmStructure,
} from "./lib/km-chapter-parser.ts";
import { KM_TOTAL_PARTS, parseKmArgs } from "./lib/km-cli.ts";
import {
  buildKmCoverageSection,
  KM_COVERAGE_HEADING,
  mergeMarkdownSection,
  type KmChapterOutcome,
  type KmLanguageOutcome,
} from "./lib/km-coverage.ts";
import { parseDocBlocks } from "./lib/km-doc-blocks.ts";
import {
  groupKmFlatWholePartBlocks,
  hasFlatNumberedItems,
} from "./lib/km-flat-whole-part-parser.ts";
import { buildKmChapterGroundTruth } from "./lib/km-ground-truth.ts";
import {
  buildHeChapterContent,
  matchHeChapterHeading,
  parseHeChapterBody,
  parseHeDocBlocks,
} from "./lib/km-he-whole-part-parser.ts";
import {
  bcp47ForKmLanguage,
  KM_EXPECTED_LANGUAGES,
  kmVersionDirection,
  kmVersionId,
  kmVersionTitle,
  missingKmLanguages,
} from "./lib/km-language.ts";
import {
  buildOrderAlignedGroundSegments,
  splitOrderAlignedSegments,
  validateNumberedOrderAlignment,
  validateTranslationPlausibility,
  type OrderAlignedTargetChapter,
} from "./lib/km-order-align.ts";
import {
  isSupportedKmQaStructure,
  parseKmQaPairs,
  validateKmQaPairs,
} from "./lib/km-qa-blocks.ts";
import { removeKmVersionAvailability } from "./lib/km-reconcile.ts";
import {
  buildKmCommentaryItems,
  buildKmSourceSegments,
} from "./lib/km-transform.ts";
import {
  classifyKmArticle,
  extractKmTesTree,
  indexKmTreePartsByNumber,
  KM_TES_COLLECTION_UID,
  parseKmChapterLeafNumber,
  type KmLeafRole,
  type KmSqData,
  type KmTreeArticle,
  type KmTreePart,
} from "./lib/km-tree.ts";
import {
  groupKmUnnumberedWholePartBlocks,
  hasUnnumberedKmItems,
  parseDeclaredItemRange,
} from "./lib/km-unnumbered-whole-part-parser.ts";
import { firstSegmentPerAnswer } from "./lib/qa-consolidation.ts";
import { writeTocSplitFiles } from "./lib/toc-splits.ts";
import { validateContent } from "./validate-content.ts";

const KM_BASE = "https://kabbalahmedia.info";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");
const cacheDir = join(repoRoot, ".superpowers/import-cache");

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

/** Same as `readHeSourceSegments`, but `undefined` (never throws) when the file is missing — for dialects that must warn-and-skip rather than abort the whole run. */
const readHeSourceSegmentsOptional = (
  dir: string,
): SourceSegment[] | undefined => {
  const path = join(dir, "source.he-jerusalem-1956.json");
  if (!existsSync(path)) return undefined;
  return sourceLayerFileSchema.parse(JSON.parse(readFileSync(path, "utf-8")))
    .items;
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
// Language accumulator (shared across every part/dialect processed this run)
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

const getAcc = (
  languages: Map<string, LanguageAccumulator>,
  kmLanguage: string,
): LanguageAccumulator => {
  const existing = languages.get(kmLanguage);
  if (existing) return existing;
  const created = createLanguageAccumulator(kmLanguage);
  languages.set(kmLanguage, created);
  return created;
};

const zeroCounts = {
  sourceSegments: 0,
  commentaryItems: 0,
  sourceItemsSkipped: 0,
  commentaryParagraphsSkipped: 0,
  unmatchedNumerals: 0,
};

/**
 * Fetches every candidate content-unit id (a whole-part doc may attach to
 * the PART node itself, a leaf named after the part, or both — see
 * AGENTS.md), collecting their docx files by language in caller priority
 * order. Candidate content-unit 404s are optional absences; every other
 * failure propagates. Dialect processors inspect candidates lazily and use
 * the first one whose structure and alignment both validate.
 */
const collectKmDocFilesByLanguage = async (
  client: HttpClient,
  candidateUids: string[],
): Promise<Map<string, KmDocumentCandidate<KmFile>[]>> => {
  const byLanguage = new Map<string, KmDocumentCandidate<KmFile>[]>();
  for (const uid of [...new Set(candidateUids)]) {
    let unit: KmContentUnit;
    try {
      unit = await client.getJson<KmContentUnit>(
        `${KM_BASE}/backend/content_units/${uid}`,
      );
    } catch (error) {
      if (error instanceof HttpClientError && error.status === 404) continue;
      throw error;
    }
    for (const file of unit.files ?? []) {
      if (file.mimetype !== DOCX_MIMETYPE || file.language === "he") continue;
      const candidates = byLanguage.get(file.language) ?? [];
      candidates.push({ uid, file });
      byLanguage.set(file.language, dedupeKmDocumentCandidates(candidates));
    }
  }
  return byLanguage;
};

/**
 * `KM_EXPECTED_LANGUAGES` minus `"he"` — every non-Hebrew dialect below
 * fetches its docx files from a content unit that never carries a Hebrew
 * file (Hebrew only ever lives on a part's own PART node — see
 * `processHebrewWholePartDialect`), so reconciling those dialects' file
 * listings against the full expected set would always report `"he"` as
 * missing there too, clashing with the outcome the dedicated Hebrew pass
 * records for the same chapters. Hebrew's own presence/absence is checked
 * and recorded exclusively by that dedicated pass.
 */
const KM_EXPECTED_NON_HE_LANGUAGES = KM_EXPECTED_LANGUAGES.filter(
  (language) => language !== "he",
);

const recordMissingLanguages = (
  languages: Map<string, LanguageAccumulator>,
  expectedLanguages: readonly string[],
  presentLanguages: Iterable<string>,
  targetChapterIds: string[],
): void => {
  for (const missing of missingKmLanguages(expectedLanguages, [
    ...presentLanguages,
  ])) {
    const acc = getAcc(languages, missing);
    for (const chapterId of targetChapterIds) {
      acc.chapters.push({
        chapterId,
        status: "no-file-for-language",
        ...zeroCounts,
      });
    }
  }
};

const reconcilePartOutcomes = (
  partId: string,
  tocChapters: TocChapter[],
  languages: Map<string, LanguageAccumulator>,
): void => {
  const chapterIds = new Set(tocChapters.map((chapter) => chapter.id));

  for (const kmLanguage of KM_EXPECTED_LANGUAGES) {
    const acc = getAcc(languages, kmLanguage);
    const outcomesByChapter = new Map<string, KmChapterOutcome[]>();
    for (const outcome of acc.chapters) {
      if (!chapterIds.has(outcome.chapterId)) continue;
      const outcomes = outcomesByChapter.get(outcome.chapterId) ?? [];
      outcomes.push(outcome);
      outcomesByChapter.set(outcome.chapterId, outcomes);
    }

    for (const chapter of tocChapters) {
      const outcomes = outcomesByChapter.get(chapter.id) ?? [];
      if (outcomes.length > 1) {
        throw new Error(
          `${partId}/${acc.versionId}: chapter ${chapter.id} has ${outcomes.length} coverage outcomes — expected exactly one`,
        );
      }
      if (outcomes.length === 0) {
        acc.chapters.push({
          chapterId: chapter.id,
          status: "no-file-for-language",
          ...zeroCounts,
        });
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Recognized but unsupported dialects
// ---------------------------------------------------------------------------

const recordUnsupportedDialect = async (
  uid: string,
  targetChapterIds: string[],
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
): Promise<void> => {
  if (targetChapterIds.length === 0) return;

  const unit = await client.getJson<KmContentUnit>(
    `${KM_BASE}/backend/content_units/${uid}`,
  );
  const presentLanguages = (unit.files ?? [])
    .filter((file) => file.mimetype === DOCX_MIMETYPE && file.language !== "he")
    .map((file) => file.language);

  recordMissingLanguages(
    languages,
    KM_EXPECTED_NON_HE_LANGUAGES,
    presentLanguages,
    targetChapterIds,
  );
  for (const language of presentLanguages) {
    const acc = getAcc(languages, language);
    for (const chapterId of targetChapterIds) {
      acc.chapters.push({
        chapterId,
        status: "structure-unsupported",
        ...zeroCounts,
      });
    }
  }
};

// ---------------------------------------------------------------------------
// Dialect 1: per-chapter leaf (Parts 1-4's "Chapter N" articles)
// ---------------------------------------------------------------------------

const processLeafChapterDialect = async (
  chapterId: string,
  uid: string,
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
  chapterLevelWarnings: string[],
): Promise<void> => {
  const [partId, slug] = chapterId.split("/") as [string, string];
  const dir = chapterDirFor(partId, slug);

  console.log(`Fetching ${chapterId} (KabbalahMedia uid ${uid})...`);
  const unit = await client.getJson<KmContentUnit>(
    `${KM_BASE}/backend/content_units/${uid}`,
  );
  const docFiles = (unit.files ?? []).filter(
    (file) => file.mimetype === DOCX_MIMETYPE && file.language !== "he",
  );
  recordMissingLanguages(
    languages,
    KM_EXPECTED_NON_HE_LANGUAGES,
    docFiles.map((file) => file.language),
    [chapterId],
  );

  let heSegments: SourceSegment[];
  let heCommentaryItems: CommentaryItem[];
  try {
    heSegments = readHeSourceSegments(dir);
    heCommentaryItems = readHeCommentaryItems(dir);
  } catch (error) {
    chapterLevelWarnings.push((error as Error).message);
    for (const file of docFiles) {
      getAcc(languages, file.language).chapters.push({
        chapterId,
        status: "unmatched",
        ...zeroCounts,
      });
    }
    return;
  }
  let groundTruth: ReturnType<typeof buildKmChapterGroundTruth>;
  try {
    groundTruth = buildKmChapterGroundTruth(heCommentaryItems);
  } catch (error) {
    for (const file of docFiles) {
      const acc = getAcc(languages, file.language);
      acc.chapters.push({
        chapterId,
        status: "unmatched",
        ...zeroCounts,
      });
      acc.warnings.push(`${chapterId}: ${(error as Error).message}`);
    }
    return;
  }
  const sourceRef = heSefariaRef(dir, "source.he-jerusalem-1956.json");
  const commentaryRef = heSefariaRef(dir, "commentary.he-jerusalem-1956.json");

  for (const file of docFiles) {
    const acc = getAcc(languages, file.language);
    const html = await client.getText(
      `${KM_BASE}/assets/api/doc2html/${file.id}`,
    );
    const blocks = parseDocBlocks(html);

    if (!isSupportedKmStructure(blocks)) {
      acc.chapters.push({
        chapterId,
        status: "structure-unsupported",
        ...zeroCounts,
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
      ...sourceResult.warnings.map((w) => `${chapterId} source: ${w.message}`),
      ...commentaryResult.warnings.map(
        (w) => `${chapterId} commentary: ${w.message}`,
      ),
    );
    acc.chapters.push({
      chapterId,
      status: "imported",
      sourceSegments: sourceResult.segments.length,
      commentaryItems: commentaryResult.items.length,
      sourceItemsSkipped: structure.items.length - sourceResult.segments.length,
      commentaryParagraphsSkipped:
        structure.commentaryParagraphs.length - commentaryResult.items.length,
      unmatchedNumerals: [
        ...sourceResult.warnings,
        ...commentaryResult.warnings,
      ].filter((w) => w.kind === "unmatched-marker").length,
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
};

// ---------------------------------------------------------------------------
// Dialect 2: whole-part doc, source-only, order-aligned (Parts 5-8, 16)
// ---------------------------------------------------------------------------

/**
 * One pseudo ground-truth entry per target chapter that already has a
 * Hebrew source segment on disk, keyed by that chapter's own 1-based
 * `number` — the input `buildOrderAlignedGroundSegments` needs to align a
 * whole-part doc's numbered items positionally. Shared by both whole-part
 * dialects (the non-Hebrew one below, and the dedicated Hebrew one) since
 * both align against the same existing Hebrew ground truth.
 */
const buildWholePartGroundEntries = (
  partId: string,
  targetChapters: TocChapter[],
): OrderAlignedTargetChapter[] =>
  targetChapters
    .map((chapter): OrderAlignedTargetChapter | undefined => {
      const dir = chapterDirFor(partId, chapter.id.split("/")[1] as string);
      const heSegments = readHeSourceSegmentsOptional(dir);
      return heSegments?.[0]?.sefariaRef
        ? {
            number: chapter.number,
            sefariaRef: heSegments[0].sefariaRef,
            // Carried so `validateTranslationPlausibility` can tell a
            // translation from a page-number table of contents (issue #81).
            heTextLength: heSegments[0].html
              .replace(/<[^>]*>/g, "")
              .replace(/\s+/g, " ")
              .trim().length,
          }
        : undefined;
    })
    .filter((entry): entry is OrderAlignedTargetChapter => Boolean(entry));

const processWholePartDialect = async (
  partId: string,
  candidateUids: string[],
  targetChapters: TocChapter[],
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
): Promise<void> => {
  if (targetChapters.length === 0 || candidateUids.length === 0) return;

  const groundEntries = buildWholePartGroundEntries(partId, targetChapters);
  const groundSegments = buildOrderAlignedGroundSegments(groundEntries);
  const emptyGroundTruth = buildKmChapterGroundTruth([]);
  const targetChapterIds = targetChapters.map((c) => c.id);
  const chapterById = new Map(targetChapters.map((c) => [c.id, c]));

  const docFilesByLanguage = await collectKmDocFilesByLanguage(
    client,
    candidateUids,
  );
  recordMissingLanguages(
    languages,
    KM_EXPECTED_NON_HE_LANGUAGES,
    docFilesByLanguage.keys(),
    targetChapterIds,
  );

  for (const [lang, candidates] of docFilesByLanguage) {
    const acc = getAcc(languages, lang);
    const resolution = await resolveKmDocumentCandidate(
      candidates,
      async (candidate) => {
        console.log(
          `Fetching ${partId} whole-part doc (${lang}, KabbalahMedia file ${candidate.file.id})...`,
        );
        return parseDocBlocks(
          await client.getText(
            `${KM_BASE}/assets/api/doc2html/${candidate.file.id}`,
          ),
        );
      },
      (blocks) => {
        // Three dialects, tried in order (issue #81). The styled one keys on
        // numbered `h5`; the flat one exists because some conversions lost
        // every heading style; the unnumbered one carries seifim as `h5` with
        // no numeral at all. The heading level was never the structure.
        //
        // A document may also cover only PART of a part and say so —
        // part 16's front matter reads `Items 42-85`. When it does, the parse
        // is aligned against exactly those chapters, and the range's size is a
        // second, independent statement of the item count that must agree with
        // the first.
        //
        // Whichever dialect produces items, the SAME checks below decide
        // whether they are believed. That is what makes it safe to try a
        // further reading rather than refusing outright.
        const declaredRange = parseDeclaredItemRange(blocks);
        const scopedGround = declaredRange
          ? groundEntries.filter(
              (entry) =>
                entry.number >= declaredRange.from &&
                entry.number <= declaredRange.to,
            )
          : groundEntries;

        if (declaredRange && scopedGround.length === 0) {
          return {
            ok: false,
            kind: "unmatched",
            reason: `document declares items ${declaredRange.from}-${declaredRange.to}, which match no chapter of this part`,
          };
        }

        const items = hasNumberedKmItems(blocks)
          ? groupKmChapterBlocks(blocks).items
          : hasFlatNumberedItems(blocks)
            ? groupKmFlatWholePartBlocks(blocks)
            : hasUnnumberedKmItems(blocks)
              ? groupKmUnnumberedWholePartBlocks(
                  blocks,
                  declaredRange?.from ?? 1,
                )
              : undefined;

        if (!items) {
          return {
            ok: false,
            kind: "structure-unsupported",
            reason: "no source items — numbered, flat or unnumbered",
          };
        }
        const alignmentError =
          validateNumberedOrderAlignment(items, scopedGround) ??
          validateTranslationPlausibility(items, scopedGround);
        return alignmentError
          ? {
              ok: false,
              kind: "unmatched",
              reason: declaredRange
                ? `${alignmentError} (document declares items ${declaredRange.from}-${declaredRange.to})`
                : alignmentError,
            }
          : { ok: true, value: items };
      },
    );
    for (const rejection of resolution.rejections) {
      acc.warnings.push(
        `${partId} whole-part candidate ${rejection.candidate.uid}/${rejection.candidate.file.id}: ${rejection.reason}`,
      );
    }
    if (!resolution.selected || !resolution.value) {
      for (const chapterId of targetChapterIds) {
        acc.chapters.push({
          chapterId,
          status: resolution.failureKind ?? "structure-unsupported",
          ...zeroCounts,
        });
      }
      continue;
    }
    if (resolution.rejections.length > 0) {
      acc.warnings.push(
        `${partId} whole-part: selected fallback ${resolution.selected.uid}/${resolution.selected.file.id}`,
      );
    }
    const items = resolution.value;
    const { segments, warnings } = buildKmSourceSegments(
      items,
      groundSegments,
      emptyGroundTruth,
    );
    acc.warnings.push(
      ...warnings.map((w) => `${partId} whole-part source: ${w.message}`),
    );
    const bySplit = splitOrderAlignedSegments(segments);

    for (const chapter of chapterById.values()) {
      const segment = bySplit.get(chapter.number);
      if (!segment) {
        acc.chapters.push({
          chapterId: chapter.id,
          status: "unmatched",
          ...zeroCounts,
        });
        continue;
      }
      acc.chapters.push({
        chapterId: chapter.id,
        status: "imported",
        ...zeroCounts,
        sourceSegments: 1,
      });
      acc.sourceByChapter.set(chapter.id, {
        sefariaRef: segment.sefariaRef,
        segments: [segment],
      });
    }
  }
};

// ---------------------------------------------------------------------------
// Dialect 2b: whole-part Hebrew doc (Parts 1-5 — verified against the live
// API; Parts 6-16 have no Hebrew docx at all).
// ---------------------------------------------------------------------------

const HE_KM_LANGUAGE = "he";

/**
 * Hebrew's KabbalahMedia distribution is different from every other
 * language this importer handles: it is never attached to a per-chapter
 * content unit, only to a part's own PART-node `_full.docx`. Unlike
 * dialect 2 above, this doesn't depend on whether the part also has
 * per-chapter "Chapter N" leaves — Parts 1-4 have those leaves, but their
 * Hebrew docx still lives only on the PART node — so this always runs for
 * a part's "chapter"-kind chapters, checking the PART node directly rather
 * than trying the leaf/whole-part-leaf candidates dialect 2 prefers.
 * Absence (no PART node, no Hebrew file on it, or a 404) is recorded just
 * like every other checked-and-absent language, never silently skipped.
 * Written as the additive `he-bb` version, alongside — never replacing —
 * the existing Sefaria-sourced `he-jerusalem-1956` ground truth these same
 * chapters already have on disk.
 *
 * This document has no heading tags at all — its own dedicated dialect
 * (`km-he-whole-part-parser.ts`) reads chapter/seif/commentary structure,
 * anchors, and their Ohr Pnimi links entirely out of the docx's own text
 * conventions (chapter-heading paragraphs, a per-chapter topic list, "אור
 * פנימי" section headings, and inline single-Hebrew-letter anchor markers
 * — see that module's own doc comment for the full, API-verified shape
 * and its page-break-interleaving quirk). It deliberately never reads a
 * chapter's existing `he-jerusalem-1956` ground truth and never stamps a
 * `sefariaRef` on anything it writes — this dialect's output must be
 * identical whether or not Sefaria-imported content exists on disk at
 * all. Verified end-to-end for Part 1; a part/chapter whose structure
 * doesn't resolve cleanly (chapter-heading count, topic-list count or
 * order, or an anchor with no matching Ohr Pnimi entry) is reported
 * `unmatched`/`structure-unsupported` rather than force-parsed — see the
 * module doc for exactly which parts that currently affects.
 */
const processHebrewWholePartDialect = async (
  partId: string,
  partUid: string,
  targetChapters: TocChapter[],
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
): Promise<void> => {
  if (targetChapters.length === 0) return;

  const acc = getAcc(languages, HE_KM_LANGUAGE);
  const targetChapterIds = targetChapters.map((c) => c.id);
  const recordAbsent = (status: KmChapterOutcome["status"]): void => {
    for (const chapterId of targetChapterIds) {
      acc.chapters.push({ chapterId, status, ...zeroCounts });
    }
  };

  let unit: KmContentUnit;
  try {
    unit = await client.getJson<KmContentUnit>(
      `${KM_BASE}/backend/content_units/${partUid}`,
    );
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      recordAbsent("no-file-for-language");
      return;
    }
    throw error;
  }

  const heFile = (unit.files ?? []).find(
    (file) =>
      file.mimetype === DOCX_MIMETYPE && file.language === HE_KM_LANGUAGE,
  );
  if (!heFile) {
    recordAbsent("no-file-for-language");
    return;
  }

  console.log(
    `Fetching ${partId} Hebrew whole-part doc (KabbalahMedia file ${heFile.id})...`,
  );
  const blocks = parseHeDocBlocks(
    await client.getText(`${KM_BASE}/assets/api/doc2html/${heFile.id}`),
  );

  const sortedChapters = [...targetChapters].sort(
    (a, b) => a.number - b.number,
  );
  const headingIndices: number[] = [];
  for (
    let i = 0;
    i < blocks.length && headingIndices.length < sortedChapters.length;
    i += 1
  ) {
    const block = blocks[i] as (typeof blocks)[number];
    if (block.tag !== "p") continue;
    const number = matchHeChapterHeading(block.text);
    if (number === undefined) continue;
    const expectedNumber = (sortedChapters[headingIndices.length] as TocChapter)
      .number;
    if (number !== expectedNumber) continue;
    headingIndices.push(i);
  }

  if (headingIndices.length !== sortedChapters.length) {
    acc.warnings.push(
      `${partId} Hebrew whole-part: found ${headingIndices.length} chapter heading(s), expected ${sortedChapters.length}`,
    );
    recordAbsent("structure-unsupported");
    return;
  }

  for (let index = 0; index < sortedChapters.length; index += 1) {
    const chapter = sortedChapters[index] as TocChapter;

    const startIndex = (headingIndices[index] as number) + 1;
    const parsed = parseHeChapterBody(blocks, startIndex);
    if (!parsed.ok) {
      acc.warnings.push(`${chapter.id} Hebrew whole-part: ${parsed.reason}`);
      acc.chapters.push({
        chapterId: chapter.id,
        status: "unmatched",
        ...zeroCounts,
      });
      continue;
    }

    const { segments, items, warnings } = buildHeChapterContent(parsed);
    acc.warnings.push(
      ...warnings.map((w) => `${chapter.id} Hebrew whole-part: ${w}`),
    );

    if (segments.length === 0 && items.length === 0) {
      acc.chapters.push({
        chapterId: chapter.id,
        status: "unmatched",
        ...zeroCounts,
      });
      continue;
    }

    acc.chapters.push({
      chapterId: chapter.id,
      status: "imported",
      sourceSegments: segments.length,
      commentaryItems: items.length,
      sourceItemsSkipped: 0,
      commentaryParagraphsSkipped: 0,
      unmatchedNumerals: 0,
    });

    if (segments.length > 0) {
      acc.sourceByChapter.set(chapter.id, { segments });
    }
    if (items.length > 0) {
      acc.commentaryByChapter.set(chapter.id, { items });
    }
  }
};

// ---------------------------------------------------------------------------
// Dialect 3: combined Q&A table doc (questions-* single chapter, answers-* N chapters)
// ---------------------------------------------------------------------------

const processQaDialect = async (
  partId: string,
  candidateUids: string[],
  questionsChapter: TocChapter | undefined,
  answersChapters: TocChapter[],
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
): Promise<void> => {
  // Post-#91 there is exactly one answers chapter per kind. More than one
  // means the tree predates the consolidation this importer now writes, and
  // aligning against it would produce a shape nothing else in the corpus
  // has — report rather than guess.
  if (answersChapters.length > 1) {
    for (const acc of languages.values()) {
      acc.warnings.push(
        `${partId} Q&A: ${answersChapters.length} answers chapters of one kind — expected the single consolidated chapter (#91); skipped`,
      );
    }
    return;
  }
  const answersChapter = answersChapters[0];

  const targetChapterIds = [
    ...(questionsChapter ? [questionsChapter.id] : []),
    ...(answersChapter ? [answersChapter.id] : []),
  ];
  if (targetChapterIds.length === 0 || candidateUids.length === 0) return;

  const questionsHeItems = questionsChapter
    ? readHeSourceSegmentsOptional(
        chapterDirFor(partId, questionsChapter.id.split("/")[1] as string),
      )
    : undefined;
  const questionsSefariaRef = questionsChapter
    ? heSefariaRef(
        chapterDirFor(partId, questionsChapter.id.split("/")[1] as string),
        "source.he-jerusalem-1956.json",
      )
    : undefined;

  const answersDir = answersChapter
    ? chapterDirFor(partId, answersChapter.id.split("/")[1] as string)
    : undefined;
  const answersGroundSegments = answersDir
    ? firstSegmentPerAnswer(readHeSourceSegmentsOptional(answersDir) ?? [])
    : [];
  const answersSefariaRef = answersDir
    ? heSefariaRef(answersDir, "source.he-jerusalem-1956.json")
    : undefined;
  const emptyGroundTruth = buildKmChapterGroundTruth([]);

  const docFilesByLanguage = await collectKmDocFilesByLanguage(
    client,
    candidateUids,
  );
  recordMissingLanguages(
    languages,
    KM_EXPECTED_NON_HE_LANGUAGES,
    docFilesByLanguage.keys(),
    targetChapterIds,
  );

  for (const [lang, candidates] of docFilesByLanguage) {
    const acc = getAcc(languages, lang);
    const resolution = await resolveKmDocumentCandidate(
      candidates,
      async (candidate) => {
        console.log(
          `Fetching ${partId} Q&A doc (${lang}, KabbalahMedia file ${candidate.file.id})...`,
        );
        return parseDocBlocks(
          await client.getText(
            `${KM_BASE}/assets/api/doc2html/${candidate.file.id}`,
          ),
        );
      },
      (blocks) => {
        if (!isSupportedKmQaStructure(blocks)) {
          return {
            ok: false,
            kind: "structure-unsupported",
            reason: "no h6 question blocks",
          };
        }
        const pairs = parseKmQaPairs(blocks);
        const alignmentError = validateKmQaPairs(
          pairs,
          questionsHeItems?.length ?? 0,
          answersGroundSegments.length,
        );
        return alignmentError
          ? { ok: false, kind: "unmatched", reason: alignmentError }
          : { ok: true, value: pairs };
      },
    );
    for (const rejection of resolution.rejections) {
      acc.warnings.push(
        `${partId} Q&A candidate ${rejection.candidate.uid}/${rejection.candidate.file.id}: ${rejection.reason}`,
      );
    }
    if (!resolution.selected || !resolution.value) {
      for (const chapterId of targetChapterIds) {
        acc.chapters.push({
          chapterId,
          status: resolution.failureKind ?? "structure-unsupported",
          ...zeroCounts,
        });
      }
      continue;
    }
    if (resolution.rejections.length > 0) {
      acc.warnings.push(
        `${partId} Q&A: selected fallback ${resolution.selected.uid}/${resolution.selected.file.id}`,
      );
    }
    const pairs = resolution.value;

    // Questions half: one chapter, all matched items.
    if (questionsChapter) {
      if (!questionsHeItems) {
        acc.chapters.push({
          chapterId: questionsChapter.id,
          status: "unmatched",
          ...zeroCounts,
        });
      } else {
        const { segments, warnings } = buildKmSourceSegments(
          pairs.map((p) => ({ n: p.position, html: p.questionHtml })),
          questionsHeItems,
          emptyGroundTruth,
        );
        acc.warnings.push(
          ...warnings.map(
            (w) => `${questionsChapter.id} questions: ${w.message}`,
          ),
        );
        if (segments.length > 0) {
          acc.chapters.push({
            chapterId: questionsChapter.id,
            status: "imported",
            ...zeroCounts,
            sourceSegments: segments.length,
          });
          acc.sourceByChapter.set(questionsChapter.id, {
            sefariaRef: questionsSefariaRef,
            segments,
          });
        } else {
          acc.chapters.push({
            chapterId: questionsChapter.id,
            status: "unmatched",
            ...zeroCounts,
          });
        }
      }
    }

    // Answers half: one consolidated chapter (#91), one item per answer —
    // the same shape, and the same call, as the questions half above.
    if (answersChapter) {
      const { segments, warnings } = buildKmSourceSegments(
        pairs.map((p) => ({ n: p.position, html: p.answerHtml })),
        answersGroundSegments,
        emptyGroundTruth,
      );
      acc.warnings.push(
        ...warnings.map((w) => `${answersChapter.id} answers: ${w.message}`),
      );
      if (segments.length > 0) {
        acc.chapters.push({
          chapterId: answersChapter.id,
          status: "imported",
          ...zeroCounts,
          sourceSegments: segments.length,
        });
        acc.sourceByChapter.set(answersChapter.id, {
          sefariaRef: answersSefariaRef,
          segments,
        });
      } else {
        acc.chapters.push({
          chapterId: answersChapter.id,
          status: "unmatched",
          ...zeroCounts,
        });
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Per-part orchestration
// ---------------------------------------------------------------------------

const chaptersOfKind = (
  tocChapters: TocChapter[],
  kind: ChapterKind,
): TocChapter[] =>
  tocChapters
    .filter((c) => c.kind === kind)
    .sort((a, b) => a.number - b.number);

const processPart = async (
  partNumber: number,
  treePart: KmTreePart | undefined,
  tocPartChapters: TocChapter[],
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
  chapterLevelWarnings: string[],
): Promise<void> => {
  const partId = `part-${String(partNumber).padStart(2, "0")}`;

  if (!treePart) {
    chapterLevelWarnings.push(
      `${partId}: no KabbalahMedia PART node found for "Part ${partNumber}" — skipped entirely`,
    );
    return;
  }

  const articlesByRole = new Map<string, KmTreeArticle[]>();
  const unmapped: KmTreeArticle[] = [];
  for (const article of treePart.articles) {
    const role = classifyKmArticle(article.name, treePart.name);
    if (role === "unmapped") {
      unmapped.push(article);
      continue;
    }
    const list = articlesByRole.get(role) ?? [];
    list.push(article);
    articlesByRole.set(role, list);
  }
  for (const article of unmapped) {
    chapterLevelWarnings.push(
      `${partId}: KabbalahMedia leaf "${article.name}" (${article.id}) has no known ChapterKind mapping — skipped`,
    );
  }

  const innerObservationChapters = chaptersOfKind(
    tocPartChapters,
    "inner-observation",
  );
  for (const article of articlesByRole.get("cause-and-consequence-essay") ??
    []) {
    chapterLevelWarnings.push(
      `${partId}: KabbalahMedia leaf "${article.name}" (${article.id}) is the Cause and Consequence essay — already in the corpus as inner-observation-02 from Sefaria; not imported here`,
    );
  }

  for (const article of articlesByRole.get("inner-observation") ?? []) {
    await recordUnsupportedDialect(
      article.id,
      innerObservationChapters.map((chapter) => chapter.id),
      languages,
      client,
    );
  }

  // Dialect 1: per-chapter leaves ("Chapter N").
  const chapterLeaves = (articlesByRole.get("chapter") ?? []).filter(
    (a) => parseKmChapterLeafNumber(a.name) !== undefined,
  );
  const chapterKindChapters = chaptersOfKind(tocPartChapters, "chapter");
  const chapterKindByNumber = new Map(
    chapterKindChapters.map((c) => [c.number, c]),
  );
  for (const leaf of chapterLeaves) {
    const number = parseKmChapterLeafNumber(leaf.name) as number;
    const chapter = chapterKindByNumber.get(number);
    if (!chapter) {
      chapterLevelWarnings.push(
        `${partId}: KabbalahMedia leaf "Chapter ${number}" (${leaf.id}) has no matching toc.json chapter — skipped`,
      );
      continue;
    }
    await processLeafChapterDialect(
      chapter.id,
      leaf.id,
      languages,
      client,
      chapterLevelWarnings,
    );
  }

  // Dialect 2b: whole-part Hebrew doc — always checked against the PART
  // node itself, regardless of whether this part has per-chapter leaves
  // (Parts 1-4 do; their Hebrew docx still lives only on the PART node).
  await processHebrewWholePartDialect(
    partId,
    treePart.id,
    chapterKindChapters,
    languages,
    client,
  );

  // Dialect 2: whole-part doc — only when this part has no per-chapter leaves at all.
  // A "whole-part" leaf (named identically to the part) is tried before the
  // PART node's own files: verified against the live API, a part can have
  // *two different translation editions* of the same whole-part doc — one
  // attached to each place — and they are not guaranteed to share a doc
  // shape (e.g. Part 5: the PART node's own file has no numbered items at
  // all, while its "Part 5" leaf does). The leaf is the one this importer's
  // shape was verified against.
  if (chapterLeaves.length === 0 && chapterKindChapters.length > 0) {
    const wholePartCandidates = [
      ...(articlesByRole.get("whole-part") ?? []).map((a) => a.id),
      treePart.id,
    ];
    await processWholePartDialect(
      partId,
      wholePartCandidates,
      chapterKindChapters,
      languages,
      client,
    );
  }

  // Dialect 3: combined Q&A tables (terminology, topics).
  const qaFamilies: {
    questionsRole: KmLeafRole;
    answersRole: KmLeafRole;
    questionsKind: ChapterKind;
    answersKind: ChapterKind;
  }[] = [
    {
      questionsRole: "questions-terminology",
      answersRole: "answers-terminology",
      questionsKind: "questions-terminology",
      answersKind: "answers-terminology",
    },
    {
      questionsRole: "questions-topics",
      answersRole: "answers-topics",
      questionsKind: "questions-topics",
      answersKind: "answers-topics",
    },
    // Section VI only — the one part with a Cause-and-Effect table
    // (issue #86). Every other part simply has no article under these
    // roles, so the family costs nothing there.
    {
      questionsRole: "questions-cause-effect",
      answersRole: "answers-cause-effect",
      questionsKind: "questions-cause-effect",
      answersKind: "answers-cause-effect",
    },
  ];

  for (const family of qaFamilies) {
    const questionsChapter = chaptersOfKind(
      tocPartChapters,
      family.questionsKind,
    )[0];
    const answersChapters = chaptersOfKind(tocPartChapters, family.answersKind);
    const candidates = [
      ...(articlesByRole.get(family.questionsRole) ?? []).map((a) => a.id),
      ...(articlesByRole.get(family.answersRole) ?? []).map((a) => a.id),
    ];
    await processQaDialect(
      partId,
      candidates,
      questionsChapter,
      answersChapters,
      languages,
      client,
    );
  }
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export const main = async (argv: string[]): Promise<void> => {
  const args = parseKmArgs(argv);

  const toc: Toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions: ContentVersion[] = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );
  const versionsById = new Map(versions.map((v) => [v.id, v]));

  const tocPartsById = new Map<string, TocChapter[]>();
  for (const volume of toc.volumes) {
    for (const part of volume.parts) tocPartsById.set(part.id, part.chapters);
  }

  const client = createHttpClient({ cacheDir });
  const languages = new Map<string, LanguageAccumulator>();
  const chapterLevelWarnings: string[] = [];

  console.log("Fetching KabbalahMedia tree...");
  const sqdata = await client.getJson<KmSqData>(
    `${KM_BASE}/backend/sqdata?uid=${KM_TES_COLLECTION_UID}`,
  );
  const tree = extractKmTesTree(sqdata);
  const treePartsByNumber = indexKmTreePartsByNumber(tree);

  for (const partNumber of args.parts) {
    const partId = `part-${String(partNumber).padStart(2, "0")}`;
    const tocPartChapters = tocPartsById.get(partId);
    if (!tocPartChapters) {
      chapterLevelWarnings.push(
        `${partId}: no matching part in toc.json — skipped`,
      );
      continue;
    }
    await processPart(
      partNumber,
      treePartsByNumber.get(partNumber),
      tocPartChapters,
      languages,
      client,
      chapterLevelWarnings,
    );
    reconcilePartOutcomes(partId, tocPartChapters, languages);
  }

  // --- Write content files, update versions.json/toc.json -------------------
  const tocChapterIndex = new Map<string, TocChapter>();
  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters)
        tocChapterIndex.set(chapter.id, chapter);
    }
  }

  const scopedPartIds = new Set(
    args.parts.map(
      (partNumber) => `part-${String(partNumber).padStart(2, "0")}`,
    ),
  );
  const accumulatorsByVersion = new Map(
    [...languages.values()].map((acc) => [acc.versionId, acc]),
  );
  const kmVersionIds = versions
    .filter((version) => version.source === "kabbalahmedia")
    .map((version) => version.id);
  let staleOutputs = 0;
  let keptDespiteRefusal = 0;

  /**
   * Chapters this run looked at and declined to write, per version.
   *
   * "This run produced no file" has two very different causes: upstream no
   * longer offers the chapter, or the importer refused it — an alignment it
   * could not verify, a document dialect it does not parse, a language whose
   * file was missing this time. Only the first is stale. Treating both the
   * same deleted committed English whenever a refusal happened, so a run
   * meant to *add* a translation silently subtracted four of them (#111).
   *
   * The importer records an outcome for every chapter it considered, so a
   * non-`imported` outcome is exactly the evidence that its absence is a
   * refusal rather than an absence upstream.
   */
  const refusedByVersion = new Map<string, Set<string>>();
  for (const acc of languages.values()) {
    refusedByVersion.set(
      acc.versionId,
      new Set(
        acc.chapters
          .filter((outcome) => outcome.status !== "imported")
          .map((outcome) => outcome.chapterId),
      ),
    );
  }

  for (const chapter of tocChapterIndex.values()) {
    const [partId, slug] = chapter.id.split("/") as [string, string];
    if (!scopedPartIds.has(partId)) continue;
    const dir = chapterDirFor(partId, slug);

    for (const versionId of kmVersionIds) {
      const acc = accumulatorsByVersion.get(versionId);
      const layers = [
        {
          layer: "source" as const,
          desired: acc?.sourceByChapter.has(chapter.id) ?? false,
        },
        {
          layer: "commentary" as const,
          desired: acc?.commentaryByChapter.has(chapter.id) ?? false,
        },
      ];

      for (const { layer, desired } of layers) {
        const path = join(dir, `${layer}.${versionId}.json`);
        if (desired || !existsSync(path)) continue;

        if (refusedByVersion.get(versionId)?.has(chapter.id)) {
          keptDespiteRefusal += 1;
          console.warn(
            `Kept ${path}: this run declined to write it, which is not evidence it is gone upstream.`,
          );
          continue;
        }

        staleOutputs += 1;
        if (args.dryRun) {
          console.log(`Would remove stale KabbalahMedia output: ${path}`);
          continue;
        }
        unlinkSync(path);
        removeKmVersionAvailability(chapter, layer, versionId);
      }
    }
  }
  if (keptDespiteRefusal > 0) {
    console.warn(
      `\nKept ${keptDespiteRefusal} committed KabbalahMedia file(s) this run could not reproduce.`,
    );
  }
  if (staleOutputs > 0) {
    console.log(
      `\n${args.dryRun ? "Found" : "Removed"} ${staleOutputs} stale KabbalahMedia output file(s) in the selected scope.`,
    );
  }

  let versionsChanged = false;
  if (args.parts.length === KM_TOTAL_PARTS) {
    const desiredVersionIds = new Set(
      [...languages.values()]
        .filter(
          (acc) =>
            acc.sourceByChapter.size > 0 || acc.commentaryByChapter.size > 0,
        )
        .map((acc) => acc.versionId),
    );
    const staleVersions = versions.filter(
      (version) =>
        version.source === "kabbalahmedia" &&
        !desiredVersionIds.has(version.id),
    );
    for (const version of staleVersions) {
      if (args.dryRun) {
        console.log(
          `Would remove empty KabbalahMedia version registry entry: ${version.id}`,
        );
        continue;
      }
      const index = versions.findIndex(
        (candidate) => candidate.id === version.id,
      );
      if (index !== -1) versions.splice(index, 1);
      versionsById.delete(version.id);
      versionsChanged = true;
    }
  }

  for (const acc of languages.values()) {
    const hasContent =
      acc.sourceByChapter.size > 0 || acc.commentaryByChapter.size > 0;
    if (!hasContent) continue;

    if (!versionsById.has(acc.versionId)) {
      const version: ContentVersion = {
        id: acc.versionId,
        language: bcp47ForKmLanguage(acc.kmLanguage),
        direction: kmVersionDirection(acc.kmLanguage),
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
    writeTocSplitFiles(contentDir, toc, versions);
  }

  // --- Coverage report --------------------------------------------------------
  const languageOutcomes: KmLanguageOutcome[] = [...languages.values()]
    .sort((a, b) => a.versionId.localeCompare(b.versionId))
    .map((acc) => ({
      versionId: acc.versionId,
      kmLanguage: acc.kmLanguage,
      title: acc.title,
      chapters: acc.chapters,
      warnings: acc.warnings,
    }));
  const coverageSection = buildKmCoverageSection(languageOutcomes);
  console.log(`\n${KM_COVERAGE_HEADING}\n\n${coverageSection}`);
  for (const warning of chapterLevelWarnings) console.warn(`! ${warning}`);

  if (!args.dryRun) {
    if (args.parts.length === KM_TOTAL_PARTS) {
      const coveragePath = join(contentDir, "COVERAGE.md");
      const existing = existsSync(coveragePath)
        ? readFileSync(coveragePath, "utf-8")
        : "# Import coverage\n";
      writeFileSync(
        coveragePath,
        mergeMarkdownSection(existing, KM_COVERAGE_HEADING, coverageSection),
        "utf-8",
      );
    } else {
      console.log(
        "\nScoped import: content/COVERAGE.md is unchanged; run --all to regenerate its full-corpus KabbalahMedia section.",
      );
    }

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
