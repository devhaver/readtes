/**
 * Parser for KabbalahMedia's Hebrew whole-part docx dialect (Parts 1-5's
 * PART-node `_full.docx`, verified against the live API — see AGENTS.md
 * "KabbalahMedia import"). Unlike every other KM dialect this importer
 * handles, this document carries NO heading tags at all (`h1`-`h6`) —
 * chapter/seif/commentary structure is conveyed entirely by text
 * conventions: literal chapter-heading paragraphs (`"פרק א'"`), a
 * per-chapter topic list (a `<blockquote>` of `"<ordinal> . <topic
 * text>."` items) that is *also* restated as a standalone paragraph
 * immediately before each seif's own body, `"אור פנימי"` commentary-section
 * headings, and inline single-Hebrew-letter anchor markers embedded
 * directly in the seif's own running prose.
 *
 * IMPORTANT: this module derives structure and alignment **only from the
 * docx itself** — it never reads a chapter's existing Sefaria-imported
 * `he-jerusalem-1956` ground truth, and never stamps a `sefariaRef` onto
 * anything it emits. Anchor ids still use the `op-<order>` convention
 * (a reasonable internal naming already used by the rest of the content
 * model), but `<order>` here numbers this docx's *own* discovery order,
 * not Sefaria's `data-order`. This is a hard boundary: a Sefaria-sourced
 * file existing or not existing for a chapter must never change this
 * dialect's output.
 *
 * Anchor letters use a fixed, cyclical convention independent of any
 * external source: the 22-letter Hebrew alphabet used purely as an
 * ordinal sequence (א, ב, ג, … ק, ר, ש, ת), continuous across a whole
 * chapter (never resetting per seif). An inline anchor letter is matched
 * to its Ohr Pnimi note purely by *identity* — the same letter that
 * appears standalone in the source prose is the letter the corresponding
 * commentary paragraph opens with (`"<letter>) ..."`), walked in the
 * fixed order above, never gematria (that conversion, in
 * `km-anchor-markers.ts`, exists only because non-Hebrew KM translations
 * print the marker as the letter's *numeric value*; this dialect and the
 * source text are both Hebrew, so the letter itself is already the
 * label).
 *
 * The physical book interleaves a source (right) column and an Ohr Pnimi
 * (left) commentary column two-up per page, with a running book-title
 * header atop the source column and a repeated `"אור פנימי"` atop the
 * commentary column on every page. When a paragraph is cut mid-sentence by
 * a page break, its continuation can land *after* one of these page-header
 * reprints even though it is still genuinely the other column's text —
 * verified: Part 1 chapter 1's first seif is interrupted by a page break,
 * a footnote citation, and a running header before its last few anchors
 * continue past a repeated `"אור פנימי"` line that nominally reopened the
 * commentary column. `parseHeChapterBody` resolves this by checking,
 * whenever it is nominally inside a commentary entry, whether the next
 * block contains this chapter's next not-yet-discovered anchor letter (in
 * the fixed alphabet order above); if so, that block is diverted back to
 * the still-open seif's own body instead of the open commentary entry. A
 * seif's own trailing prose *past* its last anchor letter, if a page break
 * happens to relocate it with no anchor left to catch it, has no purely
 * structural signal to recover — a documented, bounded limitation, not a
 * silent guess (see the import report).
 *
 * Verified end-to-end against the live API for Part 1 only (both
 * chapters' full anchor sets align with — as a post-hoc check only, never
 * an input — the existing `he-jerusalem-1956` ground truth). Parts 2-5
 * each have their own further irregularities this parser doesn't resolve
 * (a chapter's topic list can restate two topics inside one merged
 * paragraph — handled, since it's a real structural signal that they
 * share one seif body — but can also restate topics out of the abstract's
 * own declared order, or omit a restatement paragraph entirely, which
 * this parser does not attempt to guess past). A chapter whose structure
 * doesn't resolve cleanly is reported `unmatched`/`structure-unsupported`,
 * never force-parsed.
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type {
  CommentaryItem,
  SourceSegment,
} from "../../shared/types/content.ts";
import { bareHebrewOrdinal, hebrewGematriaValue } from "./hebrew-numerals.ts";

// ---------------------------------------------------------------------------
// Block tokenizing — this dialect additionally needs `<blockquote>` blocks
// (never produced by `km-doc-blocks.ts`'s shared tokenizer, which only keeps
// `h1`-`h6`/`p`) to read a chapter's own topic list, and works from plain
// text throughout (KM's Hebrew whole-part docs wrap almost an entire seif's
// text in `<strong>`, which carries no real semantic meaning here — inline
// tags are dropped rather than preserved; the only markup this dialect ever
// re-adds is its own `<a class="tes-anchor">` anchor links).
// ---------------------------------------------------------------------------

export interface HeDocBlock {
  tag: "p" | "blockquote";
  text: string;
}

const HE_BLOCK_RE = /<(p|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/g;
const HE_TAG_RE = /<[^>]+>/g;

/**
 * Strips tags with the empty string, not a space: every real word boundary
 * in `doc2html`'s output already has its own whitespace (docx hard-wraps
 * one word per line — see module doc), so a tag can only ever sit between
 * two already-separated words. The one exception is an inline emphasis
 * tag splitting a *single* word mid-character (verified: Part 1 has
 * `"בביטוי<span class="underline">י</span>ם"`, one hard-wrapped word with
 * no whitespace around the inner span) — replacing with a space there
 * would fabricate a spurious one-letter "word" that could be
 * misidentified as a standalone anchor token.
 */
