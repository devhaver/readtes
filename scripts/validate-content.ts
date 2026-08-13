/**
 * Validates every JSON file under `content/` against the Zod schemas in
 * `shared/types/content.ts`, then cross-checks referential integrity
 * between the ToC, the version registry, and the chapter/layer files on
 * disk. Run via `pnpm validate:content`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import {
  chapterLayerFileSchema,
  glossaryCitationsFileSchema,
  glossaryFileSchema,
  glossaryIndexFileSchema,
  tocPartFileSchema,
  tocSchema,
  tocVolumesFileSchema,
  versionsFileSchema,
  type ContentVersion,
  type LayerKind,
  type ParsedChapterLayerFile,
  type SourceSegment,
  type Toc,
} from "../shared/types/content.ts";
import {
  anchorMarkersFromHtml,
  labelNamesMarker,
} from "../shared/utils/anchorMarkers.ts";
import {
  deriveGlossaryCitationsFile,
  deriveGlossaryIndexFile,
  GLOSSARY_CITATIONS_FILE_NAME,
  GLOSSARY_FILE_NAME,
  GLOSSARY_INDEX_FILE_NAME,
} from "./lib/glossary-splits.ts";
import { CONSOLIDATED_QA_KINDS } from "./lib/qa-consolidation.ts";
import { deriveTocPartFiles, deriveTocVolumesFile } from "./lib/toc-splits.ts";

export interface ValidationResult {
  errors: string[];
}

export interface LoadedChapterFile {
  /** Path to the file, relative to the content root — used in error messages. */
  relativePath: string;
  /** `<partId>/<chapterSlug>`, derived from the file's directory. */
  chapterDirId: string;
  file: ParsedChapterLayerFile;
}

const LAYER_KINDS: LayerKind[] = ["summary", "source", "commentary"];

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf-8"));

const formatZodError = (
  label: string,
  error: { issues: { path: PropertyKey[]; message: string }[] },
): string[] =>
  error.issues.map(
    (issue) =>
      `${label}: ${issue.path.join(".") || "(root)"} — ${issue.message}`,
  );

/** Anchor ids present in already-normalized HTML (`data-anchor="op-N"`). */
const anchorIdsInHtml = (html: string): Set<string> => {
  const ids = new Set<string>();
  for (const match of html.matchAll(/data-anchor="([^"]+)"/g)) {
    ids.add(match[1] as string);
  }
  return ids;
};

const listSubdirNames = (dir: string): string[] => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

const loadChapterFiles = (
  contentDir: string,
  errors: string[],
): LoadedChapterFile[] => {
  const partsDir = join(contentDir, "parts");
  const loaded: LoadedChapterFile[] = [];
  const partDirs = listSubdirNames(partsDir);

  if (partDirs.length === 0) {
    errors.push(
      `content/parts directory is missing or empty (expected at ${relative(contentDir, partsDir)})`,
    );
    return loaded;
  }

  for (const partId of partDirs) {
    const chaptersDir = join(partsDir, partId, "chapters");
    const chapterDirs = listSubdirNames(chaptersDir);

    for (const chapterDir of chapterDirs) {
      const chapterPath = join(chaptersDir, chapterDir);
      const chapterDirId = `${partId}/${chapterDir}`;
      const fileNames = readdirSync(chapterPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name);

      for (const fileName of fileNames) {
        const filePath = join(chapterPath, fileName);
        const relativePath = relative(contentDir, filePath);
        const nameMatch = fileName.match(/^([a-z]+)\.(.+)\.json$/);

        if (!nameMatch) {
          errors.push(
            `${relativePath}: filename does not match "<layer>.<versionId>.json"`,
          );
          continue;
        }

        const [, fileLayer, fileVersionId] = nameMatch;
        const raw = readJson(filePath);
        const parsed = chapterLayerFileSchema.safeParse(raw);

        if (!parsed.success) {
          errors.push(...formatZodError(relativePath, parsed.error));
          continue;
        }

        const file = parsed.data;

        if (file.layer !== fileLayer) {
          errors.push(
            `${relativePath}: filename layer "${fileLayer}" does not match file's "layer": "${file.layer}"`,
          );
        }
        if (file.versionId !== fileVersionId) {
          errors.push(
            `${relativePath}: filename versionId "${fileVersionId}" does not match file's "versionId": "${file.versionId}"`,
          );
        }
        if (file.chapterId !== chapterDirId) {
          errors.push(
            `${relativePath}: chapterId "${file.chapterId}" does not match directory location "${chapterDirId}"`,
          );
        }

        loaded.push({ relativePath, chapterDirId, file });
      }
    }
  }

  return loaded;
};

