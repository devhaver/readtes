/**
 * Validates every JSON file under `content/` against the Zod schemas in
 * `shared/types/content.ts`, then cross-checks referential integrity
 * between the ToC, the version registry, and the chapter/layer files on
 * disk. Run via `pnpm validate:content`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  chapterLayerFileSchema,
  tocSchema,
  versionsFileSchema,
  type LayerKind,
  type ParsedChapterLayerFile,
  type Toc,
} from '../shared/types/content.ts'

export interface ValidationResult {
  errors: string[]
}

interface LoadedChapterFile {
  /** Path to the file, relative to the content root — used in error messages. */
  relativePath: string
  /** `<partId>/<chapterSlug>`, derived from the file's directory. */
  chapterDirId: string
  file: ParsedChapterLayerFile
}

const LAYER_KINDS: LayerKind[] = ['summary', 'source', 'commentary']

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf-8'))

const formatZodError = (label: string, error: { issues: { path: PropertyKey[], message: string }[] }): string[] =>
  error.issues.map(issue => `${label}: ${issue.path.join('.') || '(root)'} — ${issue.message}`)

/** Anchor ids present in already-normalized HTML (`data-anchor="op-N"`). */
const anchorIdsInHtml = (html: string): Set<string> => {
  const ids = new Set<string>()
  for (const match of html.matchAll(/data-anchor="([^"]+)"/g)) {
    ids.add(match[1] as string)
  }
  return ids
}

const listSubdirNames = (dir: string): string[] => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  }
  catch {
    return []
  }
}

const loadChapterFiles = (contentDir: string, errors: string[]): LoadedChapterFile[] => {
  const partsDir = join(contentDir, 'parts')
  const loaded: LoadedChapterFile[] = []
  const partDirs = listSubdirNames(partsDir)

  if (partDirs.length === 0) {
    errors.push(`content/parts directory is missing or empty (expected at ${relative(contentDir, partsDir)})`)
    return loaded
  }

  for (const partId of partDirs) {
    const chaptersDir = join(partsDir, partId, 'chapters')
    const chapterDirs = listSubdirNames(chaptersDir)

    for (const chapterDir of chapterDirs) {
      const chapterPath = join(chaptersDir, chapterDir)
      const chapterDirId = `${partId}/${chapterDir}`
      const fileNames = readdirSync(chapterPath, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => entry.name)

      for (const fileName of fileNames) {
        const filePath = join(chapterPath, fileName)
        const relativePath = relative(contentDir, filePath)
        const nameMatch = fileName.match(/^([a-z]+)\.(.+)\.json$/)

        if (!nameMatch) {
          errors.push(`${relativePath}: filename does not match "<layer>.<versionId>.json"`)
          continue
        }

        const [, fileLayer, fileVersionId] = nameMatch
        const raw = readJson(filePath)
        const parsed = chapterLayerFileSchema.safeParse(raw)

        if (!parsed.success) {
          errors.push(...formatZodError(relativePath, parsed.error))
          continue
        }

        const file = parsed.data

        if (file.layer !== fileLayer) {
          errors.push(`${relativePath}: filename layer "${fileLayer}" does not match file's "layer": "${file.layer}"`)
        }
        if (file.versionId !== fileVersionId) {
          errors.push(`${relativePath}: filename versionId "${fileVersionId}" does not match file's "versionId": "${file.versionId}"`)
        }
        if (file.chapterId !== chapterDirId) {
          errors.push(`${relativePath}: chapterId "${file.chapterId}" does not match directory location "${chapterDirId}"`)
        }

        loaded.push({ relativePath, chapterDirId, file })
      }
    }
  }

  return loaded
}

const checkSourceHtmlAnchorsConsistency = (loaded: LoadedChapterFile[], errors: string[]): void => {
  for (const { relativePath, file } of loaded) {
    if (file.layer !== 'source') continue

    for (const segment of file.items) {
      const declared = new Set(segment.anchors)
      const inHtml = anchorIdsInHtml(segment.html)

      for (const id of declared) {
        if (!inHtml.has(id)) {
          errors.push(`${relativePath}: seif ${segment.n} declares anchor "${id}" but it is not present in its html`)
        }
      }
      for (const id of inHtml) {
        if (!declared.has(id)) {
          errors.push(`${relativePath}: seif ${segment.n} html contains anchor "${id}" not listed in its anchors[]`)
        }
      }
    }
  }
}

