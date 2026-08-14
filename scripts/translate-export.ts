/**
 * Exports translation work as self-contained batch manifests — one JSON file
 * per batch, ready to hand to any model or agent, in any tool, offline.
 *
 * `pnpm translate:export --lang <code> [--part part-05] [--budget 20000] [--out DIR]`
 *
 * The pipeline's contract, and the reason it is split into export/apply:
 * **only the translated `html` ever passes through a model.** `anchorId`,
 * `order`, `label`, `section`, `sefariaRef` and `targetSeif` are copied
 * byte-for-byte from the source file by `translate-apply.ts`. Several of those
 * are invisible to `validate:content` (it never checks `section` or
 * `sefariaRef`), so a model silently corrupting one would ship. Keeping them
 * out of the model's reach is what makes the pipeline safe to run at scale and
 * with a model nobody here has evaluated.
 *
 * Each manifest carries everything a translator needs and nothing it doesn't:
 *
 *  - the binding glossary (entries minus citations, plus conventions and the
 *    resolutions for terms the printed edition contradicts itself on),
 *  - per chapter, the Ari's text in the source language and — where it exists —
 *    the same text already in the target language, as CONTEXT. Ohr Pnimi is a
 *    lemma-based gloss on the seif above it, and it sits next to the target
 *    source text in the reader, so terminology has to match that, not merely
 *    the glossary.
 *  - the items to translate, each keyed by `chapterId` + `anchorId`.
 *
 * Batches are packed by source-prose characters, never item count — the corpus
 * runs 29 to 37,057 characters per item. See `lib/translation-batches.ts`.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chapterLayerFileSchema,
  glossaryIndexFileSchema,
  tocSchema,
  versionsFileSchema,
  type CommentaryItem,
  type SourceSegment,
} from "../shared/types/content.ts";
import {
  packBatches,
  proseLength,
  untranslatedItems,
  type TranslatableChapter,
} from "./lib/translation-batches.ts";

const CONTENT_ROOT = fileURLToPath(new URL("../content", import.meta.url));
const SOURCE_VERSION_ID = "he-jerusalem-1956";
const DEFAULT_BUDGET_CHARS = 20_000;

const arg = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

const targetLanguage = arg("--lang");
if (!targetLanguage) {
  console.error(
    "usage: pnpm translate:export --lang <code> [--part part-05] [--budget 20000] [--out DIR]",
  );
  process.exit(2);
}

const partFilter = arg("--part");
const budgetChars = Number(arg("--budget") ?? DEFAULT_BUDGET_CHARS);
const outDir =
  arg("--out") ??
  fileURLToPath(new URL(`../.translation/${targetLanguage}`, import.meta.url));

const versions = versionsFileSchema.parse(
  JSON.parse(readFileSync(join(CONTENT_ROOT, "versions.json"), "utf8")),
);

/**
 * The version new translations are written to: the target language's `ai`
 * version. Resolved from the registry rather than assumed to be `<lang>-ai`,
 * so a differently-named AI edition still works.
 */
const targetVersion = versions.find(
  (version) => version.language === targetLanguage && version.source === "ai",
);

if (!targetVersion) {
  console.error(
    `No AI version registered for language "${targetLanguage}" in content/versions.json.\n` +
      `Add one before exporting, e.g.:\n\n` +
      JSON.stringify(
        {
          id: `${targetLanguage}-ai`,
          language: targetLanguage,
          direction: targetLanguage === "fa" ? "rtl" : "ltr",
          title: `<Language> (AI translation)`,
          license: "CC0",
          source: "ai",
          translatedFrom: SOURCE_VERSION_ID,
        },
        null,
        2,
      ),
  );
  process.exit(1);
}

/** Every version in the target language, so an item already covered by a human edition is never re-translated. */
const targetLanguageVersionIds = new Set(
  versions.filter((v) => v.language === targetLanguage).map((v) => v.id),
);

const readLayer = (dir: string, fileName: string) => {
  const path = join(dir, fileName);
  if (!existsSync(path)) return null;
  return chapterLayerFileSchema.parse(JSON.parse(readFileSync(path, "utf8")));
};

const toc = tocSchema.parse(
  JSON.parse(readFileSync(join(CONTENT_ROOT, "toc.json"), "utf8")),
);

/** Chapter ids in reading order, so batch ids follow the book rather than the filesystem. */
const chapterIds = toc.volumes
  .flatMap((volume) => volume.parts)
  .filter((part) => !partFilter || part.id === partFilter)
  .flatMap((part) => part.chapters.map((chapter) => chapter.id));

const chapters: TranslatableChapter[] = [];

