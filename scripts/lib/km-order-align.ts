/**
 * Order-based alignment helpers for the KabbalahMedia dialects that have no
 * per-chapter Hebrew ground-truth to join against (whole-part docs, and the
 * per-item "answers-*" chapters split out of a combined Q&A doc) — only a
 * *count* of target chapters, each of which holds exactly one source item.
 *
 * The trick: synthesize one pseudo Hebrew `SourceSegment` per target
 * chapter, keyed by that chapter's own `number` (1-based, matching the KM
 * document's item position — see `km-part-doc-parser`/`km-qa-blocks`'s
 * `position`/`n` fields), then run it through the *same*
 * `buildKmSourceSegments` join `km-transform.ts` already uses for the
 * per-chapter dialect — so a KM item with no counterpart chapter, or a
 * chapter with no counterpart KM item, gets exactly the same
 * skip-and-report treatment (`orphan-km-source-item`/
 * `orphan-he-source-segment`), never a guess.
 */
import type { SourceSegment } from "../../shared/types/content.ts";
import type { KmSourceItem } from "./km-chapter-parser.ts";

export interface OrderAlignedTargetChapter {
  /** 1-based position this chapter occupies among its siblings of the same kind. */
  number: number;
  /** This chapter's own (already-imported) Hebrew `sefariaRef`, copied into the pseudo segment so a matched KM item inherits the real citation. */
  sefariaRef: string;
  /** Characters of Hebrew prose in this chapter's source segment, tags stripped — the scale a translation of it must plausibly have. See `validateTranslationPlausibility`. */
  heTextLength?: number;
}

export const buildOrderAlignedGroundSegments = (
  chapters: readonly OrderAlignedTargetChapter[],
): SourceSegment[] =>
  chapters.map((chapter) => ({
    n: chapter.number,
    sefariaRef: chapter.sefariaRef,
    html: "",
    anchors: [],
  }));

export const validateNumberedOrderAlignment = (
  items: readonly KmSourceItem[],
  chapters: readonly OrderAlignedTargetChapter[],
): string | undefined => {
  if (items.length !== chapters.length) {
    return `item count ${items.length} does not match target chapter count ${chapters.length}`;
  }

  for (let index = 0; index < chapters.length; index += 1) {
    const item = items[index] as KmSourceItem;
    const chapter = chapters[index] as OrderAlignedTargetChapter;
    if (item.n !== chapter.number) {
      return `item ${index + 1} is numbered ${item.n}, expected ${chapter.number}`;
    }
  }

  return undefined;
};

/**
 * Whether a parse is plausibly a TRANSLATION of the Hebrew it claims to
 * align with, by scale (issue #81).
 *
 * `validateNumberedOrderAlignment` above checks the count and the numbering.
 * That is necessary and demonstrably not sufficient: part 8's English
 * document opens with a page-number table of contents —
 *
 *     1. * 4
 *     2. 4
 *     3. 5
 *
 * — whose lines are numbered consecutively, and there are exactly **94** of
 * them against part 8's exactly **94** chapters. The count check passes, the
 * numbering check passes, and the importer writes "* 4" as the Ari's text.
 * Measured, not hypothesised: it produced seif 1 = `"* 4"` (3 characters) and
 * seif 50 = `"53"`.
 *
 * A real translation of a passage is never a fiftieth of its length. Measured
 * on part 6's genuine English, the ratio runs 1.28–2.10 (English is longer
 * than Hebrew); on the table of contents it is about 0.005. Those are three
 * orders of magnitude apart, so the threshold does not need to be delicate.
 *
 * The MEDIAN is used rather than any single item: one unusually terse seif
 * must not fail a good document, while a table of contents is uniformly tiny
 * and cannot hide behind an average. Chapters with no recorded Hebrew length
 * are skipped, and a set with none is passed rather than refused — absence of
 * ground truth is not evidence of a bad parse.
 */
export const MIN_TRANSLATION_LENGTH_RATIO = 0.5;

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const validateTranslationPlausibility = (
  items: readonly KmSourceItem[],
  chapters: readonly OrderAlignedTargetChapter[],
): string | undefined => {
  const ratios: number[] = [];

  for (
    let index = 0;
    index < Math.min(items.length, chapters.length);
    index++
  ) {
    const heLength = chapters[index]?.heTextLength;
    if (!heLength) continue;
    ratios.push(
      stripHtml((items[index] as KmSourceItem).html).length / heLength,
    );
  }

  if (ratios.length === 0) return undefined;

  ratios.sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)] as number;
  if (median >= MIN_TRANSLATION_LENGTH_RATIO) return undefined;

  return `parsed items are implausibly short for a translation — median ${median.toFixed(3)} of the Hebrew's length, expected at least ${MIN_TRANSLATION_LENGTH_RATIO} (a table of contents or front matter read as text?)`;
};

/**
 * Re-keys matched segments (`n` = target chapter number) into a
 * `chapterNumber -> single-item file content` map — every target chapter in
 * this family of dialects holds exactly one item, so the item's own `n` is
 * always reset to `1` regardless of its chapter number.
 */
export const splitOrderAlignedSegments = (
  segments: readonly SourceSegment[],
): Map<number, SourceSegment> =>
  new Map(
    segments.map((segment) => [
      segment.n,
      {
        n: 1,
        sefariaRef: segment.sefariaRef,
        html: segment.html,
        anchors: segment.anchors,
      },
    ]),
  );
