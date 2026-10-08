/**
 * Aligns a kabbalah.info per-chapter page (parts 1-4) to the chapter's
 * Hebrew ground truth, producing `SourceSegment[]` and `CommentaryItem[]`
 * for the official Bnei Baruch English.
 *
 * The page markup is an editor's, not a converter's, and it is not regular
 * enough to parse on its own. Seen on real pages: a numbered chapter
 * synopsis (`1. … 2. … 8.`, one bold paragraph per line) ahead of the real
 * seif 1; seif headings bold on one page and plain on the next; a seif
 * numeral glued to the end of the heading before it (`…not its end2.`);
 * sub-headings in any of `h2`-`h6`.
 *
 * So the parse is **guided by the Hebrew**, which says exactly what must
 * come next: seif `n` and the anchors its text carries, and the commentary
 * items in order with the seif each one explains. A block opens:
 *
 * - **the next seif** when it carries that seif's numeral — and, if the
 *   Hebrew seif has commentary anchors, the printed marker of its first
 *   one, which no synopsis line has — and every commentary item of the
 *   current seif has been seen;
 * - **the next commentary item** when it opens with that item's printed
 *   numeral (the gematria of its Hebrew letter, `… 10, 20, 30 …`) and the
 *   item explains the current seif.
 *
 * Matching is sequential, so the Hebrew alphabet restarting after ת (a
 * chapter's 23rd note is printed `1` again) is not ambiguous here the way a
 * numeral -> anchor lookup table is.
 *
 * Everything else is either text of the open seif/item or a heading. What
 * the walk cannot place is reported; a chapter whose Hebrew is not fully
 * matched is refused by the caller, never written partially.
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type {
  CommentaryItem,
  SourceSegment,
} from "../../shared/types/content.ts";
import { hebrewGematriaValue } from "./hebrew-numerals.ts";
import { kiParagraphs, type KiBlock } from "./ki-page.ts";
import { similarityScorer } from "./ki-similarity-align.ts";

/**
 * The commentary marker, in the languages Bnei Baruch publishes TES in:
 * English prints "Inner Light" or "Ohr Pnimi"; the Russian and Ukrainian
 * documents transliterate it ("Ор пними" / "Ор пнімі").
 */
const MARKER_RE =
  /^(inner light|ohr pnimi|ор пними|ор пнімі|внутренний свет|внутрішнє світло)\s*:?$/i;
/**
 * A leading numeral: `N.` (English), `N)` (Russian and others), or `(N)`
 * (a Russian note), optionally after a footnote asterisk (`* 1)`). The
 * Russian documents also print a stray running count
 * before a seif's own numeral (`1   1) Знай…`), which is skipped.
 */
const LEADING_NUMBER_TEXT_RE =
  /^\s*\*?\s*(?:\d+\s+(?=\d))?(?:(\d+)\s*[.)]|\((\d+)\))(?!\d)/;
/** Leading tags/space, then digits that a tag may split (`1<strong>0.`). */
const LEADING_NUMBER_HTML_RE =
  /^((?:\s|<[^>]+>)*)\*?\s*(?:\d+\s+(?=\d))?(?:\d(?:(?:<[^>]+>)*\d)*((?:<[^>]+>)*)\s*[.)]|\(\d+\)[.:]?)(?!\d)\s*/;
const TRAILING_NUMBER_TEXT_RE = /\D(\d+)\.\s*$/;
const PRINTED_MARKER_RE = /\((\d+)\)/g;

/** True for the paragraph that opens a seif's commentary. */
export const isKiCommentaryMarker = (block: KiBlock): boolean =>
  // The Russian documents dash it: "- Ор пними –".
  // …and the Ukrainian one sometimes glosses it: "Ор пними(пнімі)".
  MARKER_RE.test(
    block.text.replace(/\([^)]*\)/g, "").replace(/^[\s\-–—]+|[\s\-–—]+$/g, ""),
  );

