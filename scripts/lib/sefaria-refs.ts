/**
 * Pure Sefaria `ref` string builders. Given a node's depth/sectionNames
 * (see `jagged-array.ts` for the same convention) and a base ref for the
 * node itself, builds the chapter-level and segment-level refs Sefaria
 * would recognize for a given (chapterIndex, itemIndex) position.
 */
import type { JaggedNodeShape } from './jagged-array.ts'

/**
 * The chapter-level ref for the `chapterIndex`-th (1-based) chapter of a
 * node. `chapterIndex` is `undefined` for depth-1 non-"Chapter" nodes
 * (sibling Paragraph lists), where the whole node is a single implicit
 * chapter and `refBase` itself already names it.
 */
export const chapterRefFor = (refBase: string, chapterIndex: number | undefined): string =>
  chapterIndex === undefined ? refBase : `${refBase} ${chapterIndex}`

/**
 * The segment-level ref for the `itemIndex`-th (1-based) item within a
 * chapter whose own ref is `chapterRef`.
 */
export const segmentRefFor = (chapterRef: string, node: JaggedNodeShape, itemIndex: number): string => {
  const depth = node.depth ?? 1

  if (depth >= 2) return `${chapterRef}:${itemIndex}`
  if ((node.sectionNames ?? [])[0] === 'Chapter') return chapterRef // whole chapter is the one segment
  return `${chapterRef} ${itemIndex}`
}

/** Chapter-level ref for the Ohr Penimi commentary index, addressed `[Section, Chapter, Seif]`. */
export const ohrPenimiChapterRef = (bookRef: string, sectionNumber: number, chapterNumber: number): string =>
  `${bookRef} ${sectionNumber}:${chapterNumber}`

/** Item-level ref for a single Ohr Penimi commentary item (3rd integer = `data-order`). */
export const ohrPenimiItemRef = (chapterRef: string, order: number): string => `${chapterRef}:${order}`