const checkSourceHtmlAnchorsConsistency = (
  loaded: LoadedChapterFile[],
  errors: string[],
): void => {
  for (const { relativePath, file } of loaded) {
    if (file.layer !== "source") continue;

    for (const segment of file.items) {
      const declared = new Set(segment.anchors);
      const inHtml = anchorIdsInHtml(segment.html);

      for (const id of declared) {
        if (!inHtml.has(id)) {
          errors.push(
            `${relativePath}: seif ${segment.n} declares anchor "${id}" but it is not present in its html`,
          );
        }
      }
      for (const id of inHtml) {
        if (!declared.has(id)) {
          errors.push(
            `${relativePath}: seif ${segment.n} html contains anchor "${id}" not listed in its anchors[]`,
          );
        }
      }
    }
  }
};

const arraysEqual = <T>(left: T[], right: T[]): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

/**
 * The strict, index-aligned check every ordinary "source" translation must
 * satisfy: same item count, same `n`/`sefariaRef`/`anchors` at every index.
 */
const checkSourceIndexAligned = (
  translated: LoadedChapterFile,
  source: LoadedChapterFile,
  translatedFrom: string,
  errors: string[],
): void => {
  if (translated.file.layer !== "source" || source.file.layer !== "source") {
    return;
  }
  const translatedItems = translated.file.items;
  const sourceItems = source.file.items;

  if (translatedItems.length !== sourceItems.length) {
    errors.push(
      `${translated.relativePath}: translated source has ${translatedItems.length} item(s), but "${translatedFrom}" has ${sourceItems.length}`,
    );
    return;
  }

  translatedItems.forEach((item, index) => {
    const sourceItem = sourceItems[index];
    if (
      !sourceItem ||
      item.n !== sourceItem.n ||
      item.sefariaRef !== sourceItem.sefariaRef ||
      !arraysEqual(item.anchors, sourceItem.anchors)
    ) {
      errors.push(
        `${translated.relativePath}: translated source item ${index + 1} does not preserve "${translatedFrom}" n, sefariaRef, and anchors`,
      );
    }
  });
};

/**
 * The relaxed check for a consolidated `answers-terminology`/`answers-topics`
 * chapter (issue #91): a translation may legitimately cover a SUBSET of the
 * source's items — the merge unions whatever per-answer chapters each
 * version originally had (`en-bb` never covered every answer), so a
 * translated file can be shorter than its source without that being a data
 * problem. What is never legitimate is a translated item with no source
 * counterpart, or one whose identity disagrees with its counterpart — count
 * equality was only ever a proxy for that (mirrors how the commentary check
 * below already relaxed for the same reason, issue #79/#87).
 *
 * Identity here is `n` (the answer number `consolidateAnswerSegments` reset
 * every item to) — usually unique per file, but the rare answer broken into
 * several segments shares one `n` across several items, disambiguated by
 * `sefariaRef` (unique per item; `data-order`-derived and never renumbered).
 */
