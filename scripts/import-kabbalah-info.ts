/**
 * kabbalah.info importer — Bnei Baruch's own web edition of _The Study of
 * the Ten Sefirot_ (`https://www.kabbalah.info/en/<slug>/`), imported as
 * the `en-bb-kabbalah-info` version.
 *
 * `pnpm import:kabbalah-info (--part <N> | --all) [--dry-run]`
 *
 * It is the same official English as KabbalahMedia's documents (`en-bb`),
 * and it fills what those documents do not: the Ohr Pnimi of every part
 * the site publishes, the source of part 4's chapters and part 8. So it
 * writes a chapter's layer only where `en-bb` has none — the two never
 * compete for one layer, and `readerVersions.ts` ranks it directly below
 * `en-bb`, above every non-Bnei-Baruch English.
 *
 * Dialects (see each module):
 * - per-chapter pages, parts 1-4 — `ki-chapter-page.ts`, aligned to the
 *   chapter's Hebrew seif by seif and note by note;
 * - whole-part pages, parts 5-8 and 16 — `ki-whole-part.ts` +
 *   `ki-whole-part-align.ts`, source by seif number, Ohr Pnimi by
 *   structure and by similarity to `en-ai`.
 * Inner Observation and the Q&A tables are reported, not imported.
 *
 * Every refusal is reported and leaves the chapter on whatever it has now;
 * nothing is written unless the whole layer of the chapter is verified.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CommentaryItem,
  ContentVersion,
  LayerKind,
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
import {
  alignKiChapterPage,
  dropLeakedHeadings,
} from "./lib/ki-chapter-page.ts";
import {
  alignObservation,
  alignObservationByRuns,
  parseKiObservationUnits,
  type ObservationTarget,
} from "./lib/ki-inner-observation.ts";
import {
  classifyKiPage,
  parseKiBlocks,
  parseKiToc,
  type KiPageKind,
  type KiPageRef,
} from "./lib/ki-page.ts";
import {
  alignQaEntries,
  parseKiQaTable,
  qaTargets,
  questionsWithoutEcho,
} from "./lib/ki-qa.ts";
import {
  alignWholePartCommentary,
  alignWholePartSource,
  type ChapterVerdict,
} from "./lib/ki-whole-part-align.ts";
import {
  parseKiWholePart,
  truncateAtRepeatedText,
} from "./lib/ki-whole-part.ts";
import { KM_TOTAL_PARTS, parseKmArgs } from "./lib/km-cli.ts";
import { mergeMarkdownSection } from "./lib/km-coverage.ts";
import { removeKmVersionAvailability } from "./lib/km-reconcile.ts";
import { writeTocSplitFiles } from "./lib/toc-splits.ts";
import { validateContent } from "./validate-content.ts";

export const KI_VERSION_ID = "en-bb-kabbalah-info";
const KI_ENTRY_URL = "https://www.kabbalah.info/en/part-1-chapter-one-tes/";
/** The version whose layer, where present, this importer never duplicates. */
const OUTRANKING_VERSION_ID = "en-bb";
export const KI_COVERAGE_HEADING =
  "## kabbalah.info import (`en-bb-kabbalah-info`)";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");
const cacheDir = join(repoRoot, ".superpowers/import-cache");

const chapterDirFor = (chapterId: string): string => {
  const [partId, slug] = chapterId.split("/") as [string, string];
  return join(contentDir, "parts", partId, "chapters", slug);
};

const partIdFor = (part: number): string =>
  `part-${String(part).padStart(2, "0")}`;

const chapterIdFor = (part: number, chapter: number): string =>
  `${partIdFor(part)}/chapter-${String(chapter).padStart(2, "0")}`;

