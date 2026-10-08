/**
 * Aligns a whole-part page's Ohr Pnimi notes (`ki-whole-part.ts`) to the
 * Hebrew commentary chapters, and its seifim to the Hebrew source chapters.
 *
 * Source is positional and safe: on these parts every Hebrew `chapter-K`
 * is the single seif `K`.
 *
 * Commentary takes two independent signals, and writes a chapter only when
 * every note in it is placed and nothing contradicts:
 *
 * - **Structure.** Sefaria's Ohr Penimi chapter `K` is, in nearly every
 *   case, the notes on seif `K` (measured on parts 5-8: 386 of 401
 *   content-matched notes sit at offset 0, the rest at 1-2). Where the
 *   page prints exactly as many notes under seif `K` as the Hebrew chapter
 *   `K` holds, they pair in order.
 * - **Content.** Where the chapter has `en-ai`, the notes are aligned by
 *   similarity to it (`ki-similarity-align.ts`), constrained to seifim
 *   within `MAX_SEIF_OFFSET` of the chapter.
 *
 * A note both signals place must be placed identically by both. Where the
 * chapter has `en-ai`, content must place every note (structure can only
 * veto); where it has none, structure alone decides.
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type {
  CommentaryItem,
  SourceSegment,
} from "../../shared/types/content.ts";
import {
  acceptedPairs,
  alignBySimilarity,
  type AlignmentStep,
} from "./ki-similarity-align.ts";
import {
  kiDibburHtml,
  type KiDibbur,
  type KiWholePartSeif,
} from "./ki-whole-part.ts";

export const MAX_SEIF_OFFSET = 2;

/** A note pairing that joins two printed notes must score at least this. */
const SPLIT_SIMILARITY = 0.2;

/** Outside this band an English note is not a translation of its Hebrew. */
const NOTE_RATIO_BAND = [0.6, 4] as const;
/** Outside this band an English seif is not a translation of its Hebrew. */
const SEIF_RATIO_BAND = [0.9, 3] as const;

const plain = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const tidy = (html: string): string =>
  sanitizeHtml(html)
    .replace(/ {2,}/g, " ")
    .replace(/\s*<br>\s*/g, "<br>")
    .trim();

export interface WholePartCommentaryChapter {
  /** Chapter number `K` (the slug `chapter-K`). */
  chapter: number;
  heItems: CommentaryItem[];
  /** The chapter's `en-ai` items, index-aligned to `heItems`, if it has them. */
  aiItems: CommentaryItem[] | null;
}

export type ChapterVerdict<T> =
  { status: "imported"; items: T[] } | { status: "refused"; reason: string };

/** Unit indices (into the flattened note list) one Hebrew item takes. */
type Placement = number[];

const sameUnits = (a: Placement, b: Placement): boolean =>
  a.length === b.length && a.every((unit, i) => unit === b[i]);