const checkSourceConsolidatedQaSubset = (
  translated: LoadedChapterFile,
  source: LoadedChapterFile,
  translatedFrom: string,
  errors: string[],
): void => {
  if (translated.file.layer !== "source" || source.file.layer !== "source") {
    return;
  }

  const sourceByN = new Map<number, SourceSegment[]>();
  for (const item of source.file.items) {
    const list = sourceByN.get(item.n) ?? [];
    list.push(item);
    sourceByN.set(item.n, list);
  }

  for (const item of translated.file.items) {
    const candidates = sourceByN.get(item.n) ?? [];
    const match =
      candidates.length <= 1
        ? candidates[0]
        : candidates.find((c) => c.sefariaRef === item.sefariaRef);

    if (!match) {
      errors.push(
        `${translated.relativePath}: translated source item n=${item.n} (${item.sefariaRef ?? "no sefariaRef"}) has no counterpart in "${translatedFrom}"`,
      );
      continue;
    }
    if (
      item.sefariaRef !== match.sefariaRef ||
      !arraysEqual(item.anchors, match.anchors)
    ) {
      errors.push(
        `${translated.relativePath}: translated source item n=${item.n} does not preserve "${translatedFrom}" sefariaRef and anchors`,
      );
    }
  }
};

/**
 * A translated layer must remain structurally aligned with the registered
 * source version it names. Translation may change prose, but never the
 * identities the reader uses to align layers and commentary.
 *
 * `consolidatedQaChapterIds` narrowly scopes the subset-allowance above to
 * exactly the chapters issue #91 consolidated (`answers-terminology`/
 * `answers-topics`) — every other chapter, including the always-whole
 * `questions-*` chapters, keeps the strict index-aligned check.
 */
export const checkTranslatedVersionIntegrity = (
  versions: ContentVersion[],
  loaded: LoadedChapterFile[],
  errors: string[],
  consolidatedQaChapterIds: Set<string> = new Set(),
): void => {
  const versionsById = new Map(
    versions.map((version) => [version.id, version]),
  );
  const filesByIdentity = new Map(
    loaded.map((entry) => [
      `${entry.chapterDirId}|${entry.file.layer}|${entry.file.versionId}`,
      entry,
    ]),
  );

  for (const version of versions) {
    if (!version.translatedFrom) continue;

    if (!versionsById.has(version.translatedFrom)) {
      errors.push(
        `versions.json: translated version "${version.id}" references unknown translatedFrom version "${version.translatedFrom}"`,
      );
      continue;
    }

    for (const translated of loaded.filter(
      (entry) => entry.file.versionId === version.id,
    )) {
      const source = filesByIdentity.get(
        `${translated.chapterDirId}|${translated.file.layer}|${version.translatedFrom}`,
      );

      if (!source) {
        errors.push(
          `${translated.relativePath}: translated version "${version.id}" has no same-layer "${version.translatedFrom}" counterpart for chapter "${translated.chapterDirId}"`,
        );
        continue;
      }

      if (
        translated.file.layer === "source" &&
        source.file.layer === "source"
      ) {
        if (consolidatedQaChapterIds.has(translated.chapterDirId)) {
          checkSourceConsolidatedQaSubset(
            translated,
            source,
            version.translatedFrom,
            errors,
          );
        } else {
          checkSourceIndexAligned(
            translated,
            source,
            version.translatedFrom,
            errors,
          );
        }
      }

      if (
        translated.file.layer === "commentary" &&
        source.file.layer === "commentary"
      ) {
        // A translation may legitimately cover a SUBSET of the source's
        // items: the unanchored import (#79) regrows a chapter's Hebrew
        // commentary with previously-discarded items, and their
        // translations arrive later (#87). What is never legitimate is a
        // translated item with no source counterpart, or one whose
        // identity (anchorId → order/targetSeif) disagrees with its
        // counterpart — count equality was only ever a proxy for that.
        const translatedItems = translated.file.items;
        const sourceById = new Map(
          source.file.items.map((item) => [item.anchorId, item]),
        );

        for (const item of translatedItems) {
          const sourceItem = sourceById.get(item.anchorId);
          if (!sourceItem) {
            errors.push(
              `${translated.relativePath}: translated commentary item "${item.anchorId}" has no counterpart in "${version.translatedFrom}"`,
            );
            continue;
          }
          if (
            item.order !== sourceItem.order ||
            item.targetSeif !== sourceItem.targetSeif
          ) {
            errors.push(
              `${translated.relativePath}: translated commentary item "${item.anchorId}" does not preserve "${version.translatedFrom}" order and targetSeif`,
            );
          }
        }
      }
    }
  }
};