const writeJsonFile = (path: string, data: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

const readLayer = <T extends "source" | "commentary">(
  chapterId: string,
  layer: T,
  versionId: string,
): (T extends "source" ? SourceSegment : CommentaryItem)[] | null => {
  const path = join(chapterDirFor(chapterId), `${layer}.${versionId}.json`);
  if (!existsSync(path)) return null;
  const raw: unknown = JSON.parse(readFileSync(path, "utf-8"));
  const parsed =
    layer === "source"
      ? sourceLayerFileSchema.parse(raw)
      : commentaryLayerFileSchema.parse(raw);
  return parsed.items as (T extends "source"
    ? SourceSegment
    : CommentaryItem)[];
};

const layerRef = (chapterId: string, layer: LayerKind): string | undefined => {
  const path = join(
    chapterDirFor(chapterId),
    `${layer}.he-jerusalem-1956.json`,
  );
  if (!existsSync(path)) return undefined;
  return (JSON.parse(readFileSync(path, "utf-8")) as { sefariaRef?: string })
    .sefariaRef;
};

type Outcome = {
  chapterId: string;
  layer: "source" | "commentary";
  status: "imported" | "refused" | "outranked";
  reason?: string;
};

interface Planned {
  source: Map<string, SourceSegment[]>;
  commentary: Map<string, CommentaryItem[]>;
  outcomes: Outcome[];
  notes: string[];
}

/**
 * Records one chapter layer's verdict, unless `en-bb` already covers that
 * layer — then it is noted as outranked and nothing is planned.
 */
const plan = <T extends SourceSegment | CommentaryItem>(
  planned: Planned,
  chapterId: string,
  layer: "source" | "commentary",
  verdict: ChapterVerdict<T>,
): void => {
  if (readLayer(chapterId, layer, OUTRANKING_VERSION_ID) !== null) {
    planned.outcomes.push({ chapterId, layer, status: "outranked" });
    return;
  }
  if (verdict.status === "refused") {
    planned.outcomes.push({
      chapterId,
      layer,
      status: "refused",
      reason: verdict.reason,
    });
    return;
  }
  planned.outcomes.push({ chapterId, layer, status: "imported" });
  if (layer === "source") {
    planned.source.set(chapterId, verdict.items as SourceSegment[]);
  } else {
    planned.commentary.set(chapterId, verdict.items as CommentaryItem[]);
  }
};

const processChapterPage = (
  ref: KiPageRef,
  html: string,
  planned: Planned,
): void => {
  const chapterId = chapterIdFor(ref.part, ref.chapter as number);
  const heSource = readLayer(chapterId, "source", "he-jerusalem-1956");
  if (!heSource) {
    planned.notes.push(`${ref.title}: no Hebrew ground truth at ${chapterId}`);
    return;
  }
  const heCommentary =
    readLayer(chapterId, "commentary", "he-jerusalem-1956") ?? [];
  const result = alignKiChapterPage(
    parseKiBlocks(html),
    heSource,
    heCommentary,
  );
  const verdict = <T>(items: T[]): ChapterVerdict<T> =>
    result.problems.length === 0
      ? { status: "imported", items }
      : { status: "refused", reason: result.problems.join("; ") };

  // Headings the page set as plain paragraphs leak into the note before
  // them; the next seif's `en-ai` text identifies them (`dropLeakedHeadings`).
  const aiSource = readLayer(chapterId, "source", "en-ai") ?? [];
  const aiNotes = new Map(
    (readLayer(chapterId, "commentary", "en-ai") ?? []).map((item) => [
      item.anchorId,
      item.html,
    ]),
  );
  const lastNoteOfSeif = new Map<number, string>();
  for (const item of result.items) {
    if (item.targetSeif !== undefined) {
      lastNoteOfSeif.set(item.targetSeif, item.anchorId);
    }
  }
  const { items, removed } = dropLeakedHeadings(
    result.items,
    (item) => aiNotes.get(item.anchorId),
    (item) => {
      const seif = item.targetSeif;
      if (seif === undefined || lastNoteOfSeif.get(seif) !== item.anchorId) {
        return undefined;
      }
      return aiSource.find((segment) => segment.n === seif + 1)?.html;
    },
  );
  for (const line of removed) {
    planned.notes.push(`${chapterId}: dropped a heading from ${line}`);
  }

  plan(planned, chapterId, "source", verdict(result.segments));
  if (heCommentary.length > 0) {
    plan(planned, chapterId, "commentary", verdict(items));
  }
};

const chapterNumbersOf = (part: number): number[] =>
  readdirSync(join(contentDir, "parts", partIdFor(part), "chapters"))
    .map((slug) => /^chapter-(\d+)$/.exec(slug)?.[1])
    .filter((digits): digits is string => digits !== undefined)
    .map(Number)
    .sort((a, b) => a - b);

const processWholePartPage = (
  ref: KiPageRef,
  html: string,
  planned: Planned,
): void => {
  const parsed = parseKiWholePart(parseKiBlocks(html));
  const { unplaced } = parsed;
  const { kept: seifim, cutAt } = truncateAtRepeatedText(parsed.seifim);
  if (cutAt !== undefined) {
    planned.notes.push(
      `${ref.title}: the page repeats text from seif ${cutAt} on — seifim ${cutAt}+ not offered for alignment`,
    );
  }
  if (unplaced.length > 0) {
    planned.notes.push(
      `${ref.title}: ${unplaced.length} block(s) the page walk could not place`,
    );
  }
  const chapters = chapterNumbersOf(ref.part);

  const sourceVerdicts = alignWholePartSource(
    chapters.flatMap((chapter) => {
      const heSegments = readLayer(
        chapterIdFor(ref.part, chapter),
        "source",
        "he-jerusalem-1956",
      );
      return heSegments ? [{ chapter, heSegments }] : [];
    }),
    seifim,
  );
  for (const [chapter, verdict] of sourceVerdicts) {
    plan(planned, chapterIdFor(ref.part, chapter), "source", verdict);
  }

  const commentaryVerdicts = alignWholePartCommentary(
    chapters.flatMap((chapter) => {
      const chapterId = chapterIdFor(ref.part, chapter);
      const heItems = readLayer(chapterId, "commentary", "he-jerusalem-1956");
      if (!heItems) return [];
      return [
        {
          chapter,
          heItems,
          aiItems: readLayer(chapterId, "commentary", "en-ai"),
        },
      ];
    }),
    seifim,
  );
  const printedSeifs = new Set(seifim.map((seif) => seif.n));
  for (const [chapter, verdict] of commentaryVerdicts) {
    // A chapter outside the seifim this page prints is not a refusal —
    // the page simply does not cover it.
    if (verdict.status === "refused" && !printedSeifs.has(chapter)) continue;
    plan(planned, chapterIdFor(ref.part, chapter), "commentary", verdict);
  }
};

const IMPORTED_KINDS = new Set<KiPageKind>([
  "chapter",
  "whole-part",
  "inner-observation",
  "cause-and-consequence",
  "qa-terminology",
  "qa-topics",
]);

/**
 * A Q&A table: answers pair with the Hebrew answers by position and are
 * verified against `en-ai`; questions are written only if their answers
 * were, and (list-shaped pages) each answer echoes its question.
 */
const processQaPage = (
  ref: KiPageRef,
  html: string,
  planned: Planned,
): void => {
  const kind = ref.kind === "qa-terminology" ? "terminology" : "topics";
  const questionsId = `${partIdFor(ref.part)}/questions-${kind}-01`;
  const answersId = `${partIdFor(ref.part)}/answers-${kind}-01`;
  const heQuestions = readLayer(questionsId, "source", "he-jerusalem-1956");
  const heAnswers = readLayer(answersId, "source", "he-jerusalem-1956");
  const table = parseKiQaTable(parseKiBlocks(html));
  if (!heQuestions || !heAnswers || !table) {
    planned.notes.push(`${ref.title}: no Q&A table or no Hebrew to align to`);
    return;
  }

  const answers = alignQaEntries(
    table.answers,
    qaTargets(heAnswers, readLayer(answersId, "source", "en-ai")),
    true,
  );
  plan(planned, answersId, "source", answers);

  const unechoed = questionsWithoutEcho(table);
  const questions: ChapterVerdict<SourceSegment> =
    answers.status !== "imported"
      ? { status: "refused", reason: "its answers were refused" }
      : unechoed.length > 0
        ? {
            status: "refused",
            reason: `answers do not repeat question(s) ${unechoed.join(", ")}`,
          }
        : alignQaEntries(
            table.questions,
            qaTargets(heQuestions, readLayer(questionsId, "source", "en-ai")),
            false,
          );
  plan(planned, questionsId, "source", questions);
};

/**
 * On parts 6 and 7, Sefaria's second Histaklut node is the Cause and
 * Consequence essay (see COVERAGE.md, issue #86). The site publishes it on
 * a page of its own, so it is aligned from that page, never from the
 * Inner Observation page.
 */
const ESSAY_CHAPTER_SLUG = "inner-observation-02";
const PARTS_WITH_ESSAY = new Set([6, 7]);

const observationChapterSlugs = (ref: KiPageRef): string[] => {
  const all = readdirSync(
    join(contentDir, "parts", partIdFor(ref.part), "chapters"),
  )
    .filter((slug) => slug.startsWith("inner-observation-"))
    .sort();
  if (ref.kind === "cause-and-consequence") {
    return all.filter((slug) => slug === ESSAY_CHAPTER_SLUG);
  }
  return PARTS_WITH_ESSAY.has(ref.part)
    ? all.filter((slug) => slug !== ESSAY_CHAPTER_SLUG)
    : all;
};

/**
 * Inner Observation (and the Cause and Consequence essay): items pair with
 * Hebrew segments one-to-one where the counts agree, else each segment
 * takes a run of the page's paragraphs (`ki-inner-observation.ts`).
 */
const processObservationPage = (
  ref: KiPageRef,
  html: string,
  planned: Planned,
): void => {
  const targets: ObservationTarget[] = observationChapterSlugs(ref).flatMap(
    (slug) => {
      const chapterId = `${partIdFor(ref.part)}/${slug}`;
      const he = readLayer(chapterId, "source", "he-jerusalem-1956") ?? [];
      const ai = readLayer(chapterId, "source", "en-ai");
      return he.map((segment, i) => ({
        chapterId,
        segment,
        reference: ai?.[i]?.html ?? null,
      }));
    },
  );
  if (targets.length === 0) {
    planned.notes.push(`${ref.title}: no Hebrew chapters to align to`);
    return;
  }
  const blocks = parseKiBlocks(html);
  const byItems = alignObservation(targets, parseKiObservationUnits(blocks));
  // Item pairing where it held; the run split only for chapters it refused.
  const byRuns = byItems.every((v) => v.status === "imported")
    ? []
    : alignObservationByRuns(targets, blocks);
  const verdicts = byItems.map((verdict) =>
    verdict.status === "imported"
      ? verdict
      : (byRuns.find((v) => v.chapterId === verdict.chapterId) ?? verdict),
  );
  for (const verdict of verdicts) {
    plan(
      planned,
      verdict.chapterId,
      "source",
      verdict.status === "imported"
        ? { status: "imported", items: verdict.segments }
        : { status: "refused", reason: verdict.reason ?? "refused" },
    );
  }
};

const buildCoverageSection = (planned: Planned): string => {
  const rows = new Map<string, Record<string, number>>();
  for (const outcome of planned.outcomes) {
    const partId = outcome.chapterId.split("/")[0] as string;
    const key = `${partId} | ${outcome.layer}`;
    const row = rows.get(key) ?? { imported: 0, outranked: 0, refused: 0 };
    row[outcome.status] = (row[outcome.status] ?? 0) + 1;
    rows.set(key, row);
  }
  const lines = [
    "Generated by `pnpm import:kabbalah-info --all`. Bnei Baruch's web edition",
    "at kabbalah.info, written as `en-bb-kabbalah-info` only for a chapter",
    "layer `en-bb` (KabbalahMedia) does not already cover. *Outranked* counts",
    "chapters the page covers where `en-bb` already does; *refused*, chapters",
    "whose alignment to the Hebrew could not be fully verified — those keep",
    "whatever English they had.",
    "",
    "| Part | Layer | Imported | Outranked by `en-bb` | Refused |",
    "| --- | --- | --- | --- | --- |",
    ...[...rows.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, row]) =>
          `| ${key} | ${row.imported ?? 0} | ${row.outranked ?? 0} | ${row.refused ?? 0} |`,
      ),
  ];
  const refusals = planned.outcomes.filter((o) => o.status === "refused");
  if (refusals.length > 0) {
    lines.push("", "### Refused", "");
    for (const outcome of refusals) {
      lines.push(
        `- \`${outcome.chapterId}\` ${outcome.layer}: ${outcome.reason ?? ""}`,
      );
    }
  }
  if (planned.notes.length > 0) {
    lines.push("", "### Notes", "");
    for (const note of planned.notes) lines.push(`- ${note}`);
  }
  return lines.join("\n");
};