const heBlockPlainText = (innerHtml: string): string =>
  innerHtml.replace(HE_TAG_RE, "").replace(/\s+/g, " ").trim();

/** Tokenizes `doc2html` output into flat, tag-stripped `p`/`blockquote` blocks. */
export const parseHeDocBlocks = (rawHtml: string): HeDocBlock[] => {
  const blocks: HeDocBlock[] = [];
  for (const match of rawHtml.matchAll(HE_BLOCK_RE)) {
    const tag = match[1] as "p" | "blockquote";
    const text = heBlockPlainText(match[2] as string);
    if (text.length > 0) blocks.push({ tag, text });
  }
  return blocks;
};

// ---------------------------------------------------------------------------
// Text-convention recognizers
// ---------------------------------------------------------------------------

const HE_BOOK_TITLE_MARKER = "תלמוד עשר הספירות";
const HE_CITATION_MARGIN_MARKER = "עץ חיים";
const HE_CITATION_MARGIN_MAX_WORDS = 8;

/**
 * Running page headers/margin notes — verified noise, never chapter/seif/
 * commentary content: the book-title running header (recurs roughly once
 * per page throughout the document, in varying word order and
 * page-number position), and the short Eitz Chaim cross-reference margin
 * note (also roughly once per page). Every genuine occurrence of "עץ חיים"
 * in the Part 1/2 documents checked is either this short margin note or a
 * footnote citation (handled separately by `isHeFootnoteCitation`) — a
 * *long* paragraph that happens to cite Eitz Chaim inline as real prose is
 * never this short, which is why this is bounded by word count rather than
 * matched unconditionally.
 */
export const isHeRunningHeader = (text: string): boolean => {
  if (text.includes(HE_BOOK_TITLE_MARKER)) return true;
  return (
    text.includes(HE_CITATION_MARGIN_MARKER) &&
    text.split(" ").length <= HE_CITATION_MARGIN_MAX_WORDS
  );
};

export interface HeMarkerMatch {
  letters: string;
  rest: string;
  hadFootnoteMark: boolean;
}

const HE_MARKER_RE = /^(\*)?\s*([א-ת]{1,3})\)\s*([\s\S]*)$/;

/**
 * Matches a seif's or an Ohr Pnimi entry's own opening marker — a Hebrew
 * letter cluster followed by ")" at position 0 (verified: a `letter)`
 * token appearing mid-paragraph is never a marker, only ever prose/
 * citation text, so this only ever matches at a block's very start). An
 * optional leading "*" is that seif/entry's own footnote reference mark;
 * its footnote *content* paragraph has no reliable attachment point (see
 * `isHeFootnoteCitation`) so is dropped rather than reconstructed — the
 * "*" itself is kept as literal text in the assembled body instead.
 */
