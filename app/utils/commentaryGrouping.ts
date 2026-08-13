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
 * `null` stands for "no seif known" — the unanchored bucket (issue #79),
 * which always sorts last. It is a distinct group rather than an omission
 * because unanchored items are the majority of the corpus (1,255 of 1,654
 * Hebrew commentary items measured 2026-08-12), so dropping them would
 * hide most of the commentary.
 */
export interface CommentarySeifGroup {
  seif: number | null;
  items: CommentaryItem[];
}

/**
 * Groups a section's commentary items under the source seif each one
 * comments on, ascending, with the unanchored items last.
 *
 * This is what makes the commentary pane readable (issue #93 + the pane
 * readability work): a flat `order`-sorted list of up to 53 items shows the
 * reader a bare running ordinal that counts *notes* while the source pane
 * beside it counts *seifim*, so the two panes' numbers diverge immediately
 * (seif 1 of `part-01/chapter-01` alone carries 11 notes). Grouping under
 * the seif makes the pane's own visible number the same number the source
 * pane shows, and gives the column the headings/dividers a wall of
 * uninterrupted paragraphs lacks.
 *
 * Ordering within a group stays `order` — the items' reading order, which
 * is also the order their printed letter markers run in.
 */
export const groupCommentaryBySeif = (
  items: CommentaryItem[],
): CommentarySeifGroup[] => {
  const bySeif = new Map<number, CommentaryItem[]>();
  const unanchored: CommentaryItem[] = [];

  for (const item of items) {
    if (item.targetSeif === undefined) {
      unanchored.push(item);
      continue;
    }
    const group = bySeif.get(item.targetSeif);
    if (group) group.push(item);
    else bySeif.set(item.targetSeif, [item]);
  }

  const byOrder = (a: CommentaryItem, b: CommentaryItem) => a.order - b.order;

  const groups: CommentarySeifGroup[] = [...bySeif.entries()]
    .sort(([a], [b]) => a - b)
    .map(([seif, groupItems]) => ({
      seif,
      items: [...groupItems].sort(byOrder),
    }));

  if (unanchored.length > 0) {
    groups.push({ seif: null, items: [...unanchored].sort(byOrder) });
  }

  return groups;
};

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
