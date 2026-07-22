/**
 * Sefaria importer for Talmud Eser HaSefirot.
 *
 * `pnpm import:sefaria --part <N>` imports one part (a Sefaria "Section")
 * end to end: index -> main text + sibling nodes -> commentary -> content/
 * files -> toc.json -> content/COVERAGE.md -> `validateContent`.
 * `--all` imports every part in `content/toc.json`. `--dry-run` runs the
 * whole pipeline (network calls included, cached) without writing
 * anything to `content/`.
 *
 * See AGENTS.md for usage, cache location, and the coverage report.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ChapterKind,
  ChapterLayerFile,
  ContentVersion,
  LayerKind,
  Toc,
  TocChapter,
  TocPart,
} from "../shared/types/content.ts";
import { tocSchema, versionsFileSchema } from "../shared/types/content.ts";
import {
  buildChapterUnits,
  chapterSlug,
  type ChapterUnit,
} from "./lib/chapter-units.ts";
import {
  buildCoverageMarkdown,
  type PartCoverage,
  type VersionCoverageStat,
} from "./lib/coverage-report.ts";
import { createHttpClient, type HttpClient } from "./lib/http-client.ts";
import {
  alignJaggedArrays,
  normalizeToChapterItemLists,
} from "./lib/jagged-array.ts";
import type {
  SefariaIndex,
  SefariaIndexNode,
  SefariaJaggedText,
  SefariaLink,
  SefariaV3TextsResponse,
} from "./lib/sefaria-api-types.ts";
import {
  findMainTextNode,
  findSectionNode,
  findSiblingNodes,
  mapNodeTitleToKind,
} from "./lib/sefaria-index.ts";
import { ohrPenimiChapterRef } from "./lib/sefaria-refs.ts";
import {
  buildTocChapter,
  buildTocPart,
  mainChapterTitle,
  siblingChapterTitle,
  type ChapterFilesOnDisk,
} from "./lib/toc-builder.ts";
import {
  buildCommentaryItems,
  buildSourceSegments,
  parseCommentaryLinks,
  type CommentaryLinkInfo,
} from "./lib/transform.ts";
import { validateContent } from "./validate-content.ts";

const SEFARIA_BASE = "https://www.sefaria.org/api";
const LANGUAGE_FAMILY: Record<string, string> = { he: "hebrew", en: "english" };
/** This importer is specific to the one corpus Read TES publishes — see AGENTS.md. */
const BOOK_INDEX_TITLE = "Talmud_Eser_HaSefirot";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");
const cacheDir = join(repoRoot, ".superpowers/import-cache");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface CliArgs {
  part?: number;
  all: boolean;
  dryRun: boolean;
}

const parseArgs = (argv: string[]): CliArgs => {
  let part: number | undefined;
  let all = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--part") {
      part = Number.parseInt(argv[i + 1] ?? "", 10);
      i += 1;
    } else if (arg === "--all") {
      all = true;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  if (!all && (part === undefined || Number.isNaN(part))) {
    throw new Error("Usage: import-sefaria (--part <N> | --all) [--dry-run]");
  }

  return { part, all, dryRun };
};

// ---------------------------------------------------------------------------
// Sefaria fetch helpers
// ---------------------------------------------------------------------------

const buildTextsUrl = (ref: string, versionParams: string[]): string => {
  const url = new URL(`${SEFARIA_BASE}/v3/texts/${encodeURIComponent(ref)}`);
  for (const param of versionParams) url.searchParams.append("version", param);
  return url.toString();
};

const versionQueryParam = (version: ContentVersion): string => {
  const family = LANGUAGE_FAMILY[version.language];
  if (!family || !version.sefariaVersionTitle) {
    throw new Error(
      `versions.json: version "${version.id}" is not fetchable from Sefaria (missing language family or sefariaVersionTitle)`,
    );
  }
  return `${family}|${version.sefariaVersionTitle}`;
};

