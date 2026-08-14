/**
 * The second whole-part docx dialect: a document that lost its heading styles
 * in conversion and is a flat run of `<p>` blocks (issue #81).
 *
 * `km-chapter-parser.ts` reads the styled dialect, where an `h5` opens a
 * source item and an `h6` opens its commentary. Part 6's English document has
 * neither — 334 blocks, every one a `p` — and was rejected with "no numbered
 * h5 source items", which took all 56 of the part's chapters down with it. The
 * heading level was never the structure; it was a docx styling accident that
 * survived in some conversions and not others.
 *
 * The structure that IS there:
 *
 *     1. *AK contains AB, SAG, MA, BON, in its self…    <- source seif 1
 *     Inner Light                                        <- section marker
 *     1. AK contains: This study that I have begun…      <- commentary on seif 1
 *     First, we must know which of the Partzufim…        <- continuation
 *     2. As it is in its internality…                    <- source seif 2
 *
 * So each seif number is printed TWICE — once opening the seif, once opening
 * its commentary — and the marker paragraph separates the two. That doubling
 * is what makes the dialect parseable without heading styles: a numbered block
 * is the next SOURCE seif only when its number is the one due next, and every
 * other numbered block belongs to the commentary.
 *
 * Two details that are not guessable and cost real time to find:
 *
 * - **The trailing dot is optional.** Part 6's seif 32 reads `32 *In the
 *   beginning of my studies…` — no dot, because the footnote asterisk follows
 *   the numeral. A `/^(\d+)\.\s/` rule silently stops at seif 31 and returns a
 *   clean, consecutive, half-length parse.
 * - **The marker string is per-document.** Parts 6 and 7 print `Inner Light`;
 *   parts 8 and 16 print the transliterated `Ohr Pnimi`. Both are recognised;
 *   an unlisted one means no commentary boundary is found and the parse is
 *   caught by the count assertion rather than importing commentary as source.
 *
 * Commentary is deliberately NOT returned. The whole-part dialect writes
 * source only — there is no reliable Hebrew/Sefaria commentary target for it
 * (see the `tes-import-kabbalahmedia` skill) — so the commentary blocks are
 * read solely to know where each seif ends.
 *
 * The caller passes the result through `validateNumberedOrderAlignment`
 * against the Hebrew ground truth, so a document this misreads fails loudly
 * instead of importing. That check is the reason this parser is safe to run at
 * all: part 8's document opens with a page-number table of contents whose 94
 * consecutive `N. <page>` lines a leading-number rule will happily eat.
 */
import type { KmSourceItem } from "./km-chapter-parser.ts";
import type { DocBlock } from "./km-doc-blocks.ts";

/**
 * The paragraph that opens a commentary section, by exact text. Bnei Baruch's
 * English editions print either the translated or the transliterated name.
 */
const SECTION_MARKERS = new Set(["Inner Light", "Ohr Pnimi"]);

/** `12.` or `12` — see the module doc on why the dot cannot be required. */
const LEADING_NUMBER_RE = /^\s*(\d+)\.?\s+/;

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const appendHtml = (base: string, addition: string): string =>
  base.length > 0 ? `${base} ${addition}` : addition;

/**
 * True when a flat document has a block opening `"1"` before it opens any
 * other number — the minimum evidence that its seifim are numbered in a
 * sequence this parser can follow. Cheap, and it keeps the styled dialect's
 * documents from being handed here.
 */
export const hasFlatNumberedItems = (blocks: DocBlock[]): boolean =>
  blocks.some((block) => {
    const match = LEADING_NUMBER_RE.exec(stripTags(block.html));
    return match?.[1] === "1";
  });

/**
 * Source items only, numbered `1..n` in document order. An item's html is its
 * opening block with the numeral stripped, plus every following block up to
 * the commentary marker.
 */
export const groupKmFlatWholePartBlocks = (
  blocks: DocBlock[],
): KmSourceItem[] => {
  const items: KmSourceItem[] = [];
  let current: KmSourceItem | undefined;
  let inCommentary = false;

  for (const block of blocks) {
    const text = stripTags(block.html);

    if (SECTION_MARKERS.has(text)) {
      // Everything up to the next due seif number belongs to the commentary.
      inCommentary = true;
      current = undefined;
      continue;
    }

    const match = LEADING_NUMBER_RE.exec(text);
    if (match && Number(match[1]) === items.length + 1) {
      // The numeral is plain text at the start of the block in every document
      // seen, but strip it from the html by the same match rather than
      // assuming that — a leading `<b>` would otherwise leave "1." in the text.
      const htmlMatch = LEADING_NUMBER_RE.exec(block.html);
      current = {
        n: items.length + 1,
        html: htmlMatch
          ? block.html.slice(htmlMatch[0].length)
          : block.html.replace(match[0], ""),
      };
      items.push(current);
      inCommentary = false;
      continue;
    }

    // A block inside a seif and before its commentary marker continues it.
    // Anything inside the commentary is read for its boundary only.
    if (current && !inCommentary) {
      current.html = appendHtml(current.html, block.html);
    }
  }

  return items;
};
