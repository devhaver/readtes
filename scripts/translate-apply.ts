/**
 * Ingests a translated batch result and writes the corpus files.
 *
 * `pnpm translate:apply --file <result>.json [--target <versionId>] [--dry-run]`
 *
 * `--target` names the version being written. It is a flag rather than a
 * required field of the result file because the result file is what comes back
 * from a MODEL, and the manifest's own instructions tell it to return
 * `{ batch, translations }` and nothing else — deliberately, since the whole
 * safety property below is that the model decides only `html`. Requiring it to
 * echo `targetVersionId` made the documented output shape fail here with
 * "`targetVersionId` undefined is not in content/versions.json", which is a
 * confusing way to say "the runner forgot to tell me". A `targetVersionId` in
 * the file is still honoured, so results that carry one keep working.
 *
 * The result file carries ONLY `{ chapterId, anchorId, html }` per item. Every
 * other field on a `CommentaryItem` — `order`, `label`, `sefariaRef`,
 * `section`, `targetSeif` — is copied byte-for-byte from the Hebrew source
 * here, never from the model. That is the pipeline's safety property: three of
 * those fields are invisible to `validate:content` (it checks neither
 * `section` nor `sefariaRef`, and `label` only for anchored items), so a model
 * quietly altering one would otherwise ship undetected. Keeping them out of the
 * model's reach is what makes it safe to hand a batch to a model nobody here
 * has evaluated.
 *
 * Checks before writing anything (all-or-nothing per file):
 *  - every requested item is present, exactly once, and no extras
 *  - `html` is non-empty and is not still Hebrew (untranslated passthrough)
 *  - the source item exists and is unambiguous
 *
 * Then: writes the files, adds the version to each chapter's ToC entry, and
 * re-derives the split ToC files — the same three-step sequence
 * `migrate-consolidate-qa.ts` uses, in the same order. Writing files without
 * the ToC update (or the reverse) fails `checkTocFileCrossReferences`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chapterLayerFileSchema,
  tocSchema,
  versionsFileSchema,
  type ChapterLayerFile,
  type CommentaryItem,
} from "../shared/types/content.ts";
import { writeTocSplitFiles } from "./lib/toc-splits.ts";

const CONTENT_ROOT = fileURLToPath(new URL("../content", import.meta.url));

const arg = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

const resultPath = arg("--file");
const isDryRun = process.argv.includes("--dry-run");

const targetFlag = arg("--target");

if (!resultPath) {
  console.error(
    "usage: pnpm translate:apply --file <result>.json [--target <versionId>] [--dry-run]",
  );
  process.exit(2);
}

interface TranslationResult {
  batch?: string;
  targetVersionId?: string;
  translations: { chapterId: string; anchorId: string; html: string }[];
}

const result = JSON.parse(
  readFileSync(resultPath, "utf8"),
) as TranslationResult;

if (!Array.isArray(result.translations) || result.translations.length === 0) {
  console.error(`${resultPath}: no \`translations\` array, or it is empty.`);
  process.exit(1);
}

const versions = versionsFileSchema.parse(
  JSON.parse(readFileSync(join(CONTENT_ROOT, "versions.json"), "utf8")),
);

// The flag wins over the file: the runner knows which version it is filling,
// and a result file that names a different one is a mistake, not an override.
const targetVersionId = targetFlag ?? result.targetVersionId;
const targetVersion = versions.find((v) => v.id === targetVersionId);
if (!targetVersion) {
  console.error(
    targetVersionId === undefined
      ? `${resultPath}: no target version. Pass \`--target <versionId>\` (e.g. --target en-ai), which is what the batch manifest's \`targetVersionId\` names.`
      : `${resultPath}: target version ${JSON.stringify(targetVersionId)} is not in content/versions.json.`,
  );
  process.exit(1);
}

const sourceVersionId = targetVersion.translatedFrom ?? "he-jerusalem-1956";

/** Hebrew letters. An item that comes back still full of them was not translated. */
const HEBREW = /[֐-׿]/g;

const errors: string[] = [];

const byChapter = new Map<string, { anchorId: string; html: string }[]>();
for (const entry of result.translations) {
  if (!entry?.chapterId || !entry?.anchorId) {
    errors.push(
      `an entry is missing chapterId or anchorId: ${JSON.stringify(entry)}`,
    );
    continue;
  }
  const list = byChapter.get(entry.chapterId) ?? [];
  list.push({ anchorId: entry.anchorId, html: entry.html });
  byChapter.set(entry.chapterId, list);
}

interface PendingWrite {
  path: string;
  chapterId: string;
  file: ChapterLayerFile<CommentaryItem>;
  added: number;
}

const pending: PendingWrite[] = [];

