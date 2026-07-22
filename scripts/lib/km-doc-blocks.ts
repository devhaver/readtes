/**
 * Flat block tokenizer for KabbalahMedia's `doc2html` output.
 *
 * The service converts a docx into a flat sequence of sibling block
 * elements (`h1`-`h6`, `p`) — headings/paragraphs never nest inside one
 * another, only inline tags (`strong`, `em`, `sub`, `sup`, `a`, `br`) nest
 * inside those blocks. That makes a simple non-nesting regex scan safe.
 *
 * Every text node in the source is hard-wrapped one "word" per line (an
 * artifact of the docx->HTML conversion) — `normalizeBlockWhitespace`
 * collapses that back into normally-spaced flowing text while leaving
 * inline tags intact.
 */

export interface DocBlock {
  tag: string;
  /** Inner HTML of the block, whitespace-normalized (see module doc). */
  html: string;
}

const BLOCK_RE = /<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/g;

/** Collapses any run of whitespace (including the hard-wrap newlines) to a single space. */
export const normalizeBlockWhitespace = (html: string): string =>
  html.replace(/\s+/g, " ").trim();

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, "");

const NBSP_RE = /&nbsp;|\u00A0/gi;

/** True for a block with no real text content — blank `&nbsp;` spacer paragraphs. */
export const isBlankBlock = (block: DocBlock): boolean =>
  stripTags(block.html).replace(NBSP_RE, "").trim() === "";

/**
 * Tokenizes `doc2html` output into its flat sequence of block elements,
 * normalizing each block's whitespace and dropping blank spacer blocks.
 */
export const parseDocBlocks = (rawHtml: string): DocBlock[] => {
  const blocks: DocBlock[] = [];

  for (const match of rawHtml.matchAll(BLOCK_RE)) {
    const block: DocBlock = {
      tag: match[1] as string,
      html: normalizeBlockWhitespace(match[2] as string),
    };
    if (!isBlankBlock(block)) blocks.push(block);
  }

  return blocks;
};