export const main = async (argv: string[]): Promise<void> => {
  const args = parseKmArgs(argv, "import-kabbalah-info");
  const scopedParts = new Set(args.parts);

  const toc: Toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions: ContentVersion[] = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );

  const client = createHttpClient({ cacheDir });
  console.log("Fetching kabbalah.info table of contents...");
  const refs = parseKiToc(await client.getText(KI_ENTRY_URL))
    .map(classifyKiPage)
    .filter((ref): ref is KiPageRef => ref !== undefined);

  const planned: Planned = {
    source: new Map(),
    commentary: new Map(),
    outcomes: [],
    notes: [],
  };

  for (const ref of refs) {
    if (!scopedParts.has(ref.part)) continue;
    if (!IMPORTED_KINDS.has(ref.kind)) {
      planned.notes.push(
        `${ref.title}: ${ref.kind} pages are not imported yet`,
      );
      continue;
    }
    console.log(`Fetching ${ref.title}...`);
    const html = await client.getText(ref.url);
    if (ref.kind === "chapter") processChapterPage(ref, html, planned);
    else if (ref.kind === "whole-part") {
      processWholePartPage(ref, html, planned);
    } else if (ref.kind === "qa-terminology" || ref.kind === "qa-topics") {
      processQaPage(ref, html, planned);
    } else processObservationPage(ref, html, planned);
  }

  // --- Write, and sweep this version's files the run no longer produces ----
  const tocChapters = new Map<string, TocChapter>();
  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters) tocChapters.set(chapter.id, chapter);
    }
  }
  const refused = new Set(
    planned.outcomes
      .filter((o) => o.status === "refused")
      .map((o) => `${o.chapterId}:${o.layer}`),
  );

  let written = 0;
  let removed = 0;
  for (const layer of ["source", "commentary"] as const) {
    const desired = layer === "source" ? planned.source : planned.commentary;

    for (const [chapterId, items] of desired) {
      const tocChapter = tocChapters.get(chapterId);
      if (!tocChapter) {
        planned.notes.push(`${chapterId}: not in toc.json — not written`);
        continue;
      }
      const sefariaRef = layerRef(chapterId, layer);
      const file = {
        chapterId,
        layer,
        versionId: KI_VERSION_ID,
        ...(sefariaRef ? { sefariaRef } : {}),
        items,
      };
      if (!args.dryRun) {
        writeJsonFile(
          join(chapterDirFor(chapterId), `${layer}.${KI_VERSION_ID}.json`),
          file,
        );
      }
      written += 1;
      const available = tocChapter.availableVersions[layer];
      if (!available.includes(KI_VERSION_ID)) {
        // Directly after `en-bb` if present, else first: the list's order
        // is the importers' own and the reader re-ranks by language chain.
        const at = available.indexOf(OUTRANKING_VERSION_ID) + 1;
        available.splice(at, 0, KI_VERSION_ID);
      }
      if (!tocChapter.availableLayers.includes(layer)) {
        tocChapter.availableLayers.push(layer);
      }
    }

    for (const [chapterId, tocChapter] of tocChapters) {
      const part = Number(chapterId.slice(5, 7));
      if (!scopedParts.has(part) || desired.has(chapterId)) continue;
      const path = join(
        chapterDirFor(chapterId),
        `${layer}.${KI_VERSION_ID}.json`,
      );
      if (!existsSync(path)) continue;
      if (refused.has(`${chapterId}:${layer}`)) {
        console.warn(
          `Kept ${path}: this run refused it, which is not evidence it is wrong.`,
        );
        continue;
      }
      removed += 1;
      if (args.dryRun) continue;
      unlinkSync(path);
      removeKmVersionAvailability(tocChapter, layer, KI_VERSION_ID);
    }
  }

  const coverage = buildCoverageSection(planned);
  console.log(`\n${KI_COVERAGE_HEADING}\n\n${coverage}`);
  console.log(
    `\n${args.dryRun ? "Would write" : "Wrote"} ${written} file(s), ${args.dryRun ? "would remove" : "removed"} ${removed}.`,
  );
  if (args.dryRun) return;

  if (!versions.some((version) => version.id === KI_VERSION_ID)) {
    versions.push({
      id: KI_VERSION_ID,
      language: "en",
      direction: "ltr",
      title: "Bnei Baruch (kabbalah.info)",
      license: "Used with permission",
      source: "kabbalah-info",
    });
    writeJsonFile(join(contentDir, "versions.json"), versions);
  }
  writeJsonFile(join(contentDir, "toc.json"), toc);
  writeTocSplitFiles(contentDir, toc, versions);

  if (args.parts.length === KM_TOTAL_PARTS) {
    const coveragePath = join(contentDir, "COVERAGE.md");
    writeFileSync(
      coveragePath,
      mergeMarkdownSection(
        readFileSync(coveragePath, "utf-8"),
        KI_COVERAGE_HEADING,
        coverage,
      ),
      "utf-8",
    );
  } else {
    console.log(
      "\nScoped import: content/COVERAGE.md is unchanged; run --all to regenerate its kabbalah.info section.",
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
  const stats = client.stats();
  console.log(
    `HTTP: ${stats.requests} request(s), ${stats.cacheHits} cache hit(s).`,
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