/**
 * The anchor round-trip: every source segment's `anchors[]` entry must
 * resolve to an **anchored** `CommentaryItem.anchorId` (an unanchored item
 * shares the `op-<order>` grammar but has no matching marker in the source,
 * so it may never be a source anchor's target), and every anchored item's
 * `targetSeif` must name a seif that exists. Unanchored items (no
 * `targetSeif`) are skipped on the commentary side — there is nothing to
 * round-trip — but see `checkCommentaryItemBasics` for the checks that
 * still apply to them.
 */
const checkAnchorCommentaryIntegrity = (
  loaded: LoadedChapterFile[],
  errors: string[],
): void => {
  const byChapter = new Map<string, LoadedChapterFile[]>();
  for (const entry of loaded) {
    const list = byChapter.get(entry.chapterDirId) ?? [];
    list.push(entry);
    byChapter.set(entry.chapterDirId, list);
  }

  for (const [chapterDirId, entries] of byChapter) {
    const sourceFiles = entries.filter((e) => e.file.layer === "source");
    const commentaryFiles = entries.filter(
      (e) => e.file.layer === "commentary",
    );

    // Only anchored items (targetSeif defined) are eligible round-trip
    // targets — an unanchored item's anchorId must never be named by a
    // source segment's anchors[].
    const anchoredCommentaryAnchorIds = new Set(
      commentaryFiles.flatMap((e) =>
        e.file.layer === "commentary"
          ? e.file.items
              .filter((item) => item.targetSeif !== undefined)
              .map((item) => item.anchorId)
          : [],
      ),
    );
    const sourceSeifNumbers = new Set(
      sourceFiles.flatMap((e) =>
        e.file.layer === "source" ? e.file.items.map((item) => item.n) : [],
      ),
    );

    for (const entry of sourceFiles) {
      if (entry.file.layer !== "source") continue;
      for (const segment of entry.file.items) {
        for (const anchorId of segment.anchors) {
          if (!anchoredCommentaryAnchorIds.has(anchorId)) {
            errors.push(
              `${entry.relativePath}: anchor "${anchorId}" (seif ${segment.n}) has no matching anchored CommentaryItem.anchorId in any commentary version of chapter "${chapterDirId}"`,
            );
          }
        }
      }
    }

    for (const entry of commentaryFiles) {
      if (entry.file.layer !== "commentary") continue;
      for (const item of entry.file.items) {
        if (item.targetSeif === undefined) continue;
        if (!sourceSeifNumbers.has(item.targetSeif)) {
          errors.push(
            `${entry.relativePath}: anchor "${item.anchorId}" targets seif ${item.targetSeif}, which does not exist in any source version of chapter "${chapterDirId}"`,
          );
        }
      }
    }
  }
};

/**
 * Checks that apply to every commentary item regardless of anchored vs
 * unanchored: `order` unique per file (distinct from "positive", which the
 * schema already enforces), and `html` non-empty. These never relax for
 * unanchored items — they are the minimum an unanchored item still has to
 * satisfy once it opts out of the anchor round-trip above.
 */
const checkCommentaryItemBasics = (
  loaded: LoadedChapterFile[],
  errors: string[],
): void => {
  for (const { relativePath, file } of loaded) {
    if (file.layer !== "commentary") continue;

    const orderCounts = new Map<number, number>();
    for (const item of file.items) {
      orderCounts.set(item.order, (orderCounts.get(item.order) ?? 0) + 1);

      if (item.html.trim().length === 0) {
        errors.push(
          `${relativePath}: commentary item "${item.anchorId}" (order ${item.order}) has empty html`,
        );
      }

      // The `op-<order>` identity is load-bearing, not decorative: anchorId
      // is bound as the DOM id and Vue :key in the reader and resolved by
      // lookup in `commentaryNotice`. For an unanchored item no round-trip
      // check can ever catch a malformed or duplicated anchorId, so the
      // grammar is enforced here for every item, anchored or not.
      if (item.anchorId !== `op-${item.order}`) {
        errors.push(
          `${relativePath}: commentary item anchorId "${item.anchorId}" does not match its order — expected "op-${item.order}"`,
        );
      }
    }

    for (const [order, count] of orderCounts) {
      if (count > 1) {
        errors.push(
          `${relativePath}: order ${order} is used by ${count} commentary items — order must be unique per file`,
        );
      }
    }
  }
};

