/**
 * One-off migration for issue #103: rewrites every committed `sefariaRef`
 * that was composed without its node's `index_offsets_by_depth`.
 *
 * The defect. Some Sefaria nodes do not start numbering at 1 — Section VI's
 * topics tables start at 31, Section I's Histaklut Penimit chapter 2 starts
 * at paragraph 10. `sefaria-refs.ts` ignored that until PR #105, so the refs
 * already in `content/` name items that do not exist: verified live, `…List
 * of Questions on Topics 1` is a 404 and `…31` is a 200 carrying exactly the
 * text we stored under the first. Nothing on the site dereferences the
 * field, so this is not a visible defect — but provenance that lands on
 * nothing is provenance that does not work.
 *
 * The rule. **Recompose from position, never from the stored ref.** Parsing
 * the committed ref and adding the offset would be unrunnable twice: the
 * un-offset and offset numbering ranges overlap on 8 of the 16 sections
 * (Section V's topics list holds 160 items against an offset of 42), so
 * "already migrated" and "not yet migrated" are indistinguishable by value.
 * Position is not: an item's place inside its node is a property of the
 * committed tree, and composing a ref from it is exactly what the importer
 * does.
 *
 * Position comes from the file, per node shape:
 *
 * - **depth 1 `[Paragraph]`** (`questions-*`) — the whole node is one
 *   chapter, and the item's own `n` is its paragraph index.
 * - **depth 2 `[Siman, Paragraph]`** (`answers-*`, consolidated by issue #91
 *   into one chapter per part) — `n` is the siman, and an answer's segments
 *   run 1..k within it (`part-01` answer 51 has two).
 * - **depth 2 `[Chapter, Paragraph]`** (`inner-observation`) — the chapter is
 *   the one the file lives in, and the paragraph is the item's position in it.
 *
 * Every one of those is checked rather than trusted. For each item the
 * migration composes the ref BOTH ways and compares against what is
 * committed:
 *
 * - matches the offset composition -> already correct, leave it (this is the
 *   branch a second run takes, which is what makes the script idempotent)
 * - matches the un-offset composition -> the issue #103 defect exactly,
 *   rewrite it
 * - matches neither -> the position model does not describe this item;
 *   report it and change nothing
 *
 * So the script can only ever rewrite a ref it has already reproduced
 * byte-for-byte from position. It cannot invent one.
 *
 * `pnpm migrate:sefaria-refs [--dry-run]`. Offline: the offsets come from
 * the committed `content/sefaria-index-offsets.json`
 * (`pnpm emit:sefaria-offsets` writes it; the importer keeps it current).
 * `checkSefariaRefsApplyIndexOffsets` in `validate-content.ts` enforces the
 * result from here on.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chapterLayerFileSchema,
  type ParsedChapterLayerFile,
  type SefariaOffsetNode,
} from "../shared/types/content.ts";
import {
  readOffsetNodes,
  resolveOffsetNodeRef,
  SEFARIA_OFFSETS_FILE_NAME,
} from "./lib/sefaria-offset-nodes.ts";
import { chapterRefFor, segmentRefFor } from "./lib/sefaria-refs.ts";

const CONTENT_ROOT = fileURLToPath(new URL("../content", import.meta.url));
const PARTS_ROOT = join(CONTENT_ROOT, "parts");

const isDryRun = process.argv.includes("--dry-run");

const offsets = readOffsetNodes(CONTENT_ROOT);
if (offsets === null) {
  console.error(
    `content/${SEFARIA_OFFSETS_FILE_NAME} is missing — run \`pnpm emit:sefaria-offsets\` first. Refusing to guess offsets.`,
  );
  process.exit(1);
}

/** Every directory holding chapter layer files: `content/parts/<part>/chapters/<chapter>`. */
const chapterDirs = (): string[] => {
  const dirs: string[] = [];
  for (const part of readdirSync(PARTS_ROOT).sort()) {
    const chaptersRoot = join(PARTS_ROOT, part, "chapters");
    if (!statSync(chaptersRoot, { throwIfNoEntry: false })?.isDirectory()) {
      continue;
    }
    for (const chapter of readdirSync(chaptersRoot).sort()) {
      dirs.push(join(chaptersRoot, chapter));
    }
  }
  return dirs;
};

/** `inner-observation-03` -> 3. The chapter's own number within its kind. */
const chapterNumberOf = (chapterDir: string): number | undefined => {
  const match = /-(\d+)$/.exec(chapterDir);
  return match ? Number(match[1]) : undefined;
};

