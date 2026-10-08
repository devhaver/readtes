/**
 * The Q&A tables ("Table of Questions … the Meaning of the Words / Topics")
 * on kabbalah.info, aligned to the corpus's consolidated `questions-*` /
 * `answers-*` chapters (issue #91: one item per answer number `n`; the
 * rare answer split across several Hebrew segments shares an `n`).
 *
 * Two page shapes:
 *
 * - **list** (parts 4, 7): every question, numbered, then every answer,
 *   numbered again from the same first number;
 * - **interleaved** (parts 1, 3): each numbered question followed by its
 *   answer as unnumbered paragraphs.
 *
 * Bnei Baruch numbers a part's two tables straight through (part 4's
 * topics start at 67, after 66 terminology items) where the Hebrew starts
 * each at 1, so pairing is by position, never by numeral. An item opens on
 * the next numeral or a repeat of the current one (the page prints `5.`
 * twice); any other numeral (`1. … 2. …` inside an answer) is text.
 *
 * Answers are written one item per answer `n`, carrying the first Hebrew
 * segment's `sefariaRef` — the same convention as the KabbalahMedia `en-bb`
 * answers (`firstSegmentPerAnswer`).
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type { SourceSegment } from "../../shared/types/content.ts";
import type { KiBlock } from "./ki-page.ts";
import { similarityScorer } from "./ki-similarity-align.ts";

const NUMERAL_RE = /^\s*(\d+)\s*[.)](?!\d)/;
const NUMERAL_HTML_RE =
  /^((?:\s|<[^>]+>)*)\d(?:(?:<[^>]+>)*\d)*((?:<[^>]+>)*)\s*[.)](?!\d)\s*/;

export interface KiQaEntry {
  number: number;
  blocks: KiBlock[];
}

export interface KiQaTable {
  shape: "list" | "interleaved";
  questions: KiQaEntry[];
  answers: KiQaEntry[];
}

const numeralOf = (block: KiBlock): number | undefined => {
  const match = NUMERAL_RE.exec(block.text);
  return match ? Number(match[1]) : undefined;
};

/** Walks numbered entries: opens on the next numeral or a repeat. */
const collectEntries = (blocks: KiBlock[], first: number): KiQaEntry[] => {
  const entries: KiQaEntry[] = [];
  for (const block of blocks) {
    const number = numeralOf(block);
    const last = entries.at(-1);
    const opens =
      number !== undefined &&
      (last === undefined
        ? number === first
        : number === last.number + 1 || number === last.number);
    if (opens) entries.push({ number: number as number, blocks: [block] });
    else if (last) last.blocks.push(block);
  }
  return entries;
};

export const parseKiQaTable = (blocks: KiBlock[]): KiQaTable | undefined => {
  const startIndex = blocks.findIndex((b) => numeralOf(b) !== undefined);
  if (startIndex === -1) return undefined;
  const body = blocks.slice(startIndex);
  const first = numeralOf(body[0] as KiBlock) as number;

  // A list page prints the first numeral again where its answers begin,
  // after an unbroken run of numbered questions.
  let answersAt = -1;
  let previous = first;
  for (let i = 1; i < body.length; i += 1) {
    const number = numeralOf(body[i] as KiBlock);
    if (number === undefined) break;
    if (number === first && previous !== first) {
      answersAt = i;
      break;
    }
    previous = number;
  }

  if (answersAt !== -1) {
    return {
      shape: "list",
      questions: collectEntries(body.slice(0, answersAt), first),
      answers: collectEntries(body.slice(answersAt), first),
    };
  }

  const entries = collectEntries(body, first);
  return {
    shape: "interleaved",
    questions: entries.map((entry) => ({
      number: entry.number,
      blocks: entry.blocks.slice(0, 1),
    })),
    answers: entries.map((entry) => ({
      number: entry.number,
      blocks: entry.blocks.slice(1),
    })),
  };
};

const tidy = (html: string): string =>
  sanitizeHtml(html)
    .replace(/ {2,}/g, " ")
    .replace(/\s*<br>\s*/g, "<br>")
    .trim();

/** An entry as HTML, its numeral dropped. */
export const kiQaEntryHtml = (entry: KiQaEntry): string =>
  tidy(
    entry.blocks
      .map((block, i) =>
        i === 0
          ? block.html.replace(NUMERAL_HTML_RE, "$1$2").trim()
          : block.html,
      )
      .join("<br>"),
  ).replace(/^(<strong>[^<]*<\/strong>)(?=\w)/, "$1 ");

export interface QaTarget {
  /** The Hebrew segments of this question/answer number, in order. */
  segments: SourceSegment[];
  /** `en-ai` html of the same segments joined, if the chapter has `en-ai`. */
  reference: string | null;
}

export type QaVerdict =
  | { status: "imported"; items: SourceSegment[] }
  | { status: "refused"; reason: string };

const plainLength = (html: string): number =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim().length;

