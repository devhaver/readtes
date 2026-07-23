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
