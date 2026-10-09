/**
 * Bnei Baruch's official translations of the Introduction to the Study of the
 * Ten Sefirot, aligned to the 443 Hebrew segments of `part-01/introduction-01`.
 *
 * The Introduction is not part of KabbalahMedia's TES collection. It is a
 * stand-alone article (`OqZMFGHu`, "Baal HaSulam > Prefaces") with one docx per
 * language, so none of the importer's other dialects ever see it. Its shape,
 * measured against the live documents:
 *
 * - **Sections are the hard anchor.** The text is a run of numbered sections,
 *   `1)` … `156)` — Hebrew letters in the Hebrew document, `N)` or `N.` in the
 *   translations. Item 71 is missing from the manuscript, so every edition goes
 *   from 70 to 72 (some print an editor's note between them). Portuguese
 *   prints no numbers at all: it sets each section's first paragraph as an
 *   `<ol start="N"><li>` list item, and Word's list numbering also numbered one
 *   ordinary paragraph "71" — which is why an opener is accepted only when it
 *   carries the number the section sequence expects next, never merely a number.
 * - **Paragraphs are not shared.** The Hebrew document has 454 paragraphs; our
 *   Hebrew (`he-jerusalem-1956`, from Sefaria) has 443 segments that split and
 *   merge them differently; each translation merges and splits them again.
 *
 * So two alignments, each verified before anything is written:
 *
 * - **Stage A — Hebrew paragraph -> our segment.** The two Hebrew texts hold
 *   the same words (19,453 each, measured), so a word diff places every
 *   paragraph; it takes the FIRST segment its words fall in. A paragraph Sefaria
 *   split across two segments keeps its whole translation under the first.
 * - **Stage B — translated paragraph -> Hebrew paragraph, section by section.**
 *   A Gale-Church style monotone DP over character lengths. Within a section
 *   text order is preserved by construction, so a wrong bead can only seat a
 *   paragraph early or late inside its own section.
 *
 * Refusals (a non-`imported` outcome for the whole language — never a guess):
 * the sections are not exactly the expected sequence (a section with no
 * paragraph of its own never opens, so that is this too), the Hebrew document
 * is not the text of our segments, a section is far longer than the rest
 * (duplicated or misnumbered), or too much Hebrew is left without a
 * translation. A section far SHORTER than the rest is Bnei Baruch's own
 * abridgement: it is placed whole under its first segment, with a warning.
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type { SourceSegment } from "../../shared/types/content.ts";
import { hebrewGematriaValue } from "./hebrew-numerals.ts";
import { decodeEntities, kiParagraphs, normalizeKiHtml } from "./ki-page.ts";

/** KabbalahMedia's content unit for the Introduction, outside the TES collection tree. */
export const KM_INTRODUCTION_UID = "OqZMFGHu";

/** The one chapter the article is imported into. */
export const KM_INTRODUCTION_CHAPTER_ID = "part-01/introduction-01";

const SECTION_COUNT = 156;
const MISSING_SECTION = 71;

/** The section numbers every edition prints, in order: 1 … 156 without 71. */
export const KM_INTRODUCTION_SECTIONS: readonly number[] = Array.from(
  { length: SECTION_COUNT },
  (_, index) => index + 1,
).filter((number) => number !== MISSING_SECTION);

/** Below this share of identical words, the Hebrew document is not the text our segments hold. */
const MIN_HEBREW_IDENTITY = 0.99;

/** Hebrew paragraphs left without any translation, as a share of all of them. */
const MAX_UNTRANSLATED_SHARE = 0.05;

/**
 * How far a section's translated/Hebrew character ratio may stray from the
 * language's median section, as a multiple of it. It catches a section whose
 * body was duplicated (above `max`: a refusal) or abridged (below `min`: placed
 * whole, with a warning); the opener sequence cannot see either, because the
 * opener is still there.
 *
 * The floor is 0.4, not a rounder 0.5, because real sections sit right on 0.5:
 * sections 31 and 35 quote the Zohar in Aramaic with a Hebrew gloss after every
 * phrase, and a translation renders only the meaning. Measured, the shortest
 * legitimate sections are 0.497 and 0.498 of the median (Turkish and Russian
 * 31); the German, Portuguese and Turkish endings, which abridge section 156,
 * are 0.16, 0.18 and 0.19.
 */
