/**
 * Derives the lookup structures the KabbalahMedia importer needs from a
 * chapter's existing Hebrew ground truth (`source.he-jerusalem-1956.json` /
 * `commentary.he-jerusalem-1956.json`) — the anchor set the importer is
 * allowed to convert into, and the `label`/`sefariaRef`/`targetSeif` every
 * matched KabbalahMedia commentary paragraph must copy rather than invent.
 */
import type { CommentaryItem } from "../../shared/types/content.ts";
import { hebrewGematriaValue } from "./hebrew-numerals.ts";

export interface KmCommentaryGroundTruthEntry {
  anchorId: string;
  order: number;
  label: CommentaryItem["label"];
  sefariaRef: string;
  targetSeif: number;
}

export interface KmChapterGroundTruth {
  /** Gematria value of the Hebrew label -> anchor id, e.g. 20 -> "op-11" (label "כ"). */
  gematriaToAnchorId: Map<number, string>;
  /** Gematria value of the Hebrew label -> `data-order`, e.g. 20 -> 11 (label "כ"). */
  gematriaToOrder: Map<number, number>;
  /** `data-order` -> the he commentary item it must match against. */
  byOrder: Map<number, KmCommentaryGroundTruthEntry>;
}

/**
 * Builds the ground truth from a chapter's Hebrew commentary items. Throws
 * if two items in the same chapter resolve to the same gematria value with
 * different anchors — would mean the `(N)` marker scheme is ambiguous for
 * this chapter and callers must not proceed silently.
 */
export const buildKmChapterGroundTruth = (
  heCommentaryItems: CommentaryItem[],
): KmChapterGroundTruth => {
  const gematriaToAnchorId = new Map<number, string>();
  const gematriaToOrder = new Map<number, number>();
  const byOrder = new Map<number, KmCommentaryGroundTruthEntry>();

  for (const item of heCommentaryItems) {
    const heLabel = item.label.he;
    if (heLabel === undefined) {
      throw new Error(
        `buildKmChapterGroundTruth: commentary item "${item.anchorId}" has no Hebrew ("he") label`,
      );
    }
    const value = hebrewGematriaValue(heLabel);
    const existing = gematriaToAnchorId.get(value);
    if (existing !== undefined && existing !== item.anchorId) {
      throw new Error(
        `buildKmChapterGroundTruth: gematria value ${value} maps to both "${existing}" and "${item.anchorId}" — ambiguous marker scheme, refusing to guess`,
      );
    }
    gematriaToAnchorId.set(value, item.anchorId);
    gematriaToOrder.set(value, item.order);

    byOrder.set(item.order, {
      anchorId: item.anchorId,
      order: item.order,
      label: item.label,
      sefariaRef: item.sefariaRef,
      targetSeif: item.targetSeif,
    });
  }

  return { gematriaToAnchorId, gematriaToOrder, byOrder };
};