for (const [chapterId, translations] of byChapter) {
  const [partId, slug] = chapterId.split("/");
  const dir = join(
    CONTENT_ROOT,
    "parts",
    partId as string,
    "chapters",
    slug as string,
  );
  const sourcePath = join(dir, `commentary.${sourceVersionId}.json`);

  if (!existsSync(sourcePath)) {
    errors.push(
      `${chapterId}: no ${sourceVersionId} commentary file to copy structure from`,
    );
    continue;
  }

  const parsedSource = chapterLayerFileSchema.parse(
    JSON.parse(readFileSync(sourcePath, "utf8")),
  );
  if (parsedSource.layer !== "commentary") continue;
  const sourceByAnchor = new Map(
    parsedSource.items.map((item) => [item.anchorId, item]),
  );

  const targetPath = join(dir, `commentary.${targetVersion.id}.json`);
  const existing = existsSync(targetPath)
    ? chapterLayerFileSchema.parse(JSON.parse(readFileSync(targetPath, "utf8")))
    : null;
  const items: CommentaryItem[] =
    existing?.layer === "commentary" ? [...existing.items] : [];
  const alreadyPresent = new Set(items.map((item) => item.anchorId));

  const seen = new Set<string>();
  let added = 0;

  for (const { anchorId, html } of translations) {
    if (seen.has(anchorId)) {
      errors.push(`${chapterId}: ${anchorId} returned more than once`);
      continue;
    }
    seen.add(anchorId);

    const sourceItem = sourceByAnchor.get(anchorId);
    if (!sourceItem) {
      errors.push(
        `${chapterId}: ${anchorId} does not exist in ${sourceVersionId}`,
      );
      continue;
    }
    if (alreadyPresent.has(anchorId)) {
      errors.push(
        `${chapterId}: ${anchorId} is already translated — refusing to overwrite`,
      );
      continue;
    }
    if (typeof html !== "string" || html.trim().length === 0) {
      errors.push(`${chapterId}: ${anchorId} has empty html`);
      continue;
    }
    // A stray Hebrew word (a quoted term) is fine; a body that is still
    // mostly Hebrew is untranslated passthrough.
    const hebrewChars = (html.match(HEBREW) ?? []).length;
    if (hebrewChars > html.replace(/<[^>]+>/g, "").length * 0.3) {
      errors.push(
        `${chapterId}: ${anchorId} looks untranslated (${hebrewChars} Hebrew characters)`,
      );
      continue;
    }

    // Everything but `html` is copied verbatim — see the module doc.
    items.push({ ...sourceItem, html });
    added++;
  }

  if (added === 0) continue;

  items.sort((a, b) => a.order - b.order);

  pending.push({
    path: targetPath,
    chapterId,
    added,
    file: {
      chapterId,
      layer: "commentary",
      versionId: targetVersion.id,
      ...(parsedSource.sefariaRef
        ? { sefariaRef: parsedSource.sefariaRef }
        : {}),
      items,
    },
  });
}

if (errors.length > 0) {
  console.error(`${errors.length} problem(s) — nothing written:\n`);
  for (const error of errors) console.error(`  ✖ ${error}`);
  process.exit(1);
}

if (pending.length === 0) {
  console.log("Nothing to write — every translation was already present.");
  process.exit(0);
}

for (const write of pending) {
  const relative = write.path.slice(CONTENT_ROOT.length + 1);
  console.log(
    `${isDryRun ? "would write" : "wrote"} ${relative} (+${write.added} items)`,
  );
  if (!isDryRun) {
    writeFileSync(
      write.path,
      `${JSON.stringify(write.file, null, 2)}\n`,
      "utf8",
    );
  }
}

// The ToC must name every file on disk and vice versa — one without the other
// fails `checkTocFileCrossReferences`. Splits are re-derived from the updated
// toc.json, never hand-edited.
const tocPath = join(CONTENT_ROOT, "toc.json");
const toc = tocSchema.parse(JSON.parse(readFileSync(tocPath, "utf8")));
const touched = new Set(pending.map((write) => write.chapterId));
let tocChanged = 0;

for (const volume of toc.volumes) {
  for (const part of volume.parts) {
    for (const chapter of part.chapters) {
      if (!touched.has(chapter.id)) continue;
      if (!chapter.availableVersions.commentary.includes(targetVersion.id)) {
        chapter.availableVersions.commentary = [
          ...chapter.availableVersions.commentary,
          targetVersion.id,
        ].sort();
        tocChanged++;
      }
      if (!chapter.availableLayers.includes("commentary")) {
        chapter.availableLayers = [
          ...chapter.availableLayers,
          "commentary" as const,
        ].sort();
      }
    }
  }
}

console.log(
  `${isDryRun ? "would update" : "updated"} toc.json for ${tocChanged} chapter(s)`,
);

if (!isDryRun) {
  writeFileSync(tocPath, `${JSON.stringify(toc, null, 2)}\n`, "utf8");
  writeTocSplitFiles(CONTENT_ROOT, toc, versions);
  console.log("re-derived toc.volumes.json + toc.parts/*.json");
}

console.log(
  `\n${isDryRun ? "[dry run] " : ""}${pending.reduce((n, w) => n + w.added, 0)} items across ${pending.length} file(s).` +
    `${isDryRun ? "" : "\nNext: `pnpm validate:content`, then `task check`."}`,
);