for (const chapterId of chapterIds) {
  const [partId, slug] = chapterId.split("/");
  const dir = join(
    CONTENT_ROOT,
    "parts",
    partId as string,
    "chapters",
    slug as string,
  );
  if (!existsSync(dir)) continue;

  const source = readLayer(dir, `commentary.${SOURCE_VERSION_ID}.json`);
  if (!source || source.layer !== "commentary") continue;

  // Anything any edition in the target language already covers is done.
  const covered: CommentaryItem[] = [];
  for (const fileName of readdirSync(dir)) {
    const match = /^commentary\.(.+)\.json$/.exec(fileName);
    if (!match || !targetLanguageVersionIds.has(match[1] as string)) continue;
    const existing = readLayer(dir, fileName);
    if (existing?.layer === "commentary") covered.push(...existing.items);
  }

  const items = untranslatedItems(source.items, covered);
  if (items.length === 0) continue;

  const sourceText = readLayer(dir, `source.${SOURCE_VERSION_ID}.json`);
  const targetText = readLayer(dir, `source.${targetVersion.id}.json`);

  chapters.push({
    chapterId,
    items,
    sourceSegments:
      sourceText?.layer === "source"
        ? (sourceText.items as SourceSegment[])
        : [],
    targetSegments:
      targetText?.layer === "source"
        ? (targetText.items as SourceSegment[])
        : null,
  });
}

if (chapters.length === 0) {
  console.log(
    `Nothing to translate for "${targetLanguage}"${partFilter ? ` in ${partFilter}` : ""} — every source item is already covered.`,
  );
  process.exit(0);
}

// The binding terminology contract. The index form is used deliberately: the
// full glossary is 307KB and ~72% of that is citations — evidence a translator
// does not need per batch, and 122 copies of it is 24M characters of repeated
// input. `canonicalEn`, `strategy` and `note` are what bind.
const glossary = glossaryIndexFileSchema.parse(
  JSON.parse(
    readFileSync(join(CONTENT_ROOT, "glossary", "tes-en.index.json"), "utf8"),
  ),
);

const INSTRUCTIONS = [
  `Translate the Ohr Pnimi (Inner Light) commentary items in this batch from Hebrew into ${targetLanguage}.`,
  "",
  "Return JSON of the shape:",
  '  { "batch": "<this batch id>", "translations": [ { "chapterId": "...", "anchorId": "op-N", "html": "..." } ] }',
  "",
  "Rules:",
  "1. Translate ONLY the `html` of each item in `chapters[].items`. Return one entry per item, no more and no fewer.",
  "2. `glossary.entries` is binding: use each term's `canonicalEn` for every occurrence unless its `note` carves out a sense distinction. `strategy` says whether a term is translated, transliterated, or an acronym. `glossary.knownGaps` lists what the glossary does NOT cover.",
  "3. `chapters[].context` is NOT for translation. It is the Ari's text these notes gloss — match its terminology, especially `targetText` where present, since the reader sees it in the pane beside these notes.",
  "4. Preserve inline HTML exactly (`<b>`, `<br>`, `<small>`, quotation marks). The html is rendered, not escaped.",
  "5. Write in Rav Laitman's voice, using Bnei Baruch terminology.",
  "6. Do not add commentary, notes, or bracketed explanations of your own. Bracketed glosses on first use of a transliterated term are the one exception, per the glossary's conventions.",
  "",
  "Everything else about each item — its number, label, target seif, section and reference — is assembled mechanically from the Hebrew source and must NOT be returned.",
].join("\n");

const batches = packBatches(
  chapters,
  budgetChars,
  `${targetLanguage}${partFilter ? `-${partFilter}` : ""}`,
);

mkdirSync(outDir, { recursive: true });

let totalItems = 0;
let totalChars = 0;

for (const batch of batches) {
  const manifest = {
    batch: batch.id,
    targetLanguage,
    targetVersionId: targetVersion.id,
    sourceVersionId: SOURCE_VERSION_ID,
    itemCount: batch.items,
    sourceChars: batch.chars,
    instructions: INSTRUCTIONS,
    glossary: {
      conventions: glossary.conventions,
      knownGaps: glossary.knownGaps,
      entries: glossary.entries,
    },
    chapters: batch.chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      context: {
        sourceText: chapter.sourceSegments.map((s) => ({
          n: s.n,
          html: s.html,
        })),
        targetText:
          chapter.targetSegments?.map((s) => ({ n: s.n, html: s.html })) ??
          null,
      },
      items: chapter.items.map((item) => ({
        anchorId: item.anchorId,
        he: item.html,
      })),
    })),
  };

  writeFileSync(
    join(outDir, `${batch.id}.json`),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  totalItems += batch.items;
  totalChars += batch.chars;
}

const totalProse = chapters.reduce(
  (sum, chapter) =>
    sum + chapter.items.reduce((n, item) => n + proseLength(item.html), 0),
  0,
);

console.log(
  [
    `language        ${targetLanguage} -> ${targetVersion.id}`,
    `chapters        ${chapters.length}`,
    `items           ${totalItems}`,
    `source chars    ${totalChars.toLocaleString()} (${totalProse.toLocaleString()} total prose)`,
    `batches         ${batches.length} (budget ${budgetChars.toLocaleString()} chars)`,
    `written to      ${outDir}`,
    ``,
    `Next: translate each manifest, then \`pnpm translate:apply --file <result>.json --target ${targetVersion.id}\`.`,
  ].join("\n"),
);