const extractVersionText = (
  response: SefariaV3TextsResponse,
  languageCode: string,
): SefariaJaggedText[] | undefined =>
  response.versions.find((v) => v.language === languageCode)?.text;

const fetchWholeNodeText = async (
  client: HttpClient,
  refBase: string,
  heVersion: ContentVersion,
  enVersion: ContentVersion,
): Promise<{
  he: SefariaJaggedText[];
  en: SefariaJaggedText[] | undefined;
}> => {
  const url = buildTextsUrl(refBase, [
    versionQueryParam(heVersion),
    versionQueryParam(enVersion),
  ]);
  const response = await client.getJson<SefariaV3TextsResponse>(url);
  const he = extractVersionText(response, heVersion.language);
  if (!he)
    throw new Error(
      `Sefaria returned no "${heVersion.language}" text for "${refBase}" (expected Hebrew to always be present)`,
    );
  return { he, en: extractVersionText(response, enVersion.language) };
};

const fetchLinks = async (
  client: HttpClient,
  ref: string,
): Promise<SefariaLink[]> => {
  const url = `${SEFARIA_BASE}/links/${encodeURIComponent(ref)}`;
  return client.getJson<SefariaLink[]>(url);
};

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

const chapterDirFor = (partId: string, slug: string): string =>
  join(contentDir, "parts", partId, "chapters", slug);