interface Position {
  /** 0-based chapter index within the node; `undefined` for a single implicit chapter. */
  chapterIndex: number | undefined;
  /** 1-based item index within that chapter. */
  itemIndex: number;
}

/**
 * Where this item sits inside its Sefaria node, from the committed tree
 * alone — see the module doc for the three shapes and why each holds.
 * `runningWithin` counts the items already seen under the same key in this
 * file, which is the segment index for both depth-2 shapes.
 */
const positionOf = (
  node: SefariaOffsetNode,
  ordinal: number,
  chapterNumber: number | undefined,
  runningWithin: (key: number) => number,
): Position | null => {
  if (node.depth === 1) return { chapterIndex: undefined, itemIndex: ordinal };

  if (node.sectionNames[0] === "Siman") {
    return { chapterIndex: ordinal - 1, itemIndex: runningWithin(ordinal) };
  }

  if (chapterNumber === undefined) return null;
  return {
    chapterIndex: chapterNumber - 1,
    itemIndex: runningWithin(chapterNumber),
  };
};

const composeRef = (
  refBase: string,
  node: SefariaOffsetNode,
  position: Position,
  applyOffsets: boolean,
): string => {
  const offsetsForNode = applyOffsets ? node.indexOffsetsByDepth : undefined;
  const chapterRef = chapterRefFor(
    refBase,
    position.chapterIndex === undefined ? undefined : position.chapterIndex + 1,
    offsetsForNode,
  );
  return segmentRefFor(
    chapterRef,
    node,
    position.itemIndex,
    offsetsForNode,
    position.chapterIndex ?? 0,
  );
};

let filesRewritten = 0;
let refsChanged = 0;
let refsAlreadyCorrect = 0;
const unexplained: string[] = [];

for (const dir of chapterDirs()) {
  const chapterNumber = chapterNumberOf(dir.slice(dir.lastIndexOf("/") + 1));

  for (const fileName of readdirSync(dir).sort()) {
    if (!/^(source|commentary)\..+\.json$/.test(fileName)) continue;

    const filePath = join(dir, fileName);
    const relative = filePath.slice(CONTENT_ROOT.length + 1);
    const file: ParsedChapterLayerFile = chapterLayerFileSchema.parse(
      JSON.parse(readFileSync(filePath, "utf-8")),
    );
    // Narrows `items` off the layer discriminant — summaries are curated
    // prose with no Sefaria address at all, and the filename filter above
    // has already excluded them.
    if (file.layer === "summary") continue;

    const seenWithin = new Map<number, number>();
    const runningWithin = (key: number): number => {
      const next = (seenWithin.get(key) ?? 0) + 1;
      seenWithin.set(key, next);
      return next;
    };

    let changedHere = 0;

    for (const item of file.items) {
      const committed = "sefariaRef" in item ? item.sefariaRef : undefined;
      if (committed === undefined) continue;

      const resolved = resolveOffsetNodeRef(offsets, committed);
      if (resolved === null) continue;

      const ordinal = "n" in item ? item.n : item.order;
      const position = positionOf(
        resolved.node,
        ordinal,
        chapterNumber,
        runningWithin,
      );
      if (position === null) {
        unexplained.push(`${relative}: ${committed} — no position model`);
        continue;
      }

      const withOffsets = composeRef(
        resolved.refBase,
        resolved.node,
        position,
        true,
      );
      if (committed === withOffsets) {
        refsAlreadyCorrect++;
        continue;
      }

      const withoutOffsets = composeRef(
        resolved.refBase,
        resolved.node,
        position,
        false,
      );
      if (committed !== withoutOffsets) {
        unexplained.push(
          `${relative}: ${committed} — position composes to ${withoutOffsets} (un-offset) / ${withOffsets} (offset), matching neither`,
        );
        continue;
      }

      item.sefariaRef = withOffsets;
      changedHere++;
    }

    if (changedHere === 0) continue;

    refsChanged += changedHere;
    filesRewritten++;
    console.log(
      `${isDryRun ? "would rewrite" : "rewrote"} ${relative} (${changedHere} refs)`,
    );

    if (!isDryRun) {
      writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, "utf-8");
    }
  }
}

for (const note of unexplained) console.warn(`skipped: ${note}`);

console.log(
  `\n${isDryRun ? "[dry run] " : ""}${refsChanged} refs in ${filesRewritten} files rewritten; ${refsAlreadyCorrect} already correct; ${unexplained.length} unexplained`,
);

if (unexplained.length > 0) process.exit(1);
