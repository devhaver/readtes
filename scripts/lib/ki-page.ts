/**
 * Block tokenizer and table-of-contents reader for kabbalah.info's library
 * pages (`https://www.kabbalah.info/en/<slug>/`) — Bnei Baruch's own web
 * edition of _The Study of the Ten Sefirot_.
 *
 * A page is a WordPress article: the text lives in
 * `<div class="body-read__content">` as a flat run of sibling `p`/`h3`-`h6`/
 * `li` blocks, and the site chrome (menus, footer) follows it. Two facts
 * about the markup carry all the structure the parsers need:
 *
 * - **The Ari's text is bold.** Every paragraph of a seif is wrapped,
 *   entirely, in `<strong>`; commentary body paragraphs never are. So
 *   `bold` — "every text node sits inside `strong`/`b`" — is the source/
 *   commentary discriminator, independent of which heading level the
 *   editor happened to pick (parts 1-4 use `h5`, parts 5-8 and 16 `p`).
 * - **The commentary is introduced by a marker paragraph** reading
 *   `Inner Light` (parts 1-4) or `Ohr Pnimi` (parts 5+), in any tag.
 */

export interface KiBlock {
  tag: string;
  /** Inner HTML, whitespace-collapsed, `&nbsp;` turned into a space. */
  html: string;
  /** Plain text: tags stripped, entities decoded, whitespace collapsed. */
  text: string;
  /** True when every non-blank text node sits inside `strong`/`b`. */
  bold: boolean;
}

const CONTENT_START = 'class="body-read__content"';

/**
 * The article ends where the site's footer navigation begins. The footer's
 * first `li` is always the "Download The Zohar" link; nothing in the TES
 * text itself is an `li` with that text.
 */
const FOOTER_SENTINELS = new Set(["Download The Zohar", "What Is The Zohar?"]);

const BLOCK_RE = /<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? full;
  });

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, "");

/**
 * Normalizes block inner HTML: `&nbsp;`/U+00A0 and the invisible LTR/RTL
 * marks the site's editor scatters through headings become plain spaces,
 * and runs of whitespace collapse.
 */
export const normalizeKiHtml = (html: string): string =>
  html
    // Typographic entities become their characters; the markup-significant
    // ones (`&amp;` `&lt;` `&gt;` `&quot;`) stay escaped.
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, body: string) =>
      /^(amp|lt|gt|quot|#0*(38|60|62|34)|#x0*(26|3c|3e|22))$/i.test(body)
        ? full
        : decodeEntities(full),
    )
    .replace(/&nbsp;|\u00A0/gi, " ")
    // `<br>___` closes many paragraphs: an editor's divider, not text.
    .replace(/(?:<br\s*\/?>\s*)?_{3,}/g, "")
    // A blank line inside one block (`<br><br>`) is a list's spacing in the
    // editor; rendered, it is an empty line between every item.
    .replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>")
    .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * True when the block's visible text is entirely bold. Removes every
 * `strong`/`b` element (with its content) and checks that no text is left
 * outside them — inline `em`/`span` inside a bold run is fine.
 */
const isEntirelyBold = (html: string): boolean => {
  if (!/<(strong|b)\b/i.test(html)) return false;
  let outside = html;
  let previous: string;
  do {
    previous = outside;
    outside = outside.replace(
      /<(strong|b)\b[^>]*>(?:(?!<\/?(?:strong|b)\b)[\s\S])*<\/\1>/gi,
      "",
    );
  } while (outside !== previous);
  // Marker numerals `<sub>(30)</sub>` and stray punctuation often sit just
  // outside the bold run, and the editor sometimes splits a word across two
  // runs (`perfect</strong>i<strong>on`) — so "bold" means at least 95% of
  // the block's letters are inside one, not every last one.
  const letters = (fragment: string): number =>
    decodeEntities(stripTags(fragment))
      .replace(/\(\d+\)/g, "")
      .replace(/[\s.,;:*\u2026]/g, "").length;
  const total = letters(html);
  return total > 0 && letters(outside) / total <= 0.05;
};

/** Tokenizes a kabbalah.info article page into its body blocks. */
export const parseKiBlocks = (pageHtml: string): KiBlock[] => {
  const start = pageHtml.indexOf(CONTENT_START);
  if (start === -1) {
    throw new Error("kabbalah.info page has no body-read__content container");
  }
  // The article container closes before the page's inline data script;
  // everything after it is site chrome.
  const end = pageHtml.indexOf("<script", start);
  const body = pageHtml.slice(start, end === -1 ? undefined : end);
  const blocks: KiBlock[] = [];

  for (const match of body.matchAll(BLOCK_RE)) {
    const html = normalizeKiHtml(match[2] as string);
    const text = decodeEntities(stripTags(html)).replace(/\s+/g, " ").trim();
    if (text === "") continue;
    if (FOOTER_SENTINELS.has(text)) break;
    blocks.push({
      tag: match[1] as string,
      html,
      text,
      bold: isEntirelyBold(html),
    });
  }

  return blocks;
};