export const matchHeMarker = (text: string): HeMarkerMatch | undefined => {
  const match = HE_MARKER_RE.exec(text);
  if (!match) return undefined;
  return {
    hadFootnoteMark: match[1] !== undefined,
    letters: match[2] as string,
    rest: (match[3] as string).trim(),
  };
};

/**
 * A standalone footnote-citation paragraph (verified: two of Part 1's four
 * "*"-leading paragraphs are this — the other two are seif/entry openings
 * that happen to also carry a footnote mark, caught by `matchHeMarker`
 * first, since a real marker always immediately follows the "*").
 */
export const isHeFootnoteCitation = (text: string): boolean =>
  text.startsWith("*") && matchHeMarker(text) === undefined;

export const HE_OHR_PNIMI_HEADING = "אור פנימי";
export const HE_INNER_OBSERVATION_HEADING = "הסתכלות פנימית";

const HE_CHAPTER_HEADING_RE = /^פרק\s+([א-ת]{1,3})[׳'"״]?$/;

/** `"פרק א'"` -> `1`. `undefined` for anything else — never guessed. */
export const matchHeChapterHeading = (text: string): number | undefined => {
  const match = HE_CHAPTER_HEADING_RE.exec(text);
  if (!match) return undefined;
  try {
    return hebrewGematriaValue(match[1] as string);
  } catch {
    return undefined;
  }
};

const HE_ABSTRACT_END_RE = /ובו\s+[א-ת]{1,3}[׳'"״]?\s*ענינים:?\s*$/;

/** The chapter's own topic-count abstract sentence, e.g. `"...ובו ה' ענינים:"`. */
export const isHeChapterAbstract = (text: string): boolean =>
  HE_ABSTRACT_END_RE.test(text);

/**
 * Some parts fold the abstract sentence into the topic `<blockquote>`
 * itself instead of restating it as its own preceding paragraph (verified:
 * Part 2 does this, Part 1 doesn't) — this strips a leading
 * `"...ובו X ענינים:"` run from the blockquote's own text before topic
 * parsing, when present.
 */
const HE_ABSTRACT_PREFIX_RE = /^[\s\S]*?ובו\s+[א-ת]{1,3}[׳'"״]?\s*ענינים:\s*/;

const stripEmbeddedAbstractPrefix = (text: string): string => {
  const match = HE_ABSTRACT_PREFIX_RE.exec(text);
  return match ? text.slice(match[0].length) : text;
};

const PUNCTUATION_RE = /[.,:;"'‘’׳״]/g;

/** Strips common punctuation and normalizes whitespace, for comparing two restatements of the same topic/heading that may differ only in punctuation. */
const normalizeForCompare = (text: string): string =>
  text.replace(PUNCTUATION_RE, "").replace(/\s+/g, " ").trim();

/**
 * Finds each topic marker `"<ordinal> . "` (`"א . "`, `"ב . "`, … `"יא .
 * "`) strictly in ascending order (1, 2, 3, …) rather than a blind
 * letter-cluster-plus-period scan — a blind scan false-positives on any
 * short Hebrew word that happens to end a sentence (verified: Part 2's
 * own topic prose contains `"דק."`, "thin", which a bare `[א-ת]{1,3}\.`
 * pattern matches as if it were topic marker "דק"). Searching for the
 * exact expected ordinal string at each step avoids that ambiguity
 * entirely.
 */
export const parseHeTopicHeadings = (blockquoteText: string): string[] => {
  const positions: { start: number; end: number }[] = [];
  let searchFrom = 0;
  let n = 1;
  for (;;) {
    const marker = bareHebrewOrdinal(n);
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const markerRe = new RegExp(`(?:^|(?<=\\s))${escaped}\\s*\\.\\s*`);
    const match = markerRe.exec(blockquoteText.slice(searchFrom));
    if (!match) break;
    const start = searchFrom + (match.index as number);
    const end = start + match[0].length;
    positions.push({ start, end });
    searchFrom = end;
    n += 1;
  }

  return positions.map((position, index) => {
    const itemEnd =
      index + 1 < positions.length
        ? (positions[index + 1] as { start: number }).start
        : blockquoteText.length;
    return blockquoteText.slice(position.end, itemEnd).trim();
  });
};

/**
 * Returns how many of `topicHeadings[fromIndex:]`, concatenated together,
 * this single paragraph restates (0 if it doesn't restate even the next
 * one). Two topics squeezed into one docx paragraph with no separating
 * blank line — verified in Part 2 — is itself a structural signal, purely
 * from the document's own formatting, that they share a single underlying
 * seif body; it is not a guess about content.
 */
export const matchTopicHeadingRun = (
  text: string,
  topicHeadings: readonly string[],
  fromIndex: number,
): number => {
  if (fromIndex >= topicHeadings.length) return 0;
  const candidate = normalizeForCompare(text);

  let joined = "";
  for (let index = fromIndex; index < topicHeadings.length; index += 1) {
    const piece = topicHeadings[index] as string;
    joined = joined.length > 0 ? `${joined} ${piece}` : piece;
    const normalizedJoined = normalizeForCompare(joined);
    if (normalizedJoined === candidate) return index - fromIndex + 1;
    if (!candidate.startsWith(normalizedJoined)) return 0;
  }
  return 0;
};

// ---------------------------------------------------------------------------
// Chapter-body structural parse
// ---------------------------------------------------------------------------

/**
 * The 22-letter Hebrew alphabet used purely as a repeating ordinal
 * sequence for anchor markers (see module doc) — a fixed internal
 * convention, not read from any external source. A chapter with more than
 * 22 anchors has no defined continuation in this scheme and is reported
 * `unmatched` rather than guessed.
 */
const HEBREW_ANCHOR_ALPHABET = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ז",
  "ח",
  "ט",
  "י",
  "כ",
  "ל",
  "מ",
  "נ",
  "ס",
  "ע",
  "פ",
  "צ",
  "ק",
  "ר",
  "ש",
  "ת",
];

export interface HeAnchorOccurrence {
  /** This anchor's letter, in `HEBREW_ANCHOR_ALPHABET` order. */
  letter: string;
  /** The seif number (1-based within this chapter) whose body this anchor was found embedded in. */
  seif: number;
}

export interface HeChapterParseOk {
  ok: true;
  /** seif number (1-based within the chapter) -> its ordered raw text pieces. */
  seifTexts: Map<number, string[]>;
  /** commentary entry's own printed letter -> its ordered raw text pieces. */
  entryTexts: Map<string, string[]>;
  /** Every inline anchor letter discovered in source text, in discovery (== alphabet) order. */
  anchors: HeAnchorOccurrence[];
}

export interface HeChapterParseFailure {
  ok: false;
  reason: string;
}

export type HeChapterParseResult = HeChapterParseOk | HeChapterParseFailure;

/**
 * Parses one chapter's block range (starting right after its own `"פרק
 * X'"` heading block) into per-seif source text, per-entry commentary
 * text, and the chapter's own inline anchor sequence — entirely from the
 * docx's own text conventions (see module doc). Never reads or requires
 * any chapter ground truth.
 */
export const parseHeChapterBody = (
  blocks: readonly HeDocBlock[],
  startIndex: number,
): HeChapterParseResult => {
  let i = startIndex;

  if (blocks[i]?.tag === "p" && isHeChapterAbstract(blocks[i]?.text ?? "")) {
    i += 1;
  }
  if (blocks[i]?.tag !== "blockquote") {
    return { ok: false, reason: `expected topic blockquote at block ${i}` };
  }
  const topicHeadings = parseHeTopicHeadings(
    stripEmbeddedAbstractPrefix((blocks[i] as HeDocBlock).text),
  );
  i += 1;

  if (topicHeadings.length === 0) {
    return { ok: false, reason: "no topic headings parsed from blockquote" };
  }

  const seifTexts = new Map<number, string[]>();
  const entryTexts = new Map<string, string[]>();
  const anchors: HeAnchorOccurrence[] = [];
  let currentSeif = 0;
  let currentEntryLetter: string | undefined;
  let stream: "source" | "commentary" = "source";
  let topicPointer = 0;
  let nextAnchorIndex = 0;

  const scanForAnchors = (piece: string, seif: number): void => {
    for (const word of piece.split(" ")) {
      if (
        nextAnchorIndex < HEBREW_ANCHOR_ALPHABET.length &&
        word === HEBREW_ANCHOR_ALPHABET[nextAnchorIndex]
      ) {
        anchors.push({ letter: word, seif });
        nextAnchorIndex += 1;
      }
    }
  };

  while (i < blocks.length) {
    const block = blocks[i] as HeDocBlock;
    if (block.tag !== "p") break;
    const text = block.text;

    if (matchHeChapterHeading(text) !== undefined) break;
    if (text === HE_INNER_OBSERVATION_HEADING) break;
    if (isHeRunningHeader(text) || isHeFootnoteCitation(text)) {
      i += 1;
      continue;
    }
    if (text === HE_OHR_PNIMI_HEADING) {
      stream = "commentary";
      i += 1;
      continue;
    }

    const topicRun = matchTopicHeadingRun(text, topicHeadings, topicPointer);
    if (topicRun > 0) {
      topicPointer += topicRun;
      currentSeif += 1;
      seifTexts.set(currentSeif, []);
      stream = "source";
      i += 1;
      continue;
    }

    const marker = matchHeMarker(text);

    if (stream === "source") {
      if (currentSeif === 0) {
        return {
          ok: false,
          reason: `text before this chapter's first seif topic heading at block ${i}: "${text.slice(0, 40)}"`,
        };
      }
      const pieces = seifTexts.get(currentSeif) as string[];
      const piece =
        marker && pieces.length === 0
          ? `${marker.hadFootnoteMark ? "* " : ""}${marker.rest}`
          : text;
      pieces.push(piece);
      scanForAnchors(piece, currentSeif);
      i += 1;
      continue;
    }

    // stream === "commentary": a still-open seif's own continuation can
    // physically land here too (see module doc) — divert it back to source
    // when this block contains this chapter's next not-yet-discovered
    // anchor letter (a marker always takes the branch below instead).
    if (
      !marker &&
      currentSeif > 0 &&
      nextAnchorIndex < HEBREW_ANCHOR_ALPHABET.length &&
      text
        .split(" ")
        .includes(HEBREW_ANCHOR_ALPHABET[nextAnchorIndex] as string)
    ) {
      const pieces = seifTexts.get(currentSeif) as string[];
      pieces.push(text);
      scanForAnchors(text, currentSeif);
      i += 1;
      continue;
    }

    if (marker) {
      currentEntryLetter = marker.letters;
      if (!entryTexts.has(currentEntryLetter)) {
        entryTexts.set(currentEntryLetter, []);
      }
      (entryTexts.get(currentEntryLetter) as string[]).push(
        `${marker.hadFootnoteMark ? "* " : ""}${marker.rest}`,
      );
    } else if (currentEntryLetter !== undefined) {
      (entryTexts.get(currentEntryLetter) as string[]).push(text);
    }
    // else: unattached preface text before this chapter's first commentary
    // entry has opened — structural noise, dropped (mirrors
    // km-chapter-parser.ts's own convention for the same situation).
    i += 1;
  }

  if (topicPointer !== topicHeadings.length) {
    return {
      ok: false,
      reason: `consumed ${topicPointer}/${topicHeadings.length} topic headings before this chapter ended`,
    };
  }

  return { ok: true, seifTexts, entryTexts, anchors };
};

// ---------------------------------------------------------------------------
// Anchor-marker conversion (letter-based — see module doc: no gematria
// conversion needed, the printed marker letter is the anchor's own label)
// ---------------------------------------------------------------------------

interface HeAnchorConversionResult {
  html: string;
  anchors: string[];
}

/**
 * Converts each standalone occurrence of this seif's own anchor letters
 * (in order) into the anchor-link markup `convertAnchorMarkers`
 * (`km-anchor-markers.ts`) produces for every other language, walking
 * `expectedLabels` strictly left to right so a coincidental single-letter
 * token that isn't actually next in sequence is left as plain text.
 */
const convertHeAnchorMarkers = (
  text: string,
  expectedLabels: readonly string[],
  labelToAnchorId: ReadonlyMap<string, string>,
): HeAnchorConversionResult => {
  const anchors: string[] = [];
  let expectedIndex = 0;

  const out = text.split(" ").map((word) => {
    const expected = expectedLabels[expectedIndex];
    if (expected !== undefined && word === expected) {
      const anchorId = labelToAnchorId.get(word) as string;
      anchors.push(anchorId);
      expectedIndex += 1;
      return `<a class="tes-anchor" href="#${anchorId}" data-anchor="${anchorId}">${word}</a>`;
    }
    return word;
  });

  return { html: out.join(" "), anchors };
};

// ---------------------------------------------------------------------------
// Building final SourceSegment[] / CommentaryItem[]
// ---------------------------------------------------------------------------

export interface HeChapterBuildResult {
  segments: SourceSegment[];
  items: CommentaryItem[];
  warnings: string[];
}

const collapseSpaces = (text: string): string => text.replace(/ {2,}/g, " ");

/**
 * Builds this chapter's `he-bb` `SourceSegment[]`/`CommentaryItem[]` from a
 * successful `parseHeChapterBody` result — entirely from what was
 * discovered in the docx, never from any chapter ground truth. An inline
 * anchor letter with no matching Ohr Pnimi entry (or vice versa) is
 * reported and dropped, never guessed. Neither layer ever carries a
 * `sefariaRef` — this dialect has no Sefaria reference to copy, by design.
 */
export const buildHeChapterContent = (
  parsed: HeChapterParseOk,
): HeChapterBuildResult => {
  const warnings: string[] = [];

  const linkedAnchors = parsed.anchors
    .filter(({ letter }, index) => {
      if (parsed.entryTexts.has(letter)) return true;
      warnings.push(
        `anchor #${index + 1} ("${letter}"): no matching Ohr Pnimi entry ("${letter})") found — dropped`,
      );
      return false;
    })
    .map((anchor, index) => ({ ...anchor, order: index + 1 }));

  const labelToAnchorId = new Map(
    linkedAnchors.map(({ letter, order }) => [letter, `op-${order}`]),
  );
  const linkedLetters = new Set(linkedAnchors.map((a) => a.letter));

  for (const letter of parsed.entryTexts.keys()) {
    if (!linkedLetters.has(letter)) {
      warnings.push(
        `Ohr Pnimi entry "${letter})": no matching inline anchor letter found in this chapter's source text — dropped`,
      );
    }
  }

  const segments: SourceSegment[] = [];
  for (const [seifNumber, pieces] of parsed.seifTexts) {
    const expectedLabels = linkedAnchors
      .filter((a) => a.seif === seifNumber)
      .map((a) => a.letter);
    const assembled = collapseSpaces(pieces.join(" "));
    const { html, anchors } = convertHeAnchorMarkers(
      assembled,
      expectedLabels,
      labelToAnchorId,
    );
    segments.push({ n: seifNumber, html: sanitizeHtml(html), anchors });
  }
  segments.sort((a, b) => a.n - b.n);

  const items: CommentaryItem[] = [];
  for (const anchor of linkedAnchors) {
    const pieces = parsed.entryTexts.get(anchor.letter) as string[];
    items.push({
      anchorId: `op-${anchor.order}`,
      order: anchor.order,
      label: { he: anchor.letter, en: String(anchor.order) },
      targetSeif: anchor.seif,
      section: "ohr-pnimi",
      html: sanitizeHtml(collapseSpaces(pieces.join(" "))),
    });
  }

  return { segments, items, warnings };
};
