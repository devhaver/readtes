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