export interface KiTocEntry {
  url: string;
  title: string;
}

const TOC_START = "Table of content";

/**
 * Reads the TES table of contents every article page carries in its
 * sidebar. Entries are deduplicated by URL and kept in page order.
 */
export const parseKiToc = (pageHtml: string): KiTocEntry[] => {
  const start = pageHtml.indexOf(TOC_START);
  if (start === -1)
    throw new Error("kabbalah.info page has no table of contents");
  const end = pageHtml.indexOf(CONTENT_START, start);
  const region = pageHtml.slice(start, end === -1 ? undefined : end);
  const entries: KiTocEntry[] = [];
  const seen = new Set<string>();

  for (const match of region.matchAll(
    /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
  )) {
    const url = match[1] as string;
    const title = decodeEntities(stripTags(match[2] as string))
      .replace(/\s+/g, " ")
      .trim();
    if (!/^Part\s*\d+/.test(title) || seen.has(url)) continue;
    seen.add(url);
    entries.push({ url, title });
  }

  return entries;
};

export type KiPageKind =
  | "chapter"
  | "whole-part"
  | "inner-observation"
  | "qa-terminology"
  | "qa-topics"
  | "cause-and-consequence"
  | "other";

export interface KiPageRef extends KiTocEntry {
  part: number;
  kind: KiPageKind;
  /** 1-based chapter number for `chapter` pages ("Chapter Four" -> 4). */
  chapter?: number;
}

const ORDINALS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
];

/**
 * Classifies a ToC entry by its title. Titles are the site's own and not
 * perfectly regular (`Part 4- Chapter Four`, "Table of Questions and for
 * the Meaning of the Words"), so matching is by keyword, not by template.
 * The landing pages (`Part N - TES`) and the two essays with no Hebrew
 * ground truth to align to (Cause and Consequence's Q&A is matched
 * separately; part 5's "Additional Explanation" is Hebrew-PDF only) are
 * `other`.
 */
export const classifyKiPage = (entry: KiTocEntry): KiPageRef | undefined => {
  const partMatch = /^Part\s*(\d+)\s*-\s*(.*)$/.exec(entry.title);
  if (!partMatch) return undefined;
  const part = Number(partMatch[1]);
  const rest = (partMatch[2] as string).trim().toLowerCase();

  const chapterMatch = /^chapter\s+([a-z]+)$/.exec(rest);
  if (chapterMatch) {
    const index = ORDINALS.indexOf(chapterMatch[1] as string);
    if (index !== -1) {
      return { ...entry, part, kind: "chapter", chapter: index + 1 };
    }
  }
  if (rest.startsWith("inner observation")) {
    return { ...entry, part, kind: "inner-observation" };
  }
  // The essay, not its Q&A table (which sits under "Questions …").
  if (rest === "cause and consequence") {
    return { ...entry, part, kind: "cause-and-consequence" };
  }
  if (rest.includes("cause and consequence") || rest === "tes") {
    return { ...entry, part, kind: "other" };
  }
  if (rest.includes("question")) {
    if (rest.includes("word"))
      return { ...entry, part, kind: "qa-terminology" };
    if (rest.includes("topic")) return { ...entry, part, kind: "qa-topics" };
    return { ...entry, part, kind: "other" };
  }
  if (rest.startsWith("additional explanation")) {
    return { ...entry, part, kind: "other" };
  }
  // Parts 5-8 and 16 publish the whole part as one page titled by its
  // subject ("Part 7 - The Seven Melachim that Died").
  if (part >= 5) return { ...entry, part, kind: "whole-part" };
  return { ...entry, part, kind: "other" };
};

/**
 * Joins a passage's paragraphs. The site prints them as separate blocks;
 * joined with `<br>` they read as one wall of text with ragged line
 * breaks, so each becomes a `tes-para` block the reader spaces like a
 * paragraph. A single paragraph is left bare.
 */
export const kiParagraphs = (paragraphs: string[]): string => {
  const kept = paragraphs.map((p) => p.trim()).filter((p) => p !== "");
  return kept.length <= 1
    ? (kept[0] ?? "")
    : kept.map((p) => `<span class="tes-para">${p}</span>`).join("");
};
