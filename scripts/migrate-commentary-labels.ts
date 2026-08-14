/**
 * One-off migration for issue #96: replaces every anchored commentary item's
 * `label` with the marker its OWN version's source text actually prints.
 *
 * The defect. Both Sefaria and KabbalahMedia import paths set the English
 * label to `String(order)` — the item's running position in the chapter
 * (`transform.ts`, `km-he-whole-part-parser.ts`). That number appears
 * nowhere in the printed book. Bnei Baruch's English edition (verified
 * against their own document, KabbalahMedia `doc2html/vYyXn9gY`, for
 * `part-01/chapter-01`) marks BOTH the Ari's text and its Inner Light list
 * with the gematria values of the Hebrew letters:
 *
 *   1 2 3 4 5 6 7 8 9 10 20 30 40 50 60 70 80 90 100 200 300 400
 *
 * So the 12th note is printed "30" (ל), not "12". The source html we import
 * carries the right value; only the label was invented. Below order 11 the
 * two coincide (א=1 … י=10), which is why it went unnoticed.
 *
 * The rule. For an anchored item, the source html of the SAME version is
 * ground truth — it is the marker the reader sees and clicks. So this
 * derives, never computes: no gematria arithmetic, no assumption about
 * where the sequence restarts. A version with no source file, an item with
 * no marker in it, and every unanchored item (no marker exists to derive
 * from — see `commentaryItemSchema`) are all left untouched.
 *
 * Both keys are rewritten, not just the version's own language.
 *
 * The first pass only corrected the language whose source it had read, which
 * left `label.en` on every Hebrew-version file holding the invented running
 * ordinal — and the KabbalahMedia importer copies `label` verbatim from that
 * Hebrew ground truth, so the wrong value propagated into `en-bb` too and
 * made `import:kabbalahmedia --all` fail its own validation (issue #110).
 *
 * The other key is derived rather than read, because the two are one fact:
 * the printed English marker IS the gematria of the printed Hebrew letter
 * (issue #96). `printedMarkerForHebrewLabel` returns `null` for a label with
 * no Hebrew letter in it — an unanchored item's plain digits — and nothing
 * is derived in that case.
 *
 * `pnpm migrate:commentary-labels [--dry-run]`. Deterministic and
 * idempotent: a second run against unchanged input writes nothing and
 * leaves `git diff` empty. `checkCommentaryLabelMatchesSourceMarker` in
 * `validate-content.ts` enforces the result from here on, so a future
 * import that regresses fails `task check` loudly instead of silently
 * reintroducing invented numbers.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chapterLayerFileSchema,
  versionsFileSchema,
  type CommentaryItem,
} from "../shared/types/content.ts";
import {
  anchorMarkersFromHtml,
  labelNamesMarker,
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

const versionLanguages = new Map(
  versionsFileSchema
    .parse(
      JSON.parse(readFileSync(join(CONTENT_ROOT, "versions.json"), "utf8")),
    )
    .map((version) => [version.id, version.language]),
);

let filesRewritten = 0;
let labelsChanged = 0;
const skipped: string[] = [];

for (const dir of chapterDirs()) {
  for (const fileName of readdirSync(dir).sort()) {
    const match = /^commentary\.(.+)\.json$/.exec(fileName);
    if (!match) continue;

    const versionId = match[1] as string;
    const language = versionLanguages.get(versionId);
    if (!language) {
      skipped.push(
        `${dir}/${fileName}: version "${versionId}" not in versions.json`,
      );
      continue;
    }

    const sourcePath = join(dir, `source.${versionId}.json`);
    const sourceRaw = (() => {
      try {
        return readFileSync(sourcePath, "utf8");
      } catch {
        return null;
      }
    })();
    // No same-version source file means no printed marker to derive from —
    // the commentary is carried in a language whose source text we do not
    // have. Leaving the label alone is the only honest option.
    if (sourceRaw === null) continue;

    const sourceFile = chapterLayerFileSchema.parse(JSON.parse(sourceRaw));
    if (sourceFile.layer !== "source") continue;

    const markers = anchorMarkersFromHtml(
      sourceFile.items.map((segment) => segment.html),
    );
    if (markers.size === 0) continue;

    const commentaryPath = join(dir, fileName);
    // Validated through Zod, written back from what `JSON.parse` produced:
    // `.parse()` returns a new object carrying the schema's key order rather
    // than the file's, which rewrites `"layer"` to a different position in
    // every file it touches — a diff that says nothing, and one the
    // importers flip straight back (the same fault as PR 109).
    const commentaryRaw = JSON.parse(readFileSync(commentaryPath, "utf8")) as {
      items: { label: Record<string, string> }[];
    };
    const commentaryFile = chapterLayerFileSchema.parse(commentaryRaw);
    if (commentaryFile.layer !== "commentary") continue;

    let changedHere = 0;
    // `commentaryFile` is the validated read model; `commentaryRaw.items[i]`
    // is what gets serialised, so every write below goes there by index.
    const labelAt = (index: number): Record<string, string> =>
      commentaryRaw.items[index]!.label;

    for (const [index, item] of (
      commentaryFile.items as CommentaryItem[]
    ).entries()) {
      if (item.targetSeif === undefined) continue;

      const marker = markers.get(item.anchorId);
      if (marker === undefined) continue;
      // A label that already NAMES the marker is left alone, even when it
      // isn't equal to it: `part-02/chapter-01` op-20 carries `"ר וש"` —
      // one note covering two printed letters, where the source prints only
      // the first. Overwriting that with "ר" would delete real information
      // to satisfy a string comparison. Only labels with no relationship to
      // the marker at all (the invented running ordinals) are replaced.
      if (labelNamesMarker(item.label[language], marker)) continue;

      labelAt(index)[language] = marker;
      item.label[language] = marker;
      changedHere++;
    }

    // Second pass: fill in the OTHER language key, which has no source of
    // its own to read.
    //
    // Only on non-English versions. A version's own printed marker is ground
    // truth for its own language — that is the rule the loop above applies
    // and `checkCommentaryLabelMatchesSourceMarker` enforces — so deriving
    // `label.en` on an English version would override the very text the
    // reader sees. (Tried it, when `en-ai`'s source still printed "11" where
    // the Hebrew letter is כ: 29 validation errors. That numbering was a real
    // defect, but a defect in the text — so it was fixed in the text, by
    // `pnpm migrate:translated-markers`, issue #125. The labels then followed
    // from the loop above, which is the whole point of the rule.)
    //
    // On a Hebrew version there is no English source to consult, and the
    // printed English marker is simply the gematria of the printed Hebrew
    // letter (issue #96) — which is where the invented ordinals survived,
    // and what the KabbalahMedia importer then copied verbatim into `en-bb`.
    for (const [index, item] of language === "en"
      ? []
      : (commentaryFile.items as CommentaryItem[]).entries()) {
      const derived = printedMarkerForHebrewLabel(item.label.he ?? "");
      if (derived === null || item.label.en === derived) continue;

      labelAt(index).en = derived;
      changedHere++;
    }

    if (changedHere === 0) continue;

    labelsChanged += changedHere;
    filesRewritten++;

    const relative = commentaryPath.slice(CONTENT_ROOT.length + 1);
    console.log(
      `${isDryRun ? "would rewrite" : "rewrote"} ${relative} (${changedHere} labels)`,
    );

    if (!isDryRun) {
      writeFileSync(
        commentaryPath,
        `${JSON.stringify(commentaryRaw, null, 2)}\n`,
        "utf8",
      );
    }
  }
}

for (const note of skipped) console.warn(`skipped: ${note}`);

console.log(
  `\n${isDryRun ? "[dry run] " : ""}${labelsChanged} labels in ${filesRewritten} files`,
);