const SECTION_RATIO_BAND = { min: 0.4, max: 2 } as const;

// ---------------------------------------------------------------------------
// Blocks: the document as a flat run of paragraphs
// ---------------------------------------------------------------------------

export interface KmIntroBlock {
  /** Inner html, whitespace-normalized, with footnote references already in the form `sanitizeHtml` reads. */
  html: string;
  /** What a reader sees of `html`; footnote text is left out. */
  text: string;
  /** Position in an ordered list (its `start` plus the item's index) when this paragraph opens a list item. */
  listNumber?: number;
}

/**
 * A paragraph or heading, or the opening/closing tag of a list. The
 * documents hard-wrap one word per line and never nest one block in another,
 * so a lazy scan is safe — the same assumption `km-doc-blocks.ts` makes.
 */
const BLOCK_OR_LIST_TAG_RE =
  /<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>|<(\/?)(ol|ul|li)\b([^>]*)>/gi;

const FOOTNOTES_SECTION_RE =
  /<section\b[^>]*\bclass="footnotes"[^>]*>[\s\S]*?<\/section>/i;
const FOOTNOTE_DEFINITION_RE =
  /<li\b[^>]*\bid="fn(\d+)"[^>]*>([\s\S]*?)<\/li>/gi;
const FOOTNOTE_BACKLINK_RE =
  /<a\b[^>]*\bclass="footnote-back"[^>]*>[\s\S]*?<\/a>/gi;
/** Pandoc's reference: the number links to its definition, and the link or the `<sup>` may be the outer tag. */
const FOOTNOTE_REF_RE =
  /(?:<sup\b[^>]*>\s*)?<a\b(?=[^>]*\bclass="footnote-ref")[^>]*\bhref="#fn(\d+)"[^>]*>[\s\S]*?<\/a>(?:\s*<\/sup>)?/gi;

const plainText = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

/** Each footnote's text by number, from the trailing `<section class="footnotes">`. */
const readFootnoteDefinitions = (rawHtml: string): Map<number, string> => {
  const definitions = new Map<number, string>();
  const section = FOOTNOTES_SECTION_RE.exec(rawHtml)?.[0] ?? "";
  for (const match of section.matchAll(FOOTNOTE_DEFINITION_RE)) {
    const body = (match[2] as string).replace(FOOTNOTE_BACKLINK_RE, "");
    definitions.set(Number(match[1]), plainText(normalizeKiHtml(body)));
  }
  return definitions;
};

/**
 * Turns each reference into the pair `sanitizeHtml` converts to a tooltip —
 * `<sup class="footnote-marker">N</sup><i class="footnote">text</i>` — inline
 * where it stands. A reference whose definition is missing keeps its number.
 */
const convertFootnoteReferences = (
  html: string,
  definitions: ReadonlyMap<number, string>,
): string =>
  html.replace(FOOTNOTE_REF_RE, (_reference, number: string) => {
    const text = definitions.get(Number(number));
    return text === undefined
      ? `<sup>${number}</sup>`
      : `<sup class="footnote-marker">${number}</sup><i class="footnote">${text}</i>`;
  });