/** Outside this band an answer is not a translation of its Hebrew. */
const ANSWER_RATIO_BAND = [0.5, 4] as const;
/** Hebrew shorter than this is a cross-reference; its length says nothing. */
const RATIO_MIN_HEBREW = 100;
/** More isolated failures than this share of a table refuses it. */
const MAX_ISOLATED_FAILURES = 0.1;

/**
 * Pairs entries with Hebrew numbers in order — only when the counts agree.
 * With `verify` (answers, which are long enough to compare), each pair is
 * tested: it scores against its own `en-ai` reference at least as well as
 * against either neighbour's, and is of plausible length. Two failing
 * pairs in a row mean the page is out of step and refuse the table, as do
 * failures beyond `MAX_ISOLATED_FAILURES`.
 */
export const alignQaEntries = (
  entries: KiQaEntry[],
  targets: QaTarget[],
  verify: boolean,
): QaVerdict => {
  if (entries.length !== targets.length) {
    return {
      status: "refused",
      reason: `page has ${entries.length} entries, the Hebrew ${targets.length}`,
    };
  }
  const html = entries.map(kiQaEntryHtml);
  if (html.some((h) => plainLength(h) === 0)) {
    return { status: "refused", reason: "an entry has no text" };
  }

  if (verify) {
    const references = targets.map((t) => t.reference);
    if (references.some((r) => r === null)) {
      return { status: "refused", reason: "no en-ai reference to verify by" };
    }
    const score = similarityScorer([...html, ...(references as string[])]);
    const failing = targets.map((target, i) => {
      const he = target.segments.map((s) => s.html).join(" ");
      const heLength = plainLength(he);
      const ratio = plainLength(html[i] as string) / Math.max(1, heLength);
      // A one-line cross-reference ("See item 39.") has no length to judge.
      if (
        heLength >= RATIO_MIN_HEBREW &&
        (ratio < ANSWER_RATIO_BAND[0] || ratio > ANSWER_RATIO_BAND[1])
      ) {
        return true;
      }
      const own = score(target.reference as string, html[i] as string);
      return [i - 1, i + 1]
        .filter((j) => j >= 0 && j < html.length)
        .some(
          (j) => score(target.reference as string, html[j] as string) > own,
        );
    });
    // A shift moves a run of answers, so it fails consecutive pairs; an
    // isolated weak pair is held in place by the two good ones around it.
    const adjacent = failing.findIndex((fails, i) => fails && failing[i + 1]);
    if (adjacent !== -1) {
      return {
        status: "refused",
        reason: `answers ${targets[adjacent]?.segments[0]?.n} and ${targets[adjacent + 1]?.segments[0]?.n} both read closer to a neighbour — the page is out of step there`,
      };
    }
    const failures = failing.filter(Boolean).length;
    if (failures > targets.length * MAX_ISOLATED_FAILURES) {
      return {
        status: "refused",
        reason: `${failures} of ${targets.length} answers fail verification`,
      };
    }
  }

  return {
    status: "imported",
    items: targets.map((target, i) => {
      const first = target.segments[0] as SourceSegment;
      return {
        n: first.n,
        ...(first.sefariaRef ? { sefariaRef: first.sefariaRef } : {}),
        html: html[i] as string,
        anchors: first.anchors ?? [],
      };
    }),
  };
};

/** Groups a Hebrew Q&A chapter's segments by number, in order. */
export const qaTargets = (
  he: SourceSegment[],
  ai: SourceSegment[] | null,
): QaTarget[] => {
  const groups = new Map<number, { segments: SourceSegment[]; ai: string[] }>();
  he.forEach((segment, i) => {
    const group = groups.get(segment.n) ?? { segments: [], ai: [] };
    group.segments.push(segment);
    const reference = ai?.[i]?.html;
    if (reference !== undefined) group.ai.push(reference);
    groups.set(segment.n, group);
  });
  return [...groups.values()].map((group) => ({
    segments: group.segments,
    reference:
      ai && group.ai.length === group.segments.length
        ? group.ai.join(" ")
        : null,
  }));
};

const words = (html: string): Set<string> =>
  new Set(
    html
      .replace(/<[^>]*>/g, " ")
      .toLowerCase()
      .match(/[a-z]+/g) ?? [],
  );

/** Of a question's words, the share that its paired answer's opening repeats. */
const ECHO_MIN_OVERLAP = 0.6;

/**
 * Questions are too short to verify by similarity (and transliterated
 * where `en-ai` translates), but a list-shaped page's answers open by
 * repeating their question — so the page itself vouches for each pairing.
 * Returns the numbers of the questions whose answer does not echo them.
 */
export const questionsWithoutEcho = (table: KiQaTable): number[] => {
  if (table.shape === "interleaved") return [];
  return table.questions.flatMap((question, i) => {
    const answer = table.answers[i];
    if (!answer) return [question.number];
    const asked = words(kiQaEntryHtml(question));
    const opening = words(kiQaEntryHtml(answer).slice(0, 400));
    const repeated = [...asked].filter((word) => opening.has(word)).length;
    return asked.size > 0 && repeated / asked.size >= ECHO_MIN_OVERLAP
      ? []
      : [question.number];
  });
};
