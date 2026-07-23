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
import { buildKmChapterGroundTruth } from "./lib/km-ground-truth.ts";
import {
  bcp47ForKmLanguage,
  KM_EXPECTED_LANGUAGES,
  kmVersionId,
  kmVersionTitle,
  missingKmLanguages,
} from "./lib/km-language.ts";
import {
  buildOrderAlignedGroundSegments,
  splitOrderAlignedSegments,
  validateNumberedOrderAlignment,
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
  type KmSqData,
  type KmTreeArticle,
  type KmTreePart,
} from "./lib/km-tree.ts";
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

const recordMissingLanguages = (
  languages: Map<string, LanguageAccumulator>,
  presentLanguages: Iterable<string>,
  targetChapterIds: string[],
): void => {
  for (const missing of missingKmLanguages(KM_EXPECTED_LANGUAGES, [
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

  recordMissingLanguages(languages, presentLanguages, targetChapterIds);
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

const processWholePartDialect = async (
  partId: string,
  candidateUids: string[],
  targetChapters: TocChapter[],
  languages: Map<string, LanguageAccumulator>,
  client: HttpClient,
): Promise<void> => {
  if (targetChapters.length === 0 || candidateUids.length === 0) return;

  const groundEntries = targetChapters
    .map((chapter) => {
      const dir = chapterDirFor(partId, chapter.id.split("/")[1] as string);
      const heSegments = readHeSourceSegmentsOptional(dir);
      return heSegments?.[0]
        ? { number: chapter.number, sefariaRef: heSegments[0].sefariaRef }
        : undefined;
    })
    .filter((entry): entry is { number: number; sefariaRef: string } =>
      Boolean(entry),
    );
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
        if (!hasNumberedKmItems(blocks)) {
          return {
            ok: false,
            kind: "structure-unsupported",
            reason: "no numbered h5 source items",
          };
        }
        const { items } = groupKmChapterBlocks(blocks);
        const alignmentError = validateNumberedOrderAlignment(
          items,
          groundEntries,
        );
        return alignmentError
          ? {
              ok: false,
              kind: "unmatched",
              reason: alignmentError,
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
  const targetChapterIds = [
    ...(questionsChapter ? [questionsChapter.id] : []),
    ...answersChapters.map((c) => c.id),
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

  const answersGroundEntries = answersChapters
    .map((chapter) => {
      const dir = chapterDirFor(partId, chapter.id.split("/")[1] as string);
      const heSegments = readHeSourceSegmentsOptional(dir);
      return heSegments?.[0]
        ? { number: chapter.number, sefariaRef: heSegments[0].sefariaRef }
        : undefined;
    })
    .filter((entry): entry is { number: number; sefariaRef: string } =>
      Boolean(entry),
    );
  const answersGroundSegments =
    buildOrderAlignedGroundSegments(answersGroundEntries);
  const answersChapterByNumber = new Map(
    answersChapters.map((c) => [c.number, c]),
  );
  const emptyGroundTruth = buildKmChapterGroundTruth([]);

  const docFilesByLanguage = await collectKmDocFilesByLanguage(
    client,
    candidateUids,
  );
  recordMissingLanguages(
    languages,
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
          answersGroundEntries.length,
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

    // Answers half: N single-item chapters, split positionally.
    const { segments: answerSegments, warnings: answerWarnings } =
      buildKmSourceSegments(
        pairs.map((p) => ({ n: p.position, html: p.answerHtml })),
        answersGroundSegments,
        emptyGroundTruth,
      );
    acc.warnings.push(
      ...answerWarnings.map((w) => `${partId} answers: ${w.message}`),
    );
    const answersBySplit = splitOrderAlignedSegments(answerSegments);
    for (const chapter of answersChapterByNumber.values()) {
      const segment = answersBySplit.get(chapter.number);
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
    questionsRole: "questions-terminology" | "questions-topics";
    answersRole: "answers-terminology" | "answers-topics";
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