const readListStart = (attributes: string): number =>
  Number(/\bstart\s*=\s*"?(\d+)/i.exec(attributes)?.[1] ?? 1);

/**
 * The document's paragraphs and headings in order, minus spacers and the
 * trailing footnotes section (whose definitions are folded in at their
 * references instead). A paragraph that opens an item of an ordered list
 * carries that item's number.
 */
export const parseKmIntroductionBlocks = (rawHtml: string): KmIntroBlock[] => {
  const definitions = readFootnoteDefinitions(rawHtml);
  const body = rawHtml.replace(FOOTNOTES_SECTION_RE, "");
  const blocks: KmIntroBlock[] = [];
  const lists: { ordered: boolean; start: number; items: number }[] = [];
  let opensItem = false;

  for (const match of body.matchAll(BLOCK_OR_LIST_TAG_RE)) {
    if (match[1] !== undefined) {
      const inner = match[2] as string;
      const text = plainText(
        normalizeKiHtml(inner.replace(FOOTNOTE_REF_RE, "")),
      );
      if (text === "") continue;

      const list = lists.at(-1);
      const listNumber =
        opensItem && list?.ordered ? list.start + list.items - 1 : undefined;
      opensItem = false;
      blocks.push({
        html: normalizeKiHtml(convertFootnoteReferences(inner, definitions)),
        text,
        ...(listNumber !== undefined ? { listNumber } : {}),
      });
      continue;
    }

    const closing = match[3] === "/";
    const tag = (match[4] as string).toLowerCase();
    if (tag === "li") {
      const list = lists.at(-1);
      if (!closing && list) list.items += 1;
      opensItem = !closing && list !== undefined;
    } else if (closing) {
      lists.pop();
    } else {
      lists.push({
        ordered: tag === "ol",
        start: readListStart(match[5] as string),
        items: 0,
      });
    }
  }

  return blocks;
};

/** `[Editor's note: item 71 is missing in the manuscript]` — a whole paragraph in square brackets. */
const isEditorsNote = (block: KmIntroBlock): boolean =>
  block.text.startsWith("[") && block.text.endsWith("]");

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export interface KmIntroSection<TBlock> {
  number: number;
  blocks: TBlock[];
}

/**
 * Cuts a document into the sections `expected` names, in order. A paragraph
 * opens a section only if `opens` says it carries the number expected NEXT, so
 * an in-text numbered item never starts a section the sequence is not waiting
 * for, and neither does a paragraph numbered 71 (Word's list numbering gave
 * Portuguese one) — a section the manuscript does not have. Whatever precedes
 * the first section is title and author lines, not text, and is dropped.
 *
 * `problem` names the first section that never opens, which is also every
 * section after it: nothing past a missing opener can be recognised.
 */
export const splitKmIntroductionSections = <TBlock>(
  blocks: readonly TBlock[],
  expected: readonly number[],
  opens: (block: TBlock, number: number) => boolean,
): { sections: KmIntroSection<TBlock>[]; problem?: string } => {
  const sections: KmIntroSection<TBlock>[] = [];
  for (const block of blocks) {
    const next = expected[sections.length];
    if (next !== undefined && opens(block, next)) {
      sections.push({ number: next, blocks: [block] });
    } else {
      sections.at(-1)?.blocks.push(block);
    }
  }

  const missing = expected[sections.length];
  return missing === undefined
    ? { sections }
    : {
        sections,
        problem: `found ${sections.length} of ${expected.length} numbered sections — section ${missing} never opens`,
      };
};

/** `א)` … `קנו)`: the Hebrew document numbers its sections with letters. */
const HEBREW_OPENER_RE = /^([א-ת]{1,3})\s*\)/;

/** `12)`, `12.` or `(12)`: how every translation but Portuguese prints a section number. */
const PRINTED_OPENER_RE = /^\(?(\d{1,3})\s*[).]/;

const opensHebrewSection = (block: KmIntroBlock, number: number): boolean => {
  const letters = HEBREW_OPENER_RE.exec(block.text)?.[1];
  return letters !== undefined && hebrewGematriaValue(letters) === number;
};

const opensTranslatedSection = (
  block: KmIntroBlock,
  number: number,
): boolean => {
  const printed = PRINTED_OPENER_RE.exec(block.text)?.[1];
  return printed !== undefined
    ? Number(printed) === number
    : block.listNumber === number;
};

/**
 * Gives a section's first paragraph the number the document shows beside it.
 * Portuguese shows it as list numbering, which the html does not carry — the
 * numbering is the document's, so it is printed back as `N. ` rather than lost.
 */
const withPrintedNumber = (
  block: KmIntroBlock,
  number: number,
): KmIntroBlock =>
  PRINTED_OPENER_RE.test(block.text)
    ? block
    : {
        ...block,
        html: `${number}. ${block.html}`,
        text: `${number}. ${block.text}`,
      };

// ---------------------------------------------------------------------------
// Stage A: Hebrew paragraphs -> our segments
// ---------------------------------------------------------------------------

/** Hebrew letters only: punctuation, niqqud and the section numerals' brackets are not words. */
const hebrewWords = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((word) => word.replace(/[^א-ת]/g, ""))
    .filter((word) => word !== "");