export const alignWholePartCommentary = (
  chapters: WholePartCommentaryChapter[],
  seifim: KiWholePartSeif[],
): Map<number, ChapterVerdict<CommentaryItem>> => {
  const units: KiDibbur[] = seifim.flatMap((seif) => seif.dibburim);
  const firstUnitOfSeif = new Map<number, number>();
  let offset = 0;
  for (const seif of seifim) {
    firstUnitOfSeif.set(seif.n, offset);
    offset += seif.dibburim.length;
  }

  // Structure: chapter K <-> the notes printed under seif K, counts equal.
  const structural = new Map<string, Placement>();
  for (const { chapter, heItems } of chapters) {
    const seif = seifim.find((s) => s.n === chapter);
    const start = firstUnitOfSeif.get(chapter);
    if (!seif || start === undefined) continue;
    if (seif.dibburim.length !== heItems.length) continue;
    heItems.forEach((_, i) => structural.set(`${chapter}:${i}`, [start + i]));
  }

  // Content: similarity against en-ai, within the seif window.
  const targets = chapters.flatMap(({ chapter, heItems, aiItems }) =>
    heItems.map((_, i) => ({
      key: `${chapter}:${i}`,
      chapter,
      reference: aiItems?.[i]?.html ?? null,
    })),
  );
  const steps: AlignmentStep[] = alignBySimilarity(
    targets.map((target) => target.reference),
    units.map(kiDibburHtml),
  );
  const content = new Map<string, Placement>();
  const withinWindow = (targetIndex: number, unitIndex: number): boolean =>
    Math.abs(
      (units[unitIndex] as KiDibbur).seif -
        (targets[targetIndex] as (typeof targets)[number]).chapter,
    ) <= MAX_SEIF_OFFSET;
  for (const [targetIndex, unitIndex] of acceptedPairs(steps)) {
    if (withinWindow(targetIndex, unitIndex)) {
      content.set((targets[targetIndex] as (typeof targets)[number]).key, [
        unitIndex,
      ]);
    }
  }
  for (const step of steps) {
    if (step.op !== "target-split" || step.score < SPLIT_SIMILARITY) continue;
    const targetIndex = step.targets[0] as number;
    if (step.units.every((unit) => withinWindow(targetIndex, unit))) {
      content.set(
        (targets[targetIndex] as (typeof targets)[number]).key,
        step.units,
      );
    }
  }

  const verdicts = new Map<number, ChapterVerdict<CommentaryItem>>();
  for (const { chapter, heItems, aiItems } of chapters) {
    const items: CommentaryItem[] = [];
    let refusal: string | undefined;

    for (const [i, he] of heItems.entries()) {
      const key = `${chapter}:${i}`;
      const byStructure = structural.get(key);
      const byContent = aiItems ? content.get(key) : undefined;
      if (byStructure && byContent && !sameUnits(byStructure, byContent)) {
        refusal = `${he.anchorId}: structure and content place it on different notes`;
        break;
      }
      // Where en-ai exists, content must vouch for the note: structure alone
      // only stands in for a chapter that has nothing to compare against.
      const placement = aiItems ? byContent : byStructure;
      if (!placement) {
        refusal = `${he.anchorId}: no printed note could be placed on it`;
        break;
      }
      const html = tidy(
        placement
          .map((unit) => kiDibburHtml(units[unit] as KiDibbur))
          .join("<br>"),
      );
      const ratio = plain(html).length / Math.max(1, plain(he.html).length);
      if (ratio < NOTE_RATIO_BAND[0] || ratio > NOTE_RATIO_BAND[1]) {
        refusal = `${he.anchorId}: English is ${ratio.toFixed(2)}x its Hebrew`;
        break;
      }
      items.push({ ...he, html });
    }

    const used = items.length;
    verdicts.set(
      chapter,
      refusal || used !== heItems.length
        ? { status: "refused", reason: refusal ?? "incomplete" }
        : { status: "imported", items },
    );
  }

  // One printed note can only ever be one Hebrew item.
  const owner = new Map<string, number>();
  for (const [chapter, verdict] of verdicts) {
    if (verdict.status !== "imported") continue;
    for (const item of verdict.items) {
      const text = plain(item.html);
      const other = owner.get(text);
      if (other !== undefined && other !== chapter) {
        const reason = `a printed note is placed in both chapter ${other} and ${chapter}`;
        verdicts.set(chapter, { status: "refused", reason });
        verdicts.set(other, { status: "refused", reason });
      }
      owner.set(text, chapter);
    }
  }

  return verdicts;
};

export interface WholePartSourceChapter {
  chapter: number;
  heSegments: SourceSegment[];
}

/**
 * Seif `K` -> `chapter-K`, for Hebrew chapters holding exactly one seif.
 * Refuses a seif whose length is implausible against its Hebrew, and any
 * text the page repeats under more than one seif (part 8's page repeats
 * one paragraph under seifim 54-63).
 */
export const alignWholePartSource = (
  chapters: WholePartSourceChapter[],
  seifim: KiWholePartSeif[],
): Map<number, ChapterVerdict<SourceSegment>> => {
  const verdicts = new Map<number, ChapterVerdict<SourceSegment>>();
  const textCount = new Map<string, number>();
  for (const seif of seifim) {
    const text = plain(seif.paragraphs.join(" "));
    textCount.set(text, (textCount.get(text) ?? 0) + 1);
  }

  for (const { chapter, heSegments } of chapters) {
    const seif = seifim.find((s) => s.n === chapter);
    if (!seif) continue;
    const he = heSegments[0];
    if (heSegments.length !== 1 || !he) {
      verdicts.set(chapter, {
        status: "refused",
        reason: `Hebrew chapter has ${heSegments.length} segments, not one seif`,
      });
      continue;
    }
    const html = tidy(seif.paragraphs.join("<br>"));
    if ((textCount.get(plain(seif.paragraphs.join(" "))) ?? 0) > 1) {
      verdicts.set(chapter, {
        status: "refused",
        reason: "the page prints this text under more than one seif",
      });
      continue;
    }
    const ratio = plain(html).length / Math.max(1, plain(he.html).length);
    if (ratio < SEIF_RATIO_BAND[0] || ratio > SEIF_RATIO_BAND[1]) {
      verdicts.set(chapter, {
        status: "refused",
        reason: `English is ${ratio.toFixed(2)}x its Hebrew`,
      });
      continue;
    }
    verdicts.set(chapter, {
      status: "imported",
      items: [
        {
          n: he.n,
          ...(he.sefariaRef ? { sefariaRef: he.sefariaRef } : {}),
          html,
          anchors: [],
        },
      ],
    });
  }
  return verdicts;
};