/**
 * An anchored commentary item's label must name the marker its OWN version's
 * source text prints for that anchor (issue #96).
 *
 * The two are the same thing seen from either side of the page: the marker
 * is what the reader sees inset in the Ari's text and clicks; the label is
 * what the note beside it is called. They drifted because both import paths
 * set the English label to `String(order)` — the item's running position —
 * and Bnei Baruch's edition marks the text with the gematria values of the
 * Hebrew letters instead (`… 10, 20, 30 … 400`), so the 12th note is printed
 * "30", not "12". `scripts/migrate-commentary-labels.ts` corrected the
 * committed files; this keeps a future import from silently undoing it.
 *
 * Deliberately checked per VERSION, never across versions: only
 * `commentary.en-bb.json` against `source.en-bb.json`. A chapter's Hebrew
 * source prints letters and its English source prints numbers, and neither
 * is wrong.
 *
 * Uses `labelNamesMarker` rather than equality so a label may stay richer
 * than its marker where the data genuinely is — `part-02/chapter-01` op-20
 * is `"ר וש"`, one note covering two printed letters, against a source that
 * prints only the first.
 *
 * Unanchored items are exempt: no marker exists anywhere for them, so
 * `label` stays the plain `order` digits the schema documents.
 */
const checkCommentaryLabelMatchesSourceMarker = (
  loaded: LoadedChapterFile[],
  versions: ContentVersion[],
  errors: string[],
): void => {
  const languageOf = new Map(versions.map((v) => [v.id, v.language]));

  const sourceMarkers = new Map<string, Map<string, string>>();
  for (const entry of loaded) {
    if (entry.file.layer !== "source") continue;
    sourceMarkers.set(
      `${entry.chapterDirId}::${entry.file.versionId}`,
      anchorMarkersFromHtml(entry.file.items.map((segment) => segment.html)),
    );
  }

  for (const entry of loaded) {
    if (entry.file.layer !== "commentary") continue;

    const language = languageOf.get(entry.file.versionId);
    if (language === undefined) continue;

    const markers = sourceMarkers.get(
      `${entry.chapterDirId}::${entry.file.versionId}`,
    );
    // No same-version source text in this chapter: nothing prints a marker
    // to check against, which is a coverage gap, not a label defect.
    if (!markers) continue;

    for (const item of entry.file.items) {
      if (item.targetSeif === undefined) continue;

      const marker = markers.get(item.anchorId);
      if (marker === undefined) continue;
      if (labelNamesMarker(item.label[language], marker)) continue;

      errors.push(
        `${entry.relativePath}: anchor "${item.anchorId}" is labelled "${item.label[language] ?? ""}" (${language}) but its own source version prints "${marker}" — run \`pnpm migrate:commentary-labels\``,
      );
    }
  }
};

