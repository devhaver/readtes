/**
 * One-off migration for issue #125: rewrites the commentary marker printed in
 * a TRANSLATED source text to the marker its Hebrew original prints, in the
 * convention the translation's own language uses.
 *
 * The defect. `en-ai`'s source html marks its anchors with the note's running
 * position — 1, 2, 3 … 11, 12, 13 — a numbering that appears in no printed
 * edition. The Hebrew it was translated from marks them with the sequential
 * letters (א ב ג … י כ ל …), and every printed translation out of that Hebrew
 * marks them with those letters' gematria values (1 2 3 … 10 20 30 … 400).
 * So the 11th note should print "20", not "11".
 *
 * Verified, not assumed: measured across the committed corpus, the 51 shared
 * anchors where an `en-bb` source and a Hebrew source cover the same chapter
 * agree with the gematria rule on every single one. `en-ai` disagrees on 29,
 * every one of them order 11 or above — exactly where the running ordinal and
 * the gematria value stop coinciding, which is why it went unnoticed. Below
 * order 11 the two are the same number (א=1 … י=10).
 *
 * Why the source html and not the label. #96 and #110 corrected
 * `CommentaryItem.label`, deliberately leaving this alone: a version's own
 * printed marker is ground truth for its own language, so the label was made
 * to follow the text rather than the other way round. That rule is right, and
 * it is exactly why this has to be fixed HERE — the text itself is what is
 * wrong on `en-ai`, and until it changes the label is obliged to keep
 * repeating the invented number back. Run `pnpm migrate:commentary-labels`
 * after this one; the labels then follow on their own.
 *
 * The rule. For every version with a `translatedFrom` naming a Hebrew
 * version, in every chapter where both source files exist: the translation
 * prints `printedMarkerForHebrewLabel` of whatever its original prints for
 * that anchor. Anchors the original does not print, and originals holding no
 * Hebrew letter, are left untouched — there is nothing to derive from. A
 * Hebrew-to-Hebrew translation is skipped outright: it would print the letter
 * itself, and this rule does not describe it.
 *
 * `pnpm migrate:translated-markers [--dry-run]`. Deterministic and
 * idempotent: a second run against unchanged input writes nothing and leaves
 * `git diff` empty. `checkTranslatedSourceMarkers` in `validate-content.ts`
 * enforces the result from here on.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chapterLayerFileSchema,
  versionsFileSchema,
} from "../shared/types/content.ts";
import {
  anchorMarkerOccurrences,
  replaceAnchorMarkers,
} from "../shared/utils/anchorMarkers.ts";
import { printedMarkerForHebrewLabel } from "./lib/hebrew-numerals.ts";

const CONTENT_ROOT = fileURLToPath(new URL("../content", import.meta.url));
const PARTS_ROOT = join(CONTENT_ROOT, "parts");

const isDryRun = process.argv.includes("--dry-run");

/** Every directory holding chapter layer files: `content/parts/<part>/chapters/<chapter>`. */
const chapterDirs = (): string[] => {
  const dirs: string[] = [];
  for (const part of readdirSync(PARTS_ROOT)) {
    const chaptersRoot = join(PARTS_ROOT, part, "chapters");
    if (!statSync(chaptersRoot, { throwIfNoEntry: false })?.isDirectory()) {
      continue;
    }
    for (const chapter of readdirSync(chaptersRoot)) {
      dirs.push(join(chaptersRoot, chapter));
    }
  }
  return dirs.sort();
};

const versions = versionsFileSchema.parse(
  JSON.parse(readFileSync(join(CONTENT_ROOT, "versions.json"), "utf8")),
);
const languageOf = new Map(
  versions.map((version) => [version.id, version.language]),
);

/**
 * The translations this migration has a rule for: out of Hebrew, into
 * something that is not Hebrew.
 */
const translatedPairs = versions.flatMap((version) => {
  if (!version.translatedFrom) return [];
  if (version.language === "he") return [];
  if (languageOf.get(version.translatedFrom) !== "he") return [];
  return [{ versionId: version.id, originalId: version.translatedFrom }];
});

if (translatedPairs.length === 0) {
  console.log("no version translates out of Hebrew — nothing to do");
  process.exit(0);
}

const readJsonFile = (path: string): unknown | null => {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
};

let filesRewritten = 0;
let markersChanged = 0;
const skipped: string[] = [];

for (const dir of chapterDirs()) {
  for (const { versionId, originalId } of translatedPairs) {
    const originalRaw = readJsonFile(join(dir, `source.${originalId}.json`));
    if (originalRaw === null) continue;

    const translatedPath = join(dir, `source.${versionId}.json`);
    // Validated through Zod, written back from what `JSON.parse` produced:
    // `.parse()` returns a new object carrying the schema's key order rather
    // than the file's, which rewrites `"layer"` to a different position in
    // every file it touches — a diff that says nothing, and one the importers
    // flip straight back (the same fault as PR 109).
    const translatedRaw = readJsonFile(translatedPath) as {
      items: { html: string }[];
    } | null;
    if (translatedRaw === null) continue;

    const originalFile = chapterLayerFileSchema.parse(originalRaw);
    const translatedFile = chapterLayerFileSchema.parse(translatedRaw);
    if (originalFile.layer !== "source" || translatedFile.layer !== "source") {
      continue;
    }

    const originalMarkers = anchorMarkerOccurrences(
      originalFile.items.map((segment) => segment.html),
    );
    if (originalMarkers.size === 0) continue;

    const relative = translatedPath.slice(CONTENT_ROOT.length + 1);
    let changedHere = 0;

    const rewritten = replaceAnchorMarkers(
      translatedFile.items.map((segment) => segment.html),
      ({ anchorId, current, occurrence }) => {
        const original = originalMarkers.get(anchorId)?.[occurrence];
        // The original prints this anchor fewer times than the translation
        // does. Nothing says which of its markers this one should carry, so
        // it keeps what it has.
        if (original === undefined) {
          skipped.push(
            `${relative}: anchor "${anchorId}" is printed more times than "${originalId}" prints it, occurrence ${occurrence + 1} left alone`,
          );
          return null;
        }

        const printed = printedMarkerForHebrewLabel(original);
        if (printed === null || printed === current) return null;
        changedHere++;
        return printed;
      },
      ({ anchorId }, inner) => {
        skipped.push(
          `${relative}: anchor "${anchorId}" prints markup (${inner.trim()}), left alone`,
        );
      },
    );

    translatedFile.items.forEach((segment, index) => {
      if (rewritten[index] !== segment.html) {
        translatedRaw.items[index]!.html = rewritten[index] as string;
      }
    });

    if (changedHere === 0) continue;

    markersChanged += changedHere;
    filesRewritten++;
    console.log(
      `${isDryRun ? "would rewrite" : "rewrote"} ${relative} (${changedHere} markers)`,
    );

    if (!isDryRun) {
      writeFileSync(
        translatedPath,
        `${JSON.stringify(translatedRaw, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

for (const note of skipped) console.warn(`skipped: ${note}`);

console.log(
  `\n${isDryRun ? "[dry run] " : ""}${markersChanged} markers in ${filesRewritten} files`,
);
