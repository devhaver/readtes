/**
 * Splits a kabbalah.info whole-part page (parts 5-8 and 16: the part is one
 * long article) into seifim, each with the Ari's text and the Ohr Pnimi
 * notes ("dibburim") printed under it.
 *
 * Shape, from the real pages:
 *
 * - A seif opens with a bold paragraph `N. …` (`42.*` on part 16 — the
 *   footnote asterisk follows the numeral) and runs through further bold
 *   paragraphs.
 * - `Ohr Pnimi` (a marker paragraph) opens its notes. Part 5's first seif
 *   has no marker; there the note simply repeats the seif's numeral.
 * - Each note opens with a heading — the quoted words it explains
 *   (dibbur ha-matchil) — set bold on parts 5-7 and 16 and as an unbolded
 *   `h5` on part 8; the first note of a seif repeats the seif's numeral.
 *   Plain paragraphs after a heading are that note's body.
 *
 * Seifim are numbered consecutively, so a bold `N.` opens a new seif only
 * when `N` is the next number (or this is the first seif); anything else
 * numbered is a note heading quoting the current seif.
 */
import {
  isKiCommentaryMarker,
  kiLeadingNumber,
  stripKiLeadingNumber,
  unboldKiHtml,
} from "./ki-chapter-page.ts";
import type { KiBlock } from "./ki-page.ts";

export interface KiDibbur {
  /** Seif whose notes this sits among. */
  seif: number;
  /** The heading (quoted words), unbolded HTML without its numeral. */
  headHtml: string;
  /** Body paragraphs, HTML. */
  bodyHtml: string[];
}

export interface KiWholePartSeif {
  n: number;
  /** The Ari's text: one entry per paragraph, unbolded, numeral stripped. */
  paragraphs: string[];
  dibburim: KiDibbur[];
}

export interface KiWholePart {
  seifim: KiWholePartSeif[];
  /** Text the walk could not place — reported, never silently dropped. */
  unplaced: string[];
}

const isNoteHeading = (block: KiBlock): boolean =>
  block.bold || block.tag === "h5" || block.tag === "h6";

export const parseKiWholePart = (blocks: KiBlock[]): KiWholePart => {
  const seifim: KiWholePartSeif[] = [];
  const unplaced: string[] = [];
  let current: KiWholePartSeif | undefined;
  let inNotes = false;

  const openNote = (block: KiBlock, seif: KiWholePartSeif): void => {
    seif.dibburim.push({
      seif: seif.n,
      headHtml: unboldKiHtml(stripKiLeadingNumber(block.html)),
      bodyHtml: [],
    });
  };

  for (const block of blocks) {
    if (isKiCommentaryMarker(block)) {
      if (current) inNotes = true;
      continue;
    }

    const number = kiLeadingNumber(block);
    if (block.bold && number !== undefined) {
      if (!current || number === current.n + 1) {
        current = {
          n: number,
          paragraphs: [unboldKiHtml(stripKiLeadingNumber(block.html))],
          dibburim: [],
        };
        seifim.push(current);
        inNotes = false;
        continue;
      }
      if (number === current.n) {
        // The first note repeats its seif's numeral — and on part 5's
        // first seif that repetition is the only sign the notes began.
        inNotes = true;
        openNote(block, current);
        continue;
      }
    }

    if (!current) {
      unplaced.push(block.text);
      continue;
    }

    if (number === current.n) {
      // Some notes open with an unbolded `N.` and no marker before them.
      inNotes = true;
      openNote(block, current);
      continue;
    }

    if (!inNotes) {
      if (block.bold) current.paragraphs.push(unboldKiHtml(block.html));
      else unplaced.push(block.text);
      continue;
    }

    if (isNoteHeading(block)) {
      openNote(block, current);
      continue;
    }
    const note = current.dibburim.at(-1);
    if (note) note.bodyHtml.push(block.html);
    else unplaced.push(block.text);
  }

  return { seifim, unplaced };
};

/** A note as one HTML string: bold heading, then its body paragraphs. */
export const kiDibburHtml = (dibbur: KiDibbur): string => {
  const head = `<strong>${dibbur.headHtml}</strong>`;
  return dibbur.bodyHtml.length > 0
    ? `${head} ${dibbur.bodyHtml.join("<br>")}`
    : head;
};

const plainText = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Cuts the page at the first seif whose text — or any of whose notes — the
 * page also prints elsewhere. Part 8's page is a draft from seif 48 on: it
 * opens 48 with seif 47's text, repeats one placeholder note under a dozen
 * seifim, and drifts out of step with the Hebrew. Nothing at or after the
 * first repetition can be trusted to be where it is printed, so none of it
 * is offered for alignment.
 */
export const truncateAtRepeatedText = (
  seifim: KiWholePartSeif[],
): { kept: KiWholePartSeif[]; cutAt: number | undefined } => {
  const seen = new Map<string, number>();
  let cutAt: number | undefined;
  for (const seif of seifim) {
    const texts = [
      plainText(seif.paragraphs[0] ?? ""),
      ...seif.dibburim.map((dibbur) => plainText(dibbur.headHtml)),
    ].filter((text) => text.length >= 20);
    for (const text of texts) {
      const first = seen.get(text);
      if (first !== undefined && first !== seif.n) {
        cutAt = Math.min(cutAt ?? first, first);
      }
      if (first === undefined) seen.set(text, seif.n);
    }
  }
  return {
    kept: cutAt === undefined ? seifim : seifim.filter((s) => s.n < cutAt),
    cutAt,
  };
};