/**
 * The words two streams share — their longest common subsequence, found by
 * Myers' O(ND) diff — as `matched[i] = j` for the index `i` in `a` (`-1` where
 * `a[i]` has no partner in `b`). `undefined` when the streams differ by more
 * than `maxEdits` insertions plus deletions: the caller only wants a match it
 * can believe, and a diff of unrelated texts is both slow and meaningless.
 */
export const matchSharedWords = (
  a: readonly string[],
  b: readonly string[],
  maxEdits: number,
): Int32Array | undefined => {
  const n = a.length;
  const m = b.length;
  const limit = Math.min(maxEdits, n + m);
  const offset = limit + 1;
  // furthest[offset + k]: the furthest x reached on diagonal k (x - y = k).
  const furthest = new Int32Array(2 * limit + 3);
  const frontiers: Int32Array[] = [];
  const at = (k: number): number => furthest[offset + k] as number;

  for (let d = 0; d <= limit; d += 1) {
    frontiers.push(furthest.slice());
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
      let x = down ? at(k + 1) : at(k - 1) + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }
      furthest[offset + k] = x;
      if (x >= n && y >= m) {
        // Walk the rounds back, keeping every diagonal step: those are the matches.
        const matched = new Int32Array(n).fill(-1);
        let fromX = n;
        let fromY = m;
        for (let round = d; round >= 0; round -= 1) {
          const before = frontiers[round] as Int32Array;
          const diagonal = fromX - fromY;
          const wasDown =
            diagonal === -round ||
            (diagonal !== round &&
              (before[offset + diagonal - 1] as number) <
                (before[offset + diagonal + 1] as number));
          const previousDiagonal = wasDown ? diagonal + 1 : diagonal - 1;
          const previousX =
            round === 0 ? 0 : (before[offset + previousDiagonal] as number);
          const previousY = round === 0 ? 0 : previousX - previousDiagonal;
          while (fromX > previousX && fromY > previousY) {
            fromX -= 1;
            fromY -= 1;
            matched[fromX] = fromY;
          }
          fromX = previousX;
          fromY = previousY;
        }
        return matched;
      }
    }
  }
  return undefined;
};

export interface KmParagraphPlacement {
  /** For each paragraph, the `n` of the first of our segments any of its words falls in. */
  segmentNs: number[];
  /** Matched words over the larger of the two word counts; never below `MIN_HEBREW_IDENTITY`. */
  identity: number;
}

/**
 * Places each Hebrew paragraph in our segments by diffing the two word
 * streams, or `undefined` when fewer than `MIN_HEBREW_IDENTITY` of the words
 * match — then the paragraphs are not the text our segments hold, and no
 * placement of them means anything. A paragraph none of whose words match (a
 * bare numeral, say) sits with the paragraph before it, or the one after if it
 * is first — text order keeps the placement monotone either way.
 */
export const placeParagraphsInSegments = (
  paragraphs: readonly string[],
  segments: readonly SourceSegment[],
): KmParagraphPlacement | undefined => {
  const paragraphWords: string[] = [];
  const paragraphOf: number[] = [];
  paragraphs.forEach((paragraph, index) => {
    for (const word of hebrewWords(paragraph)) {
      paragraphWords.push(word);
      paragraphOf.push(index);
    }
  });
  const segmentWords: string[] = [];
  const segmentOf: number[] = [];
  segments.forEach((segment, index) => {
    for (const word of hebrewWords(plainText(segment.html))) {
      segmentWords.push(word);
      segmentOf.push(index);
    }
  });

  const larger = Math.max(paragraphWords.length, segmentWords.length);
  const maxEdits =
    paragraphWords.length +
    segmentWords.length -
    2 * Math.ceil(MIN_HEBREW_IDENTITY * larger);
  const matched =
    larger > 0 && maxEdits >= 0
      ? matchSharedWords(paragraphWords, segmentWords, maxEdits)
      : undefined;
  if (!matched) return undefined;

  const firstSegment: (number | undefined)[] = paragraphs.map(() => undefined);
  let matchedWords = 0;
  matched.forEach((partner, index) => {
    if (partner === -1) return;
    matchedWords += 1;
    const paragraph = paragraphOf[index] as number;
    const segment = segmentOf[partner] as number;
    const known = firstSegment[paragraph];
    if (known === undefined || segment < known)
      firstSegment[paragraph] = segment;
  });

  const firstPlaced = firstSegment.find((segment) => segment !== undefined);
  let previous = firstPlaced;
  const segmentNs = firstSegment.map((segment) => {
    previous = segment ?? previous;
    return (segments[previous as number] as SourceSegment).n;
  });
  return { segmentNs, identity: matchedWords / larger };
};