const checkTocFileCrossReferences = (
  toc: Toc,
  loaded: LoadedChapterFile[],
  versionIds: Set<string>,
  errors: string[],
): void => {
  const filesOnDisk = new Map<string, Set<string>>(); // chapterDirId -> `${layer}:${versionId}`
  for (const entry of loaded) {
    const key = `${entry.file.layer}:${entry.file.versionId}`;
    const set = filesOnDisk.get(entry.chapterDirId) ?? new Set<string>();
    set.add(key);
    filesOnDisk.set(entry.chapterDirId, set);
  }

  const declaredInToc = new Set<string>(); // chapterDirId -> tracked separately below
  const tocChapterIds = new Set<string>();

  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters) {
        tocChapterIds.add(chapter.id);

        for (const layer of LAYER_KINDS) {
          for (const versionId of chapter.availableVersions[layer]) {
            if (!versionIds.has(versionId)) {
              errors.push(
                `toc.json: chapter "${chapter.id}" availableVersions.${layer} references unknown version "${versionId}"`,
              );
            }

            const key = `${layer}:${versionId}`;
            declaredInToc.add(`${chapter.id}|${key}`);

            const onDisk = filesOnDisk.get(chapter.id);
            if (!onDisk?.has(key)) {
              errors.push(
                `toc.json: chapter "${chapter.id}" declares availableVersions.${layer} "${versionId}" but no file content/parts/${chapter.id.replace("/", "/chapters/")}/${layer}.${versionId}.json exists`,
              );
            }
          }

          const declaresLayer = chapter.availableLayers.includes(layer);
          const hasVersions = chapter.availableVersions[layer].length > 0;
          if (declaresLayer !== hasVersions) {
            errors.push(
              `toc.json: chapter "${chapter.id}" availableLayers ${declaresLayer ? "includes" : "omits"} "${layer}" but availableVersions.${layer} is ${hasVersions ? "non-empty" : "empty"}`,
            );
          }
        }
      }
    }
  }

  for (const [chapterDirId, keys] of filesOnDisk) {
    if (!tocChapterIds.has(chapterDirId)) {
      errors.push(
        `content/parts/${chapterDirId.replace("/", "/chapters/")}: has content files but no matching chapter in toc.json`,
      );
      continue;
    }
    for (const key of keys) {
      if (!declaredInToc.has(`${chapterDirId}|${key}`)) {
        const [layer, versionId] = key.split(":");
        errors.push(
          `content/parts/${chapterDirId.replace("/", "/chapters/")}/${layer}.${versionId}.json: exists on disk but is not listed in toc.json's availableVersions.${layer} for chapter "${chapterDirId}"`,
        );
      }
    }
  }
};

/**
 * Order-independent (for objects; order-dependent for arrays) structural
 * equality — used to compare a parsed `toc.volumes.json`/`toc.parts/*.json`
 * against what `deriveTocVolumesFile`/`deriveTocPartFiles` computes fresh
 * from `toc.json`, without relying on the two sides agreeing on object key
 * insertion order.
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  return (
    aKeys.length === bKeys.length &&
    aKeys.every((key) => deepEqual(aRecord[key], bRecord[key]))
  );
};

/**
 * Cross-checks `content/toc.volumes.json` and every `content/toc.parts/*.json`
 * against what `deriveTocVolumesFile`/`deriveTocPartFiles`
 * (`scripts/lib/toc-splits.ts`) compute fresh from `toc.json` — the same
 * derivation both importers and `pnpm emit:toc-splits` use to write these
 * files. Any drift (missing file, stale file, or content mismatch) is a
 * validation error: app code trusts these split files are exactly
 * derivable from `toc.json`, never hand-edited out of sync with it.
 */