const checkAnchorCommentaryIntegrity = (loaded: LoadedChapterFile[], errors: string[]): void => {
  const byChapter = new Map<string, LoadedChapterFile[]>()
  for (const entry of loaded) {
    const list = byChapter.get(entry.chapterDirId) ?? []
    list.push(entry)
    byChapter.set(entry.chapterDirId, list)
  }

  for (const [chapterDirId, entries] of byChapter) {
    const sourceFiles = entries.filter(e => e.file.layer === 'source')
    const commentaryFiles = entries.filter(e => e.file.layer === 'commentary')

    const commentaryAnchorIds = new Set(
      commentaryFiles.flatMap(e => (e.file.layer === 'commentary' ? e.file.items.map(item => item.anchorId) : [])),
    )
    const sourceSeifNumbers = new Set(
      sourceFiles.flatMap(e => (e.file.layer === 'source' ? e.file.items.map(item => item.n) : [])),
    )

    for (const entry of sourceFiles) {
      if (entry.file.layer !== 'source') continue
      for (const segment of entry.file.items) {
        for (const anchorId of segment.anchors) {
          if (!commentaryAnchorIds.has(anchorId)) {
            errors.push(
              `${entry.relativePath}: anchor "${anchorId}" (seif ${segment.n}) has no matching CommentaryItem.anchorId in any commentary version of chapter "${chapterDirId}"`,
            )
          }
        }
      }
    }

    for (const entry of commentaryFiles) {
      if (entry.file.layer !== 'commentary') continue
      for (const item of entry.file.items) {
        if (!sourceSeifNumbers.has(item.targetSeif)) {
          errors.push(
            `${entry.relativePath}: anchor "${item.anchorId}" targets seif ${item.targetSeif}, which does not exist in any source version of chapter "${chapterDirId}"`,
          )
        }
      }
    }
  }
}

const checkTocFileCrossReferences = (
  toc: Toc,
  loaded: LoadedChapterFile[],
  versionIds: Set<string>,
  errors: string[],
): void => {
  const filesOnDisk = new Map<string, Set<string>>() // chapterDirId -> `${layer}:${versionId}`
  for (const entry of loaded) {
    const key = `${entry.file.layer}:${entry.file.versionId}`
    const set = filesOnDisk.get(entry.chapterDirId) ?? new Set<string>()
    set.add(key)
    filesOnDisk.set(entry.chapterDirId, set)
  }

  const declaredInToc = new Set<string>() // chapterDirId -> tracked separately below
  const tocChapterIds = new Set<string>()

  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters) {
        tocChapterIds.add(chapter.id)

        for (const layer of LAYER_KINDS) {
          for (const versionId of chapter.availableVersions[layer]) {
            if (!versionIds.has(versionId)) {
              errors.push(`toc.json: chapter "${chapter.id}" availableVersions.${layer} references unknown version "${versionId}"`)
            }

            const key = `${layer}:${versionId}`
            declaredInToc.add(`${chapter.id}|${key}`)

            const onDisk = filesOnDisk.get(chapter.id)
            if (!onDisk?.has(key)) {
              errors.push(
                `toc.json: chapter "${chapter.id}" declares availableVersions.${layer} "${versionId}" but no file content/parts/${chapter.id.replace('/', '/chapters/')}/${layer}.${versionId}.json exists`,
              )
            }
          }

          const declaresLayer = chapter.availableLayers.includes(layer)
          const hasVersions = chapter.availableVersions[layer].length > 0
          if (declaresLayer !== hasVersions) {
            errors.push(
              `toc.json: chapter "${chapter.id}" availableLayers ${declaresLayer ? 'includes' : 'omits'} "${layer}" but availableVersions.${layer} is ${hasVersions ? 'non-empty' : 'empty'}`,
            )
          }
        }
      }
    }
  }

  for (const [chapterDirId, keys] of filesOnDisk) {
    if (!tocChapterIds.has(chapterDirId)) {
      errors.push(`content/parts/${chapterDirId.replace('/', '/chapters/')}: has content files but no matching chapter in toc.json`)
      continue
    }
    for (const key of keys) {
      if (!declaredInToc.has(`${chapterDirId}|${key}`)) {
        const [layer, versionId] = key.split(':')
        errors.push(
          `content/parts/${chapterDirId.replace('/', '/chapters/')}/${layer}.${versionId}.json: exists on disk but is not listed in toc.json's availableVersions.${layer} for chapter "${chapterDirId}"`,
        )
      }
    }
  }
}

export const validateContent = (contentDir: string): ValidationResult => {
  const errors: string[] = []

  const versionsRaw = readJson(join(contentDir, 'versions.json'))
  const versionsParsed = versionsFileSchema.safeParse(versionsRaw)
  if (!versionsParsed.success) {
    errors.push(...formatZodError('versions.json', versionsParsed.error))
  }
  const versionIds = new Set(versionsParsed.success ? versionsParsed.data.map(v => v.id) : [])

  const tocRaw = readJson(join(contentDir, 'toc.json'))
  const tocParsed = tocSchema.safeParse(tocRaw)
  if (!tocParsed.success) {
    errors.push(...formatZodError('toc.json', tocParsed.error))
  }

  const loaded = loadChapterFiles(contentDir, errors)

  checkSourceHtmlAnchorsConsistency(loaded, errors)
  checkAnchorCommentaryIntegrity(loaded, errors)

  if (tocParsed.success) {
    checkTocFileCrossReferences(tocParsed.data, loaded, versionIds, errors)
  }

  return { errors }
}

const isRunAsScript = (): boolean => {
  const entry = process.argv[1]
  return entry !== undefined && import.meta.url === `file://${entry}`
}

if (isRunAsScript()) {
  const contentDir = join(fileURLToPath(new URL('..', import.meta.url)), 'content')
  const { errors } = validateContent(contentDir)

  if (errors.length > 0) {
    for (const error of errors) console.error(`✖ ${error}`)
    console.error(`\n${errors.length} content validation error(s).`)
    process.exit(1)
  }

  console.log('✓ Content validation passed.')
}