const writeJsonFile = (path: string, data: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

const writeLayerFile = (path: string, file: ChapterLayerFile): void =>
  writeJsonFile(path, file);

interface PlannedWrite {
  layer: LayerKind;
  versionId: string;
}

/**
 * `availableVersions` source of truth: a directory listing (so pre-existing
 * untouched files — curated summaries — are preserved automatically),
 * unioned with `plannedWrites` (files this run decided to write but a
 * `--dry-run` didn't actually put on disk).
 */
const filesOnDiskFor = (
  chapterDir: string,
  plannedWrites: PlannedWrite[],
): ChapterFilesOnDisk => {
  const result: ChapterFilesOnDisk = {
    summary: [],
    source: [],
    commentary: [],
  };

  if (existsSync(chapterDir)) {
    for (const name of readdirSync(chapterDir)) {
      const match = name.match(/^([a-z]+)\.(.+)\.json$/);
      if (!match) continue;
      const [, layer, versionId] = match;
      if (layer === "summary" || layer === "source" || layer === "commentary") {
        result[layer].push(versionId as string);
      }
    }
  }

  for (const write of plannedWrites) {
    if (!result[write.layer].includes(write.versionId))
      result[write.layer].push(write.versionId);
  }

  return result;
};

// ---------------------------------------------------------------------------
// Per-part import
// ---------------------------------------------------------------------------

interface ChapterCoverageEntry {
  unit: ChapterUnit;
  sourceHe: number;
  sourceEn: number;
  commentaryHe?: number;
  commentaryEn?: number;
}

interface ImportPartResult {
  tocPart: TocPart;
  coverage: PartCoverage;
}

const importPart = async (
  client: HttpClient,
  index: SefariaIndex,
  heVersion: ContentVersion,
  enVersion: ContentVersion,
  part: TocPart,
  dryRun: boolean,
): Promise<ImportPartResult> => {
  const warnings: string[] = [];
  const entries: ChapterCoverageEntry[] = [];

  const sectionNode = findSectionNode(index, part.sefariaNode);
  if (!sectionNode) {
    throw new Error(
      `Sefaria index has no node matching toc.json part "${part.id}"'s sefariaNode "${part.sefariaNode}"`,
    );
  }

  const mainNode = findMainTextNode(sectionNode);
  if (!mainNode) {
    throw new Error(
      `Sefaria index section node for "${part.id}" has no main-text ("default") child`,
    );
  }

  // --- Main text -----------------------------------------------------------
  const mainText = await fetchWholeNodeText(
    client,
    part.sefariaNode,
    heVersion,
    enVersion,
  );
  const mainUnits = buildChapterUnits(
    part.id,
    "chapter",
    mainNode,
    part.sefariaNode,
    mainText.he,
    mainText.en,
  );

  // --- Commentary (Ohr Penimi), scoped to "chapter"-kind units only --------
  const ohrPenimiBookRef = `Ohr Penimi on ${index.title}`;
  const ohrPenimiSectionRef = `${ohrPenimiBookRef} ${part.number}`;

  const links = await fetchLinks(client, part.sefariaNode);
  const { byChapter: linksByChapter, warnings: linkWarnings } =
    parseCommentaryLinks(links, ohrPenimiBookRef);
  warnings.push(...linkWarnings);

  let ohrPenimiHeChapters: string[][] = [];
  let ohrPenimiEnChapters: string[][] = [];
  if (mainUnits.length > 0) {
    const ohrPenimiText = await fetchWholeNodeText(
      client,
      ohrPenimiSectionRef,
      heVersion,
      enVersion,
    );
    ohrPenimiHeChapters = normalizeToChapterItemLists(
      { depth: 2 },
      ohrPenimiText.he,
    );
    ohrPenimiEnChapters = alignJaggedArrays(
      ohrPenimiHeChapters,
      ohrPenimiText.en
        ? normalizeToChapterItemLists({ depth: 2 }, ohrPenimiText.en)
        : undefined,
    );
  }

  const plannedByChapter = new Map<string, PlannedWrite[]>();
  const tocChapters: TocChapter[] = [];

  const processSourceOnlyUnit = (
    unit: ChapterUnit,
    node: SefariaIndexNode,
    extractHeadings: boolean,
  ): void => {
    const he = buildSourceSegments(
      node,
      unit.chapterRef,
      unit.heItems,
      extractHeadings,
    );
    const en =
      unit.enItems.length > 0
        ? buildSourceSegments(
            node,
            unit.chapterRef,
            unit.enItems,
            extractHeadings,
          )
        : { segments: [], droppedAnchors: [] };

    for (const dropped of [...he.droppedAnchors, ...en.droppedAnchors]) {
      warnings.push(
        `${dropped.sefariaRef}: dropped inline marker for commentator "${dropped.commentator}" (order ${dropped.order}) — not Ohr Penimi`,
      );
    }

    const dir = chapterDirFor(part.id, chapterSlug(unit.kind, unit.number));
    const planned: PlannedWrite[] = [];

    if (he.segments.length > 0) {
      planned.push({ layer: "source", versionId: heVersion.id });
      if (!dryRun) {
        writeLayerFile(join(dir, `source.${heVersion.id}.json`), {
          chapterId: unit.chapterId,
          layer: "source",
          versionId: heVersion.id,
          sefariaRef: unit.chapterRef,
          items: he.segments,
        });
      }
    }
    if (en.segments.length > 0) {
      planned.push({ layer: "source", versionId: enVersion.id });
      if (!dryRun) {
        writeLayerFile(join(dir, `source.${enVersion.id}.json`), {
          chapterId: unit.chapterId,
          layer: "source",
          versionId: enVersion.id,
          sefariaRef: unit.chapterRef,
          items: en.segments,
        });
      }
    }

    plannedByChapter.set(unit.chapterId, planned);
    entries.push({
      unit,
      sourceHe: he.segments.length,
      sourceEn: en.segments.length,
    });
  };

  for (const unit of mainUnits) {
    processSourceOnlyUnit(unit, mainNode, true);

    const commentaryChapterRef = ohrPenimiChapterRef(
      ohrPenimiBookRef,
      part.number,
      unit.number,
    );
    const chapterLinks: CommentaryLinkInfo[] =
      linksByChapter.get(unit.number) ?? [];
    const opHe = ohrPenimiHeChapters[unit.number - 1] ?? [];
    const opEn = ohrPenimiEnChapters[unit.number - 1] ?? [];

    const heResult = buildCommentaryItems(
      commentaryChapterRef,
      opHe,
      chapterLinks,
      "he",
    );
    const enResult = buildCommentaryItems(
      commentaryChapterRef,
      opEn,
      chapterLinks,
      "en",
    );
    warnings.push(...heResult.warnings, ...enResult.warnings);

    const dir = chapterDirFor(part.id, chapterSlug(unit.kind, unit.number));
    const planned = plannedByChapter.get(unit.chapterId) ?? [];

    if (heResult.items.length > 0) {
      planned.push({ layer: "commentary", versionId: heVersion.id });
      if (!dryRun) {
        writeLayerFile(join(dir, `commentary.${heVersion.id}.json`), {
          chapterId: unit.chapterId,
          layer: "commentary",
          versionId: heVersion.id,
          sefariaRef: commentaryChapterRef,
          items: heResult.items,
        });
      }
    }
    if (enResult.items.length > 0) {
      planned.push({ layer: "commentary", versionId: enVersion.id });
      if (!dryRun) {
        writeLayerFile(join(dir, `commentary.${enVersion.id}.json`), {
          chapterId: unit.chapterId,
          layer: "commentary",
          versionId: enVersion.id,
          sefariaRef: commentaryChapterRef,
          items: enResult.items,
        });
      }
    }

    plannedByChapter.set(unit.chapterId, planned);
    const entry = entries.find((e) => e.unit.chapterId === unit.chapterId);
    if (entry) {
      entry.commentaryHe = heResult.items.length;
      entry.commentaryEn = enResult.items.length;
    }
  }

  // --- Sibling nodes ---------------------------------------------------------
  const siblingUnitsByKind = new Map<
    ChapterKind,
    { node: SefariaIndexNode; units: ChapterUnit[] }
  >();

  for (const siblingNode of findSiblingNodes(sectionNode)) {
    const kind = mapNodeTitleToKind(siblingNode.title);
    if (!kind) {
      warnings.push(
        `section "${part.sefariaNode}": unknown sibling node "${siblingNode.title}" — no ChapterKind mapping, skipped entirely`,
      );
      continue;
    }

    const siblingRefBase = `${part.sefariaNode}, ${siblingNode.title}`;
    const siblingText = await fetchWholeNodeText(
      client,
      siblingRefBase,
      heVersion,
      enVersion,
    );
    const siblingUnits = buildChapterUnits(
      part.id,
      kind,
      siblingNode,
      siblingRefBase,
      siblingText.he,
      siblingText.en,
    );
    siblingUnitsByKind.set(kind, { node: siblingNode, units: siblingUnits });

    for (const unit of siblingUnits) {
      processSourceOnlyUnit(unit, siblingNode, false);
    }
  }

  // --- toc.json chapters -----------------------------------------------------
  for (const unit of mainUnits) {
    const dir = chapterDirFor(part.id, chapterSlug(unit.kind, unit.number));
    const files = filesOnDiskFor(
      dir,
      plannedByChapter.get(unit.chapterId) ?? [],
    );
    tocChapters.push(
      buildTocChapter(
        unit.chapterId,
        unit.kind,
        unit.number,
        mainChapterTitle(unit.number),
        files,
      ),
    );
  }

  for (const { node: siblingNode, units } of siblingUnitsByKind.values()) {
    for (const unit of units) {
      const dir = chapterDirFor(part.id, chapterSlug(unit.kind, unit.number));
      const files = filesOnDiskFor(
        dir,
        plannedByChapter.get(unit.chapterId) ?? [],
      );
      const title = siblingChapterTitle(siblingNode, unit.number, units.length);
      tocChapters.push(
        buildTocChapter(unit.chapterId, unit.kind, unit.number, title, files),
      );
    }
  }

  const tocPart = buildTocPart(
    part,
    { en: sectionNode.title, he: sectionNode.heTitle },
    tocChapters,
  );

  // --- Coverage ----------------------------------------------------------
  const chapterKindUnits = entries.filter((e) => e.unit.kind === "chapter");
  const allUnits = entries;

  const versionStat = (
    layer: "source" | "commentary",
    version: ContentVersion,
    universe: ChapterCoverageEntry[],
    countFor: (entry: ChapterCoverageEntry) => number,
  ): VersionCoverageStat => {
    const withText = universe.filter((e) => countFor(e) > 0);
    return {
      layer,
      versionId: version.id,
      chaptersTotal: universe.length,
      chaptersWithText: withText.length,
      segments: universe.reduce((sum, e) => sum + countFor(e), 0),
      emptyChapterIds: universe
        .filter((e) => countFor(e) === 0)
        .map((e) => e.unit.chapterId),
    };
  };

  const stats: VersionCoverageStat[] = [
    versionStat("source", heVersion, allUnits, (e) => e.sourceHe),
    versionStat("source", enVersion, allUnits, (e) => e.sourceEn),
    versionStat(
      "commentary",
      heVersion,
      chapterKindUnits,
      (e) => e.commentaryHe ?? 0,
    ),
    versionStat(
      "commentary",
      enVersion,
      chapterKindUnits,
      (e) => e.commentaryEn ?? 0,
    ),
  ];

  return {
    tocPart,
    coverage: {
      partId: part.id,
      partTitle: tocPart.title.en ?? part.id,
      stats,
      warnings,
    },
  };
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const findPartsToProcess = (toc: Toc, args: CliArgs): TocPart[] => {
  const allParts = toc.volumes.flatMap((v) => v.parts);
  if (args.all) return allParts;

  const part = allParts.find((p) => p.number === args.part);
  if (!part) throw new Error(`toc.json has no part with number ${args.part}`);
  return [part];
};

export const main = async (argv: string[]): Promise<void> => {
  const args = parseArgs(argv);

  const toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );

  const heVersion = versions.find(
    (v) => v.language === "he" && v.source === "sefaria",
  );
  const enVersion = versions.find(
    (v) => v.language === "en" && v.source === "sefaria",
  );
  if (!heVersion || !enVersion) {
    throw new Error(
      'content/versions.json must have one "he"/"sefaria" and one "en"/"sefaria" ContentVersion for the importer to fetch',
    );
  }

  const client = createHttpClient({ cacheDir });
  const index = await client.getJson<SefariaIndex>(
    `${SEFARIA_BASE}/v2/index/${BOOK_INDEX_TITLE}`,
  );

  const targetParts = findPartsToProcess(toc, args);
  const results: ImportPartResult[] = [];

  for (const part of targetParts) {
    console.log(`Importing ${part.id} (${part.sefariaNode})...`);
    const result = await importPart(
      client,
      index,
      heVersion,
      enVersion,
      part,
      args.dryRun,
    );
    results.push(result);
    console.log(`  ${result.tocPart.chapters.length} chapters resolved.`);
    for (const warning of result.coverage.warnings)
      console.warn(`  ! ${warning}`);
  }

  if (!args.dryRun) {
    const updatedTocParts = new Map(
      results.map((r) => [r.tocPart.id, r.tocPart]),
    );
    const updatedToc: Toc = {
      volumes: toc.volumes.map((volume) => ({
        ...volume,
        parts: volume.parts.map((part) => updatedTocParts.get(part.id) ?? part),
      })),
    };
    writeJsonFile(join(contentDir, "toc.json"), updatedToc);
  }

  const coverageMarkdown = buildCoverageMarkdown(
    results.map((r) => r.coverage),
  );
  console.log(`\n${coverageMarkdown}`);

  if (!args.dryRun) {
    writeFileSync(join(contentDir, "COVERAGE.md"), coverageMarkdown, "utf-8");

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

  const clientStats = client.stats();
  console.log(
    `\nHTTP: ${clientStats.requests} request(s), ${clientStats.cacheHits} cache hit(s).`,
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