const checkTocSplitEquivalence = (
  contentDir: string,
  toc: Toc,
  versions: ContentVersion[],
  errors: string[],
): void => {
  const expectedVolumesFile = deriveTocVolumesFile(toc, versions);
  const volumesPath = join(contentDir, "toc.volumes.json");

  if (!existsSync(volumesPath)) {
    errors.push(
      'content/toc.volumes.json: missing — run "pnpm emit:toc-splits" to regenerate it from content/toc.json',
    );
  } else {
    const parsed = tocVolumesFileSchema.safeParse(readJson(volumesPath));
    if (!parsed.success) {
      errors.push(...formatZodError("content/toc.volumes.json", parsed.error));
    } else if (!deepEqual(parsed.data, expectedVolumesFile)) {
      errors.push(
        'content/toc.volumes.json: does not match the file derivable from content/toc.json — run "pnpm emit:toc-splits" to regenerate it',
      );
    }
  }

  const expectedPartFiles = deriveTocPartFiles(toc, contentDir);
  const expectedFileNames = new Set(
    expectedPartFiles.map((file) => `${file.part.id}.json`),
  );
  const partsDir = join(contentDir, "toc.parts");

  for (const file of expectedPartFiles) {
    const fileName = `${file.part.id}.json`;
    const filePath = join(partsDir, fileName);

    if (!existsSync(filePath)) {
      errors.push(
        `content/toc.parts/${fileName}: missing — run "pnpm emit:toc-splits" to regenerate it from content/toc.json`,
      );
      continue;
    }

    const parsed = tocPartFileSchema.safeParse(readJson(filePath));
    if (!parsed.success) {
      errors.push(
        ...formatZodError(`content/toc.parts/${fileName}`, parsed.error),
      );
    } else if (!deepEqual(parsed.data, file)) {
      errors.push(
        `content/toc.parts/${fileName}: does not match the file derivable from content/toc.json — run "pnpm emit:toc-splits" to regenerate it`,
      );
    }
  }

  const existingFileNames = existsSync(partsDir)
    ? readdirSync(partsDir).filter((name) => name.endsWith(".json"))
    : [];
  for (const fileName of existingFileNames) {
    if (!expectedFileNames.has(fileName)) {
      errors.push(
        `content/toc.parts/${fileName}: exists on disk but content/toc.json has no matching part — stale, remove it or run "pnpm emit:toc-splits"`,
      );
    }
  }
};

/**
 * Validates `content/glossary/tes-en.json`, cross-checks that every chapter
 * it cites actually exists in `toc.json` (its citations become links on
 * `/glossary`, so a stale `chapterId` would ship a 404), and cross-checks
 * the two derived split files against what
 * `deriveGlossaryIndexFile`/`deriveGlossaryCitationsFile`
 * (`scripts/lib/glossary-splits.ts`) compute fresh from it — the same
 * derivation `pnpm emit:glossary-splits` uses to write them. Same contract
 * as `checkTocSplitEquivalence`: app code trusts the split files are
 * exactly derivable from the canonical one.
 */
const checkGlossary = (
  contentDir: string,
  tocChapterIds: Set<string>,
  errors: string[],
): void => {
  const glossaryDir = join(contentDir, "glossary");
  const glossaryPath = join(glossaryDir, GLOSSARY_FILE_NAME);

  if (!existsSync(glossaryPath)) {
    errors.push(`content/glossary/${GLOSSARY_FILE_NAME}: missing`);
    return;
  }

  const parsed = glossaryFileSchema.safeParse(readJson(glossaryPath));
  if (!parsed.success) {
    errors.push(
      ...formatZodError(`content/glossary/${GLOSSARY_FILE_NAME}`, parsed.error),
    );
    return;
  }
  const glossary = parsed.data;

  if (glossary.entryCount !== glossary.entries.length) {
    errors.push(
      `content/glossary/${GLOSSARY_FILE_NAME}: entryCount is ${glossary.entryCount} but there are ${glossary.entries.length} entries`,
    );
  }

  const seenIds = new Set<string>();
  for (const entry of glossary.entries) {
    if (seenIds.has(entry.id)) {
      errors.push(
        `content/glossary/${GLOSSARY_FILE_NAME}: duplicate entry id "${entry.id}"`,
      );
    }
    seenIds.add(entry.id);

    for (const citation of entry.citations) {
      if (
        citation.chapterId !== undefined &&
        !tocChapterIds.has(citation.chapterId)
      ) {
        errors.push(
          `content/glossary/${GLOSSARY_FILE_NAME}: entry "${entry.id}" cites chapter "${citation.chapterId}", which does not exist in toc.json`,
        );
      }
    }
  }

  for (const convention of glossary.conventions) {
    for (const example of convention.examples) {
      if (!tocChapterIds.has(example.chapterId)) {
        errors.push(
          `content/glossary/${GLOSSARY_FILE_NAME}: convention "${convention.id}" quotes chapter "${example.chapterId}", which does not exist in toc.json`,
        );
      }
    }
  }

  const expected: [string, unknown, z.ZodType][] = [
    [
      GLOSSARY_INDEX_FILE_NAME,
      deriveGlossaryIndexFile(glossary),
      glossaryIndexFileSchema,
    ],
    [
      GLOSSARY_CITATIONS_FILE_NAME,
      deriveGlossaryCitationsFile(glossary),
      glossaryCitationsFileSchema,
    ],
  ];

  for (const [fileName, expectedFile, schema] of expected) {
    const filePath = join(glossaryDir, fileName);

    if (!existsSync(filePath)) {
      errors.push(
        `content/glossary/${fileName}: missing — run "pnpm emit:glossary-splits" to regenerate it from ${GLOSSARY_FILE_NAME}`,
      );
      continue;
    }

    const parsedFile = schema.safeParse(readJson(filePath));
    if (!parsedFile.success) {
      errors.push(
        ...formatZodError(`content/glossary/${fileName}`, parsedFile.error),
      );
    } else if (!deepEqual(parsedFile.data, expectedFile)) {
      errors.push(
        `content/glossary/${fileName}: does not match the file derivable from ${GLOSSARY_FILE_NAME} — run "pnpm emit:glossary-splits" to regenerate it`,
      );
    }
  }
};