/** The leading `N.` numeral of a block's text, if it has one. */
export const kiLeadingNumber = (block: KiBlock): number | undefined => {
  const match = LEADING_NUMBER_TEXT_RE.exec(block.text);
  return match ? Number(match[1] ?? match[2]) : undefined;
};

/** Removes the leading `N.` numeral from block HTML, keeping any tags that wrap it. */
export const stripKiLeadingNumber = (html: string): string =>
  html
    .replace(LEADING_NUMBER_HTML_RE, "$1$2")
    .replace(/<(strong|b)>\s*<\/\1>/g, "")
    .trim();

/** Drops `strong`/`b` tags (keeping their content) — the Ari's text is rendered unbolded. */
export const unboldKiHtml = (html: string): string =>
  html
    .replace(/<\/?(strong|b)\b[^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim();

/** The printed `(N)` marker numerals in a block, in order. */
const printedMarkers = (text: string): number[] =>
  [...text.matchAll(PRINTED_MARKER_RE)].map((match) => Number(match[1]));

/** The numeral the English edition prints for a Hebrew-labelled note. */
export const printedNumeralFor = (item: CommentaryItem): number => {
  const english = item.label.en;
  if (english !== undefined && /^\d+$/.test(english)) return Number(english);
  const hebrew = item.label.he;
  if (hebrew === undefined) {
    throw new Error(`commentary item ${item.anchorId} has no label`);
  }
  return hebrewGematriaValue(hebrew);
};

export interface KiChapterAlignment {
  segments: SourceSegment[];
  items: CommentaryItem[];
  /** Human-readable reasons this chapter is not a complete, verified match. */
  problems: string[];
  /** Page text the walk could not place (headings, synopsis, stray lines). */
  unplaced: string[];
}

interface OpenSeif {
  n: number;
  parts: string[];
  /** Bold unnumbered blocks — a heading or the seif's tail, decided later. */
  pending: string[];
}

interface OpenItem {
  index: number;
  parts: string[];
}

const plainLength = (html: string): number =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim().length;

/**
 * A bold block this short directly before the next seif is that seif's
 * heading, never the previous seif's tail: headings run 30-120 characters,
 * and a seif paragraph long enough to matter runs well past this.
 */
const HEADING_MAX_CHARS = 160;

/** Below this English/Hebrew length ratio a seif is still missing text. */
const TAIL_RATIO_FLOOR = 1.15;

/** Outside this band a seif's English is not a translation of its Hebrew. */
const SEIF_RATIO_BAND = [0.9, 3] as const;

/** A short line that does not end like a sentence — a heading set as text. */
const isUnpunctuatedHeading = (html: string): boolean => {
  const text = html.replace(/<[^>]*>/g, "").trim();
  return (
    text.length > 0 && text.length <= 250 && !/[.?!:;…"”’»)\]]$/.test(text)
  );
};

const collapseSpaces = (html: string): string =>
  html
    .replace(/ {2,}/g, " ")
    .replace(/\s*<br>\s*/g, "<br>")
    .trim();

/**
 * Converts the seif's printed `(N)` markers into anchor links, matching each
 * one to the first unused anchor of this seif's Hebrew `anchors[]` with that
 * printed numeral (sequential, so a repeated numeral after the alphabet
 * restarts resolves to the later anchor).
 */
const linkSeifMarkers = (
  html: string,
  anchorIds: string[],
  numeralByAnchor: Map<string, number>,
): { html: string; anchors: string[]; unmatched: number[] } => {
  const used = new Set<number>();
  const anchors: string[] = [];
  const unmatched: number[] = [];
  const out = html.replace(
    /(?:<sub>\s*)?\((\d+)\)(?:\s*<\/sub>)?/g,
    (full, digits: string) => {
      const numeral = Number(digits);
      const index = anchorIds.findIndex(
        (id, i) => !used.has(i) && numeralByAnchor.get(id) === numeral,
      );
      if (index === -1) {
        unmatched.push(numeral);
        return full;
      }
      used.add(index);
      const anchorId = anchorIds[index] as string;
      anchors.push(anchorId);
      return ` <a class="tes-anchor" href="#${anchorId}" data-anchor="${anchorId}">${numeral}</a>`;
    },
  );
  return { html: out, anchors: [...new Set(anchors)], unmatched };
};

export const alignKiChapterPage = (
  blocks: KiBlock[],
  heSegments: SourceSegment[],
  heItems: CommentaryItem[],
  /** The document's language; a note is labelled with the numeral it prints there. */
  language = "en",
): KiChapterAlignment => {
  const problems: string[] = [];
  const unplaced: string[] = [];

  if (heItems.some((item) => item.targetSeif === undefined)) {
    return {
      segments: [],
      items: [],
      problems: ["Hebrew commentary has unanchored items"],
      unplaced,
    };
  }

  const numeralByAnchor = new Map(
    heItems.map((item) => [item.anchorId, printedNumeralFor(item)]),
  );
  const seifs: OpenSeif[] = [];
  const opened: OpenItem[] = [];
  let seifIndex = -1;
  let itemIndex = 0;
  let mode: "pre" | "source" | "commentary" | "heading" = "pre";
  let previousText = "";

  const currentSeif = (): OpenSeif | undefined => seifs[seifIndex];

  /**
   * Bold unnumbered blocks after a seif are either its tail or the heading
   * of the next one. A commentary marker after them settles it (tail); the
   * next seif after them does not — a seif with no commentary of its own
   * runs straight into the next one's heading. There the Hebrew decides:
   * blocks are kept as text, in order, while the seif is still clearly
   * shorter than its Hebrew (English runs ~1.3-2.1x the Hebrew's length);
   * what is left over is the heading.
   */
  const settlePending = (asText: boolean): void => {
    const seif = currentSeif();
    if (!seif) return;
    const heLength = plainLength(heSegments[seifIndex]?.html ?? "");
    let length = plainLength(seif.parts.join(" "));
    for (const html of seif.pending) {
      // Punctuation alone (a stray `.` block) finishes the last sentence.
      if (!/\p{L}/u.test(html.replace(/<[^>]*>/g, ""))) {
        const last = seif.parts.length - 1;
        seif.parts[last] = `${seif.parts[last] ?? ""}${unboldKiHtml(html)}`;
        continue;
      }
      // An unpunctuated line right before the next seif is that seif's
      // heading whatever its length — the Russian documents set headings
      // as plain paragraphs, and Russian runs closer to the Hebrew's
      // length than English, so the ratio test alone kept them.
      const keep =
        asText ||
        (heLength > 0 &&
          length / heLength < TAIL_RATIO_FLOOR &&
          plainLength(html) > HEADING_MAX_CHARS &&
          !isUnpunctuatedHeading(html));
      if (keep) {
        seif.parts.push(unboldKiHtml(html));
        length += plainLength(html);
      } else unplaced.push(html);
    }
    seif.pending = [];
  };

  const itemsLeftForCurrentSeif = (): boolean => {
    const seif = currentSeif();
    const next = heItems[itemIndex];
    return (
      seif !== undefined && next !== undefined && next.targetSeif === seif.n
    );
  };

  const opensNextSeif = (block: KiBlock): boolean => {
    const next = heSegments[seifIndex + 1];
    if (!next) return false;
    const number = kiLeadingNumber(block);
    const gluedNumeral = TRAILING_NUMBER_TEXT_RE.exec(previousText);
    const numbered =
      number === next.n ||
      (number === undefined && Number(gluedNumeral?.[1]) === next.n);
    if (!numbered || itemsLeftForCurrentSeif()) return false;

    const firstAnchor = next.anchors?.[0];
    if (firstAnchor === undefined) return true;
    return printedMarkers(block.text)[0] === numeralByAnchor.get(firstAnchor);
  };

  /**
   * Before any commentary, a second bold paragraph with the open seif's
   * own numeral is the real seif and the first was a synopsis line.
   */
  const restartsCurrentSeif = (block: KiBlock): boolean => {
    const seif = currentSeif();
    const he = heSegments[seifIndex];
    if (!seif || !he || mode !== "source") return false;
    if (kiLeadingNumber(block) !== seif.n) return false;
    // A seif with commentary anchors could only have been opened by a block
    // printing its first marker, which a synopsis line never does — so
    // only an anchorless seif can have been opened by one. Its real text is
    // bold, like the synopsis; a plain paragraph here is commentary.
    return (he.anchors ?? []).length === 0 && block.bold;
  };

  const opensNextItem = (block: KiBlock): boolean => {
    const next = heItems[itemIndex];
    const seif = currentSeif();
    return (
      next !== undefined &&
      seif !== undefined &&
      next.targetSeif === seif.n &&
      kiLeadingNumber(block) === numeralByAnchor.get(next.anchorId)
    );
  };

  for (const block of blocks) {
    const text = block.text;

    if (isKiCommentaryMarker(block)) {
      if (currentSeif()) {
        settlePending(true);
        mode = "commentary";
      }
      previousText = text;
      continue;
    }

    if (restartsCurrentSeif(block)) {
      const seif = currentSeif() as OpenSeif;
      unplaced.push(...seif.parts, ...seif.pending);
      seif.parts = [unboldKiHtml(stripKiLeadingNumber(block.html))];
      seif.pending = [];
    } else if (opensNextSeif(block)) {
      // The next seif's section heading, when the document did not style
      // it as one, ends up as the last paragraph of the previous note. It
      // gives itself away: short, and no closing punctuation — a heading,
      // not a sentence.
      const last = opened.at(-1);
      const tail = last?.parts.at(-1);
      if (
        mode === "commentary" &&
        last &&
        tail !== undefined &&
        last.parts.length > 1 &&
        isUnpunctuatedHeading(tail)
      ) {
        unplaced.push(last.parts.pop() as string);
      }
      settlePending(false);
      seifIndex += 1;
      const n = (heSegments[seifIndex] as SourceSegment).n;
      seifs.push({
        n,
        parts: [unboldKiHtml(stripKiLeadingNumber(block.html))],
        pending: [],
      });
      mode = "source";
    } else if (mode === "commentary" && opensNextItem(block)) {
      opened.push({
        index: itemIndex,
        parts: [stripKiLeadingNumber(block.html)],
      });
      itemIndex += 1;
    } else if (mode === "source") {
      const seif = currentSeif() as OpenSeif;
      // Bold or not (headings are plain on some pages), an unnumbered block
      // is the seif's text or the next seif's heading — decided by what
      // follows it (`settlePending`).
      seif.pending.push(block.html);
    } else if (mode === "commentary") {
      const last = opened.at(-1);
      const lastItem = last ? heItems[last.index] : undefined;
      // A section heading ends the notes: bold on kabbalah.info, any
      // heading tag in KabbalahMedia's documents (`h5` there is the Ari's
      // text style, never a note).
      if (block.bold || /^h[1-6]$/.test(block.tag)) {
        mode = "heading";
        unplaced.push(text);
      } else if (last && lastItem?.targetSeif === currentSeif()?.n) {
        last.parts.push(block.html);
      } else {
        unplaced.push(text);
      }
    } else {
      unplaced.push(text);
    }
    previousText = text;
  }
  settlePending(false);

  const segments: SourceSegment[] = [];
  for (const [index, seif] of seifs.entries()) {
    const he = heSegments[index] as SourceSegment;
    const anchors = he.anchors ?? [];
    const linked = linkSeifMarkers(
      kiParagraphs(seif.parts),
      anchors,
      numeralByAnchor,
    );
    if (linked.unmatched.length > 0) {
      problems.push(
        `seif ${seif.n}: printed marker(s) ${linked.unmatched.join(", ")} match no Hebrew anchor`,
      );
    }
    const missing = anchors.filter((id) => !linked.anchors.includes(id));
    if (missing.length > 0) {
      problems.push(
        `seif ${seif.n}: anchor(s) ${missing.join(", ")} not printed`,
      );
    }
    const ratio = plainLength(linked.html) / Math.max(1, plainLength(he.html));
    if (ratio < SEIF_RATIO_BAND[0] || ratio > SEIF_RATIO_BAND[1]) {
      problems.push(
        `seif ${seif.n}: English is ${ratio.toFixed(2)}x its Hebrew — outside ${SEIF_RATIO_BAND.join("-")}`,
      );
    }
    segments.push({
      n: he.n,
      ...(he.sefariaRef ? { sefariaRef: he.sefariaRef } : {}),
      html: collapseSpaces(sanitizeHtml(linked.html)),
      anchors: linked.anchors,
    });
  }
  if (seifs.length !== heSegments.length) {
    problems.push(
      `source: matched ${seifs.length} of ${heSegments.length} Hebrew seifim`,
    );
  }

  const items: CommentaryItem[] = opened.map(({ index, parts }) => {
    const he = heItems[index] as CommentaryItem;
    return {
      anchorId: he.anchorId,
      order: he.order,
      label:
        language in he.label
          ? he.label
          : {
              ...he.label,
              [language]: String(numeralByAnchor.get(he.anchorId) ?? he.order),
            },
      ...(he.sefariaRef ? { sefariaRef: he.sefariaRef } : {}),
      ...(he.targetSeif !== undefined ? { targetSeif: he.targetSeif } : {}),
      section: he.section,
      html: collapseSpaces(sanitizeHtml(kiParagraphs(parts))),
    };
  });
  if (items.length !== heItems.length) {
    problems.push(
      `commentary: matched ${items.length} of ${heItems.length} Hebrew items (next unmatched: ${heItems[itemIndex]?.anchorId ?? "none"})`,
    );
  }

  return { segments, items, problems, unplaced };
};

/**
 * Drops a section heading a page set as a plain paragraph, which the walk
 * cannot tell from a note's last paragraph (kabbalah.info's part 3
 * chapter 5 sets every heading this way). A heading summarises the seif it
 * introduces, so a note's last paragraph that reads more like the NEXT
 * seif (its `en-ai` text) than like the note itself (the note's `en-ai`)
 * is that heading. Needs both references; without them a note is left as
 * it is. Returns the notes, and how many headings were removed.
 */
export const dropLeakedHeadings = (
  items: CommentaryItem[],
  ownReference: (item: CommentaryItem) => string | undefined,
  nextSeifReference: (item: CommentaryItem) => string | undefined,
): { items: CommentaryItem[]; removed: string[] } => {
  const paragraphs = (html: string): string[] =>
    [
      ...html.matchAll(
        /<span class="tes-para">([\s\S]*?)<\/span>(?=<span class="tes-para">|$)/g,
      ),
    ].map((match) => match[1] as string);
  const references = items.flatMap((item) =>
    [ownReference(item), nextSeifReference(item)].filter(
      (text): text is string => text !== undefined,
    ),
  );
  const score = similarityScorer([
    ...references,
    ...items.flatMap((item) => paragraphs(item.html)),
  ]);
  const removed: string[] = [];
  const result = items.map((item) => {
    const parts = paragraphs(item.html);
    const own = ownReference(item);
    const next = nextSeifReference(item);
    const last = parts.at(-1);
    if (parts.length < 2 || !own || !next || last === undefined) return item;
    // A heading never opens with a note's numeral ("300. When Keter…").
    if (/^\s*(?:<[^>]+>\s*)*\d+\s*[.)]/.test(last)) return item;
    const towardNext = score(next, last);
    if (towardNext < LEAK_MIN_SIMILARITY || towardNext <= score(own, last)) {
      return item;
    }
    removed.push(
      `${item.anchorId}: ${last.replace(/<[^>]*>/g, "").slice(0, 80)}`,
    );
    return { ...item, html: kiParagraphs(parts.slice(0, -1)) };
  });
  return { items: result, removed };
};

/** A last paragraph must score at least this against the next seif to be its heading. */
const LEAK_MIN_SIMILARITY = 0.12;