// ---------------------------------------------------------------------------
// Stage B: translated paragraphs -> Hebrew paragraphs, within a section
// ---------------------------------------------------------------------------

/** How many Hebrew and how many translated paragraphs a bead pairs up, and what choosing it costs. */
const BEADS = [
  { hebrew: 1, translated: 1, penalty: 0 },
  { hebrew: 2, translated: 1, penalty: 1.5 },
  { hebrew: 1, translated: 2, penalty: 1.5 },
  { hebrew: 3, translated: 1, penalty: 3 },
  { hebrew: 1, translated: 3, penalty: 3 },
  { hebrew: 2, translated: 2, penalty: 2.5 },
  { hebrew: 1, translated: 0, penalty: 6 },
  { hebrew: 0, translated: 1, penalty: 6 },
] as const;

/** A bead pairing nothing on one side costs its penalty plus this much per character it leaves out. */
const UNPAIRED_COST_PER_CHAR = 0.002;

export interface KmAlignedBead {
  hebrewAt: number;
  hebrew: number;
  translatedAt: number;
  translated: number;
}

const prefixSums = (lengths: readonly number[]): number[] => {
  const sums = [0];
  for (const length of lengths) sums.push((sums.at(-1) as number) + length);
  return sums;
};

/**
 * The cheapest monotone pairing of one section's paragraphs, by character
 * length (Gale and Church). A bead's cost is how far the translated length
 * strays from the Hebrew length scaled by this section's own ratio, squared in
 * log space, plus the bead's penalty — so a 1:1 bead is free and each merge or
 * split must earn its keep from the lengths.
 */
export const alignSectionParagraphs = (
  hebrewLengths: readonly number[],
  translatedLengths: readonly number[],
): KmAlignedBead[] => {
  const n = hebrewLengths.length;
  const m = translatedLengths.length;
  const hebrewSums = prefixSums(hebrewLengths);
  const translatedSums = prefixSums(translatedLengths);
  const ratio = (translatedSums[m] as number) / (hebrewSums[n] as number);

  const cost = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(Infinity),
  );
  const via = Array.from({ length: n + 1 }, () =>
    new Array<number | undefined>(m + 1).fill(undefined),
  );
  (cost[0] as number[])[0] = 0;

  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      const here = (cost[i] as number[])[j] as number;
      if (here === Infinity) continue;
      BEADS.forEach((bead, index) => {
        if (i + bead.hebrew > n || j + bead.translated > m) return;
        const hebrewChars =
          (hebrewSums[i + bead.hebrew] as number) - (hebrewSums[i] as number);
        const translatedChars =
          (translatedSums[j + bead.translated] as number) -
          (translatedSums[j] as number);
        const price =
          bead.hebrew > 0 && bead.translated > 0
            ? 8 * Math.log(translatedChars / (ratio * hebrewChars)) ** 2 +
              bead.penalty
            : bead.penalty +
              UNPAIRED_COST_PER_CHAR * (hebrewChars + translatedChars);
        const target = cost[i + bead.hebrew] as number[];
        if (here + price < (target[j + bead.translated] as number)) {
          target[j + bead.translated] = here + price;
          (via[i + bead.hebrew] as (number | undefined)[])[
            j + bead.translated
          ] = index;
        }
      });
    }
  }

  const beads: KmAlignedBead[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const bead = BEADS[(via[i] as (number | undefined)[])[j] as number];
    if (!bead) throw new Error("alignSectionParagraphs: no path to the end");
    i -= bead.hebrew;
    j -= bead.translated;
    beads.push({
      hebrewAt: i,
      hebrew: bead.hebrew,
      translatedAt: j,
      translated: bead.translated,
    });
  }
  return beads.reverse();
};

