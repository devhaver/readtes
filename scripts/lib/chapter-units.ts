/**
 * Resolves a Sefaria schema node (main text or one sibling) into the
 * chapter-shaped units the importer writes one file-set per: figuring out
 * how many chapters the node actually has (from the shape of the fetched
 * text itself, never guessed/probed), each one's chapter-level ref, and
 * its raw per-item HTML in each language.
 */
import type { ChapterKind } from '../../shared/types/content.ts'
import { alignJaggedArrays, normalizeToChapterItemLists, type JaggedNodeShape } from './jagged-array.ts'
import { chapterRefFor } from './sefaria-refs.ts'
import type { SefariaJaggedText } from './sefaria-api-types.ts'

export interface ChapterUnit {
  kind: ChapterKind
  /** 1-based instance number within this kind, for this part (e.g. inner-observation-03 -> 3). */
  number: number
  chapterId: string
  chapterRef: string
  /** Raw (un-normalized) per-item HTML, Hebrew — always complete per the corpus. */
  heItems: string[]
  /** Raw per-item HTML, English — `[]` if the node has no English version at all; `''` entries mean untranslated. */
  enItems: string[]
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

export const chapterSlug = (kind: ChapterKind, number: number): string => `${kind}-${pad2(number)}`

/** Whether a node's whole text is a single implicit chapter (depth-1, not the `[Chapter]`-addressed main-text case). */
export const isSingleImplicitChapterNode = (node: JaggedNodeShape): boolean =>
  (node.depth ?? 1) === 1 && (node.sectionNames ?? [])[0] !== 'Chapter'

export const buildChapterUnits = (
  partId: string,
  kind: ChapterKind,
  node: JaggedNodeShape,
  refBase: string,
  heText: SefariaJaggedText[],
  enText: SefariaJaggedText[] | undefined,
): ChapterUnit[] => {
  const heChapters = normalizeToChapterItemLists(node, heText)
  const enChaptersRaw = enText ? normalizeToChapterItemLists(node, enText) : undefined
  const enChapters = alignJaggedArrays(heChapters, enChaptersRaw)
  const singleImplicitChapter = isSingleImplicitChapterNode(node)

  return heChapters.map((heItems, chapterIndex) => {
    const number = chapterIndex + 1
    const chapterRef = chapterRefFor(refBase, singleImplicitChapter ? undefined : number)

    return {
      kind,
      number,
      chapterId: `${partId}/${chapterSlug(kind, number)}`,
      chapterRef,
      heItems,
      enItems: enText ? (enChapters[chapterIndex] ?? []) : [],
    }
  })
}
