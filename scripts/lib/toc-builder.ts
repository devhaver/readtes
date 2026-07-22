/**
 * Pure builders for the `toc.json` part/chapter entries the importer
 * writes. `availableLayers`/`availableVersions` are always derived from
 * what is *actually on disk* after writing (a directory listing, not an
 * in-memory "what did we just write" list) — that automatically preserves
 * untouched layers the importer never writes, like curated summaries.
 */
import type { ChapterKind, TocChapter, TocPart } from '../../shared/types/content.ts'
import { hebrewNumeral } from './hebrew-numerals.ts'
import type { SefariaIndexNode } from './sefaria-api-types.ts'

type LocalizedTitle = Record<string, string>

/** Stable display/sort order for chapter kinds within a part. */
const KIND_ORDER: ChapterKind[] = [
  'chapter',
  'inner-observation',
  'questions-terminology',
  'questions-topics',
  'answers-terminology',
  'answers-topics',
]

export interface ChapterFilesOnDisk {
  summary: string[]
  source: string[]
  commentary: string[]
}

const LAYER_KEYS = ['summary', 'source', 'commentary'] as const

export const buildTocChapter = (
  chapterId: string,
  kind: ChapterKind,
  number: number,
  title: LocalizedTitle,
  filesOnDisk: ChapterFilesOnDisk,
): TocChapter => {
  const availableVersions = {
    summary: [...filesOnDisk.summary].sort(),
    source: [...filesOnDisk.source].sort(),
    commentary: [...filesOnDisk.commentary].sort(),
  }
  const availableLayers = LAYER_KEYS.filter(layer => availableVersions[layer].length > 0)

  return { id: chapterId, kind, number, title, availableLayers, availableVersions }
}

/** Title for a numbered "chapter"-kind chapter (the main text). */
export const mainChapterTitle = (number: number): LocalizedTitle => ({
  en: `Chapter ${number}`,
  he: `פרק ${hebrewNumeral(number)}`,
})

/**
 * Title for a sibling-node chapter. When a node produces exactly one
 * chapter (e.g. a flat "List of Questions..." node), its own index title
 * is used verbatim; when it produces several (e.g. 10 Histaklut Penimit
 * chapters), each is numbered off the node's title.
 */
export const siblingChapterTitle = (node: Pick<SefariaIndexNode, 'title' | 'heTitle'>, number: number, totalInKind: number): LocalizedTitle =>
  totalInKind === 1
    ? { en: node.title, he: node.heTitle }
    : { en: `${node.title} ${number}`, he: `${node.heTitle} ${hebrewNumeral(number)}` }

export const sortTocChapters = (chapters: TocChapter[]): TocChapter[] =>
  [...chapters].sort((a, b) => {
    const kindDiff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    return kindDiff !== 0 ? kindDiff : a.number - b.number
  })

export const buildTocPart = (
  existingPart: TocPart,
  title: LocalizedTitle,
  chapters: TocChapter[],
): TocPart => ({
  ...existingPart,
  title,
  chapters: sortTocChapters(chapters),
})