// ---------------------------------------------------------------------------
// The Hebrew reference, and one language aligned to it
// ---------------------------------------------------------------------------

export interface KmIntroductionRefusal {
  ok: false;
  /** The coverage status the chapter is recorded with for this language. */
  status: "structure-unsupported" | "unmatched";
  reason: string;
}

export interface KmHebrewReference {
  ok: true;
  segments: readonly SourceSegment[];
  /** Each section's Hebrew paragraphs: their lengths, and the segment each is placed in. */
  sections: {
    number: number;
    paragraphs: { length: number; segmentN: number }[];
  }[];
  identity: number;
}

const refuse = (
  status: KmIntroductionRefusal["status"],
  reason: string,
): KmIntroductionRefusal => ({ ok: false, status, reason });

const lengthOf = (text: string): number => Math.max(text.length, 1);

/**
 * Reads the Hebrew document KabbalahMedia publishes beside the translations
 * and places its paragraphs in our segments. Language-independent: done once
 * per run, and a failure here refuses every language.
 */
export const buildKmHebrewReference = (
  hebrewHtml: string,
  segments: readonly SourceSegment[],
): KmHebrewReference | KmIntroductionRefusal => {
  const blocks = parseKmIntroductionBlocks(hebrewHtml).filter(
    (block) => !isEditorsNote(block),
  );
  const { sections, problem } = splitKmIntroductionSections(
    blocks,
    KM_INTRODUCTION_SECTIONS,
    opensHebrewSection,
  );
  if (problem) {
    return refuse("structure-unsupported", `Hebrew document: ${problem}`);
  }

  const paragraphs = sections.flatMap((section) => section.blocks);
  const placement = placeParagraphsInSegments(
    paragraphs.map((paragraph) => paragraph.text),
    segments,
  );
  if (!placement) {
    return refuse(
      "unmatched",
      `Hebrew document shares fewer than ${MIN_HEBREW_IDENTITY * 100}% of its words with our Hebrew segments, so its paragraphs cannot be placed in them`,
    );
  }

  let next = 0;
  return {
    ok: true,
    segments,
    sections: sections.map((section) => ({
      number: section.number,
      paragraphs: section.blocks.map((block) => ({
        length: lengthOf(block.text),
        segmentN: placement.segmentNs[next++] as number,
      })),
    })),
    identity: placement.identity,
  };
};

export interface KmIntroductionImport {
  ok: true;
  segments: SourceSegment[];
  /** How many beads paired this many Hebrew paragraphs with this many translated ones, keyed `"hebrew:translated"`. */
  beads: Record<string, number>;
  /** Sections placed whole because the translation abridges them. */
  warnings: string[];
  /** Translated paragraphs the document holds after its title and notes. */
  paragraphs: number;
}

const medianOf = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
};

const sumOf = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/**
 * How long each section's translation is against its Hebrew, as a multiple of
 * the language's median section. Below `SECTION_RATIO_BAND.min` the section is
 * abridged (Bnei Baruch's own editorial choice: German, Portuguese and Turkish
 * shorten section 156); above `max` it was duplicated or misnumbered.
 */
const relativeSectionLengths = (
  reference: KmHebrewReference,
  sections: readonly KmIntroSection<KmIntroBlock>[],
): number[] => {
  const ratios = reference.sections.map(
    (hebrew, index) =>
      sumOf(
        (sections[index] as KmIntroSection<KmIntroBlock>).blocks.map((block) =>
          lengthOf(block.text),
        ),
      ) / sumOf(hebrew.paragraphs.map((paragraph) => paragraph.length)),
  );
  const median = medianOf(ratios);
  return ratios.map((ratio) => ratio / median);
};

/**
 * Aligns one language's document to the Hebrew reference and writes it as
 * source segments, or refuses. The caller records the refusal and keeps any
 * committed file for the language.
 */
