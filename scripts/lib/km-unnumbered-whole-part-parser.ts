/**
 * The third whole-part docx dialect: seifim that are not numbered in the text
 * at all, carried by `h5` blocks, with a `Ohr Pnimi` marker paragraph between
 * each seif and its commentary (issue #81).
 *
 *     <h5> * It is written in the Zohar (Kedoshim) about the secrets…   <- seif
 *     <p>  Ohr Pnimi                                                     <- marker
 *     <p>  Meaning the first seven fallen Melachim…                      <- commentary
 *     <h5> Adam ha Rishon had no part of Olam ha Zeh…                    <- next seif
 *
 * Position carries the alignment here, because nothing else does. That makes
 * it the most dangerous of the three dialects: a single missed or extra seif
 * shifts every chapter after it, silently, and the text still reads like
 * scripture. Two things stand between it and that.
 *
 * **The declared range.** These documents cover part of a part and say so in
 * their front matter — part 16's reads `Items 42-85`, and it holds exactly 44
 * `h5` blocks. `parseDeclaredItemRange` reads that line, and the caller aligns
 * the parse against those chapters rather than the whole part. A document
 * whose declared range and `h5` count disagree is refused: two independent
 * statements of the same fact that must agree, which is precisely what
 * position-based alignment otherwise lacks.
 *
 * **The front matter.** These documents open with a page-number table of
 * contents (part 8's runs 98 blocks). It is `p`, never `h5`, so keying on
 * `h5` steps over it for free — unlike the flat dialect, where it had to be
 * defended against explicitly (`validateTranslationPlausibility`).
 *
 * Note the transliteration: these are Bnei Baruch's OLDER English edition
 * (`Maatzil`, `Melachim`, `Olam Beria`) where parts 6 and 7 import from the
 * newer one (`Emanator`, `the ARI`). Both are official; they read differently.
 */
import type { KmSourceItem } from "./km-chapter-parser.ts";
import type { DocBlock } from "./km-doc-blocks.ts";

/** Same marker paragraphs the flat dialect uses; see `km-flat-whole-part-parser.ts`. */
const SECTION_MARKERS = new Set(["Inner Light", "Ohr Pnimi"]);

/** `Items 42-85` in the front matter — the document's own statement of what it covers. */
const DECLARED_RANGE_RE = /^\s*Items?\s+(\d+)\s*[-–—]\s*(\d+)\s*$/i;

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const appendHtml = (base: string, addition: string): string =>
  base.length > 0 ? `${base} ${addition}` : addition;

export interface DeclaredItemRange {
  /** 1-based first chapter number this document covers. */
  from: number;
  /** 1-based last chapter number, inclusive. */
  to: number;
}

/**
 * The `Items N-M` line, or `undefined` when the document makes no such claim.
 * Only the front matter is searched — the phrase could otherwise appear in
 * running prose.
 */
export const parseDeclaredItemRange = (
  blocks: DocBlock[],
  frontMatterBlocks = 12,
): DeclaredItemRange | undefined => {
  for (const block of blocks.slice(0, frontMatterBlocks)) {
    const match = DECLARED_RANGE_RE.exec(stripTags(block.html));
    if (!match) continue;

    const from = Number(match[1]);
    const to = Number(match[2]);
    if (from >= 1 && to >= from) return { from, to };
  }
  return undefined;
};

/**
 * True when a document carries `h5` seifim that the numbered dialects cannot
 * read — at least one `h5`, and none of them numbered. The second half is
 * what keeps this from stealing documents `km-chapter-parser.ts` handles.
 */
export const hasUnnumberedKmItems = (blocks: DocBlock[]): boolean => {
  const headings = blocks.filter((block) => block.tag === "h5");
  return (
    headings.length > 0 &&
    !headings.some((block) => /^\s*\d+\.?\s/.test(stripTags(block.html)))
  );
};

/**
 * Source items in document order, numbered from `startNumber` — the declared
 * range's first chapter, or 1 when the document covers the whole part.
 *
 * Commentary is read only to know where a seif ends; the whole-part dialects
 * write source alone (see the `tes-import-kabbalahmedia` skill).
 */
export const groupKmUnnumberedWholePartBlocks = (
  blocks: DocBlock[],
  startNumber = 1,
): KmSourceItem[] => {
  const items: KmSourceItem[] = [];
  let current: KmSourceItem | undefined;
  let inCommentary = false;

  for (const block of blocks) {
    if (block.tag === "h5") {
      current = { n: startNumber + items.length, html: block.html };
      items.push(current);
      inCommentary = false;
      continue;
    }

    if (SECTION_MARKERS.has(stripTags(block.html))) {
      inCommentary = true;
      current = undefined;
      continue;
    }

    if (current && !inCommentary) {
      current.html = appendHtml(current.html, block.html);
    }
  }

  return items;
};