export const validateContent = (contentDir: string): ValidationResult => {
  const errors: string[] = [];

  const versionsRaw = readJson(join(contentDir, "versions.json"));
  const versionsParsed = versionsFileSchema.safeParse(versionsRaw);
  if (!versionsParsed.success) {
    errors.push(...formatZodError("versions.json", versionsParsed.error));
  }
  const versionIds = new Set(
    versionsParsed.success ? versionsParsed.data.map((v) => v.id) : [],
  );

  const tocRaw = readJson(join(contentDir, "toc.json"));
  const tocParsed = tocSchema.safeParse(tocRaw);
  if (!tocParsed.success) {
    errors.push(...formatZodError("toc.json", tocParsed.error));
  }

  const loaded = loadChapterFiles(contentDir, errors);

  // Scoped narrowly to the chapters issue #91 actually consolidated — every
  // other chapter (including `questions-*`, always a single whole-node
  // chapter with no subset history) keeps the strict alignment check.
  const consolidatedQaChapterIds = tocParsed.success
    ? new Set(
        tocParsed.data.volumes.flatMap((volume) =>
          volume.parts.flatMap((part) =>
            part.chapters
              .filter((chapter) => CONSOLIDATED_QA_KINDS.includes(chapter.kind))
              .map((chapter) => chapter.id),
          ),
        ),
      )
    : new Set<string>();

  checkSourceHtmlAnchorsConsistency(loaded, errors);
  checkAnchorCommentaryIntegrity(loaded, errors);
  checkCommentaryItemBasics(loaded, errors);
  if (versionsParsed.success) {
    checkCommentaryLabelMatchesSourceMarker(
      loaded,
      versionsParsed.data,
      errors,
    );
    checkTranslatedVersionIntegrity(
      versionsParsed.data,
      loaded,
      errors,
      consolidatedQaChapterIds,
    );
  }

  if (tocParsed.success) {
    checkTocFileCrossReferences(tocParsed.data, loaded, versionIds, errors);
    checkTocSplitEquivalence(
      contentDir,
      tocParsed.data,
      versionsParsed.success ? versionsParsed.data : [],
      errors,
    );
    checkGlossary(
      contentDir,
      new Set(
        tocParsed.data.volumes.flatMap((volume) =>
          volume.parts.flatMap((part) =>
            part.chapters.map((chapter) => chapter.id),
          ),
        ),
      ),
      errors,
    );
  }

  return { errors };
};

const isRunAsScript = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === `file://${entry}`;
};

if (isRunAsScript()) {
  const contentDir = join(
    fileURLToPath(new URL("..", import.meta.url)),
    "content",
  );
  const { errors } = validateContent(contentDir);

  if (errors.length > 0) {
    for (const error of errors) console.error(`✖ ${error}`);
    console.error(`\n${errors.length} content validation error(s).`);
    process.exit(1);
  }

  console.log("✓ Content validation passed.");
}