export const alignKmIntroduction = (
  reference: KmHebrewReference,
  translationHtml: string,
): KmIntroductionImport | KmIntroductionRefusal => {
  const blocks = parseKmIntroductionBlocks(translationHtml).filter(
    (block) => !isEditorsNote(block),
  );
  const { sections: opened, problem } = splitKmIntroductionSections(
    blocks,
    KM_INTRODUCTION_SECTIONS,
    opensTranslatedSection,
  );
  if (problem) return refuse("structure-unsupported", problem);

  const sections = opened.map((section) => ({
    ...section,
    blocks: section.blocks.map((block, index) =>
      index === 0 ? withPrintedNumber(block, section.number) : block,
    ),
  }));

  const relative = relativeSectionLengths(reference, sections);
  const tooLong = reference.sections.flatMap((hebrew, index) =>
    (relative[index] as number) > SECTION_RATIO_BAND.max
      ? [`${hebrew.number} (${(relative[index] as number).toFixed(2)}×)`]
      : [],
  );
  if (tooLong.length > 0) {
    return refuse(
      "unmatched",
      `section longer than ${SECTION_RATIO_BAND.max}× this language's median — sections ${tooLong.join(", ")}; duplicated or misnumbered text`,
    );
  }

  const beads: Record<string, number> = {};
  const placed = new Map<number, string[]>();
  const warnings: string[] = [];
  let untranslated = 0;
  let hebrewParagraphs = 0;

  sections.forEach((section, index) => {
    const hebrew = (
      reference.sections[index] as KmHebrewReference["sections"][number]
    ).paragraphs;
    if ((relative[index] as number) < SECTION_RATIO_BAND.min) {
      // Abridged: the Hebrew paragraphs it stands for cannot be told apart, so
      // the whole translation sits under the section's first Hebrew segment.
      const first = (hebrew[0] as { segmentN: number }).segmentN;
      placed.set(first, [
        ...(placed.get(first) ?? []),
        ...section.blocks.map((block) => block.html),
      ]);
      warnings.push(
        `section ${section.number} is abridged (${(relative[index] as number).toFixed(2)}× this language's median length) — its translation is placed whole under the section's first segment`,
      );
      return;
    }
    hebrewParagraphs += hebrew.length;
    const aligned = alignSectionParagraphs(
      hebrew.map((paragraph) => paragraph.length),
      section.blocks.map((block) => lengthOf(block.text)),
    );
    // A translated paragraph with no Hebrew of its own (a 0:1 bead) is seated
    // with the one before it, within its own section: one that opens the
    // section goes to the section's first segment, not across the boundary into
    // the last of the section before (Russian 129 opens with a sentence and
    // three one-line list items, all for one Hebrew paragraph).
    let latestSegmentN = (hebrew[0] as { segmentN: number }).segmentN;
    for (const bead of aligned) {
      const key = `${bead.hebrew}:${bead.translated}`;
      beads[key] = (beads[key] ?? 0) + 1;
      if (bead.translated === 0) {
        untranslated += bead.hebrew;
        continue;
      }
      if (bead.hebrew > 0) {
        latestSegmentN = (hebrew[bead.hebrewAt] as { segmentN: number })
          .segmentN;
      }
      const paragraphs = placed.get(latestSegmentN) ?? [];
      for (const block of section.blocks.slice(
        bead.translatedAt,
        bead.translatedAt + bead.translated,
      )) {
        paragraphs.push(block.html);
      }
      placed.set(latestSegmentN, paragraphs);
    }
  });

  if (untranslated > MAX_UNTRANSLATED_SHARE * hebrewParagraphs) {
    return refuse(
      "unmatched",
      `${untranslated} of ${hebrewParagraphs} Hebrew paragraphs have no translated counterpart — more than ${MAX_UNTRANSLATED_SHARE * 100}%`,
    );
  }

  const hebrewByN = new Map(
    reference.segments.map((segment) => [segment.n, segment]),
  );
  const segments = [...placed.entries()]
    .sort(([left], [right]) => left - right)
    .map(([n, paragraphs]): SourceSegment => {
      const sefariaRef = hebrewByN.get(n)?.sefariaRef;
      return {
        n,
        ...(sefariaRef ? { sefariaRef } : {}),
        html: sanitizeHtml(kiParagraphs(paragraphs)),
        anchors: [],
      };
    });

  return {
    ok: true,
    segments,
    beads,
    warnings,
    paragraphs: sumOf(sections.map((section) => section.blocks.length)),
  };
};
