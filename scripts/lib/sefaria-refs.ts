/**
 * Pure Sefaria `ref` string builders. Given a node's depth/sectionNames
 * (see `jagged-array.ts` for the same convention) and a base ref for the
 * node itself, builds the chapter-level and segment-level refs Sefaria
 * would recognize for a given (chapterIndex, itemIndex) position.
 *
 * ## Index offsets (issue #103)
 *
 * Some nodes do not start at 1. Sefaria publishes that as
 * `index_offsets_by_depth` on the node, and a ref composed without it names
 * an item that does not exist — verified live: the ref we used to write for
 * `part-06/questions-topics-01` item 1 returns 404, and the offset-corrected
 * one returns exactly that item's text.
 *
 * Two shapes, both observed in this book's index:
 *
 * - **`{"1": 30}` — a scalar on the FIRST address component.** Which
 *   component that is depends on the node's depth: on a depth-1
 *   `[Paragraph]` list it is the paragraph (the segment), on a depth-2
 *   `[Siman, Paragraph]` list it is the siman (the chapter). Section VI's
 *   topics questions/answers both carry 30 — that part's terminology answer
 *   count — which is the same continuous-numbering model
 *   `app/utils/sefariaCrossRefs.ts` documents for cross-links.
 * - **`{"2": [0, 9, 14, …]}` — an array on the SECOND component, indexed by
 *   chapter.** Histaklut Penimit uses this: chapter 2's paragraphs start
 *   after 9, so its first paragraph is `…2:10`. Confirmed against the API —
 *   `…Histaklut Penimit 2:1` is a 404 and `2:10` is a 200.
 */
import type { JaggedNodeShape } from "./jagged-array.ts";

/**
 * `index_offsets_by_depth` as Sefaria publishes it: keyed by depth (as a
 * string), each value either a scalar applying to every address at that
 * depth, or an array giving a distinct offset per parent index.
 */
export type IndexOffsetsByDepth = Record<string, number | number[]>;

/** The offset at `depth`, for a position under parent index `parentIndex` (0-based). */
const offsetAt = (
  offsets: IndexOffsetsByDepth | undefined,
  depth: number,
  parentIndex = 0,
): number => {
  const value = offsets?.[String(depth)];
  if (value === undefined) return 0;
  if (typeof value === "number") return value;
  return value[parentIndex] ?? 0;
};

/**
 * The chapter-level ref for the `chapterIndex`-th (1-based) chapter of a
 * node. `chapterIndex` is `undefined` for depth-1 non-"Chapter" nodes
 * (sibling Paragraph lists), where the whole node is a single implicit
 * chapter and `refBase` itself already names it — the depth-1 offset there
 * belongs on the segment instead, and `segmentRefFor` applies it.
 */
export const chapterRefFor = (
  refBase: string,
  chapterIndex: number | undefined,
  offsets?: IndexOffsetsByDepth,
): string =>
  chapterIndex === undefined
    ? refBase
    : `${refBase} ${chapterIndex + offsetAt(offsets, 1)}`;

/**
 * The segment-level ref for the `itemIndex`-th (1-based) item within a
 * chapter whose own ref is `chapterRef`.
 *
 * `chapterIndex` is 0-based and only used to select a per-chapter offset
 * from the depth-2 array form; it is irrelevant to the scalar form.
 */
export const segmentRefFor = (
  chapterRef: string,
  node: JaggedNodeShape,
  itemIndex: number,
  offsets?: IndexOffsetsByDepth,
  chapterIndex = 0,
): string => {
  const depth = node.depth ?? 1;

  // Depth 2+: the item is the second component, so the depth-2 offset
  // applies — per chapter, when it is given as an array.
  if (depth >= 2)
    return `${chapterRef}:${itemIndex + offsetAt(offsets, 2, chapterIndex)}`;

  // Depth 1 addressed as `[Chapter]`: the whole chapter is the one segment,
  // already named by `chapterRef` — there is no second component to offset.
  if ((node.sectionNames ?? [])[0] === "Chapter") return chapterRef;

  // Depth 1 `[Paragraph]`: the item IS the first address component, so the
  // depth-1 offset lands here rather than on the chapter.
  return `${chapterRef} ${itemIndex + offsetAt(offsets, 1)}`;
};

/** Chapter-level ref for the Ohr Penimi commentary index, addressed `[Section, Chapter, Seif]`. */
export const ohrPenimiChapterRef = (
  bookRef: string,
  sectionNumber: number,
  chapterNumber: number,
): string => `${bookRef} ${sectionNumber}:${chapterNumber}`;

/** Item-level ref for a single Ohr Penimi commentary item (3rd integer = `data-order`). */
export const ohrPenimiItemRef = (chapterRef: string, order: number): string =>
  `${chapterRef}:${order}`;
