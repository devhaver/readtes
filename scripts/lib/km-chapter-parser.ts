/**
 * Groups a chapter's `DocBlock[]` (see `km-doc-blocks.ts`) into numbered
 * source items and numbered commentary paragraphs.
 *
 * Purely structural — no language-specific text matching. It only cares
 * about block *tags* (`h5`/`h6`/`p`) and a leading `"N. "` numeral, so it
 * behaves the same for any language whose doc happens to share this shape
 * (verified so far: KabbalahMedia's English translation only — see
 * `AGENTS.md`/the import report for which other languages' docs use a
 * different shape and are not parsed by this module).
 *
 * Structural rules (verified against the real chapter 1/2 English docs):
 * - An `h5` whose text starts with `"N. "` opens a new source item `N`;
 *   its own text (after stripping the "N. " prefix) is the item's first
 *   chunk of html.
 * - An `h5` with no leading number is a continuation of the current item
 *   (the docx style produced more than one `h5`-styled paragraph for one
 *   logical seif) — its text is appended to the current item.
 * - An `h6` opens a commentary section for the *most recently opened*
 *   source item (`targetSeif`).
 * - Inside a commentary section, a `p` whose text starts with `"N. "`
 *   opens a new commentary paragraph, numbered by the same `N` used for
 *   its inline anchor markers (KabbalahMedia's printed gematria value, see
 *   `hebrew-numerals.ts`) — *not* the item's own 1-based order. A `p` with
 *   no leading number is a continuation of the current commentary
 *   paragraph.
 * - Everything else (`h1`-`h4`, and any `p` outside a commentary section)
 *   is structural noise — chapter/part titles, section sub-headings, the
 *   chapter-topic overview — and is not part of either output.
 */
import type { DocBlock } from "./km-doc-blocks.ts";

const LEADING_NUMBER_RE = /^\s*(\d+)\.\s*/;

export interface LeadingNumberMatch {
  number: number;
  rest: string;
}

/** Detects and strips a leading `"N. "` numeral (any digit count) from block text. */
export const matchLeadingNumber = (
  text: string,
): LeadingNumberMatch | undefined => {
  const match = LEADING_NUMBER_RE.exec(text);
  if (!match) return undefined;
  return {
    number: Number.parseInt(match[1] as string, 10),
    rest: text.slice(match[0].length),
  };
};

export interface KmSourceItem {
  n: number;
  html: string;
}

export interface KmCommentaryParagraph {
  /** The printed numeral this paragraph opened with — a gematria value, not a sequential order. */
  numeral: number;
  html: string;
  /** The source item `n` this paragraph's commentary section belongs to. */
  targetSeif: number;
}

export interface KmChapterStructure {
  items: KmSourceItem[];
  commentaryParagraphs: KmCommentaryParagraph[];
}

const appendHtml = (base: string, addition: string): string =>
  base.length > 0 ? `${base} ${addition}` : addition;

export const groupKmChapterBlocks = (
  blocks: DocBlock[],
): KmChapterStructure => {
  const items: KmSourceItem[] = [];
  const commentaryParagraphs: KmCommentaryParagraph[] = [];
  let currentItem: KmSourceItem | undefined;
  let inCommentarySection = false;

  for (const block of blocks) {
    if (block.tag === "h5") {
      const leading = matchLeadingNumber(block.html);
      if (leading) {
        currentItem = { n: leading.number, html: leading.rest };
        items.push(currentItem);
        inCommentarySection = false;
      } else if (currentItem) {
        currentItem.html = appendHtml(currentItem.html, block.html);
      }
      continue;
    }

    if (block.tag === "h6") {
      inCommentarySection = currentItem !== undefined;
      continue;
    }

    if (block.tag === "p" && inCommentarySection && currentItem) {
      const leading = matchLeadingNumber(block.html);
      if (leading) {
        commentaryParagraphs.push({
          numeral: leading.number,
          html: leading.rest,
          targetSeif: currentItem.n,
        });
      } else if (commentaryParagraphs.length > 0) {
        const last = commentaryParagraphs[
          commentaryParagraphs.length - 1
        ] as KmCommentaryParagraph;
        last.html = appendHtml(last.html, block.html);
      }
      continue;
    }

    // h1-h4, and any `p` outside a commentary section: structural noise, skipped.
  }

  return { items, commentaryParagraphs };
};
