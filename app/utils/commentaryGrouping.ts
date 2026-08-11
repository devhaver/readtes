/**
 * Groups a commentary layer's items by section for the commentary pane:
 * "Inner Light" (Ohr Pnimi, the line-by-line commentary on the main
 * chapters) first, then "Inner Observation" (Histaklut Pnimit) — only
 * rendering whichever groups actually have items, since a chapter's
 * commentary is usually one section or the other, never both.
 */
import type { CommentaryItem } from "~~/shared/types/content";

export const COMMENTARY_SECTION_ORDER = [
  "ohr-pnimi",
  "histaklut-pnimit",
] as const;

export interface CommentaryGroup {
  section: CommentaryItem["section"];
  items: CommentaryItem[];
}

export const groupCommentaryBySection = (
  items: CommentaryItem[],
): CommentaryGroup[] =>
  COMMENTARY_SECTION_ORDER.map((section) => ({
    section,
    items: items
      .filter((item) => item.section === section)
      .sort((a, b) => a.order - b.order),
  })).filter((group) => group.items.length > 0);

/**
 * The commentary items targeting one source seif, sorted by `order` — powers
 * `CommentarySheet` (T9): tapping a source paragraph (not one of its own
 * inline anchors) in mobile panes swipe mode opens a sheet listing whatever
 * commentary targets that seif, regardless of anchor.
 */
export const commentaryItemsForSeif = (
  items: CommentaryItem[],
  seifN: number,
): CommentaryItem[] =>
  items
    .filter((item) => item.targetSeif === seifN)
    .sort((a, b) => a.order - b.order);

/**
 * Anchored/unanchored is the same `targetSeif`-presence distinction
 * `validate-content.ts` and the content-model doc comment use (issue #79):
 * an item WITH `targetSeif` names an exact source seif and round-trips with
 * a `tes-anchor` marker there; an item WITHOUT one belongs to a known
 * chapter with no known seif — see `commentaryItemSchema`'s doc comment in
 * `shared/types/content.ts`.
 */
export const isAnchoredCommentaryItem = (item: CommentaryItem): boolean =>
  item.targetSeif !== undefined;

/**
 * Whether ANY item in this set is anchored — the gate every per-seif
 * affordance (`CommentarySheet`'s open, `StudyStream`'s inline disclosures)
 * must key off, so a chapter whose commentary is entirely unanchored never
 * opens an empty "no commentary for this seif" surface (issue #79).
 */
export const hasAnchoredCommentaryItems = (items: CommentaryItem[]): boolean =>
  items.some(isAnchoredCommentaryItem);

/** Whether this set has at least one unanchored item — drives the pane's "not yet aligned" notice and study mode's own unanchored section. */
export const hasUnanchoredCommentaryItems = (
  items: CommentaryItem[],
): boolean => items.some((item) => !isAnchoredCommentaryItem(item));

/**
 * The unanchored items in this set, sorted by `order` (the reading order —
 * see `commentaryItemSchema`'s doc comment). Powers study mode's own
 * titled, collapsed-by-default section for commentary that can't be
 * anchored inline to a source seif (`StudyStream`).
 */
export const unanchoredCommentaryItems = (
  items: CommentaryItem[],
): CommentaryItem[] =>
  items
    .filter((item) => !isAnchoredCommentaryItem(item))
    .sort((a, b) => a.order - b.order);
