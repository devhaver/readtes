/**
 * Pure transforms from raw (already-fetched, already-shaped) Sefaria text
 * into our `SourceSegment[]` / `CommentaryItem[]` content items. No network
 * I/O here — everything takes plain strings/arrays and is unit-testable
 * against fixtures.
 */
import { extractAnchors, normalizeAnchors, stripLeadingItemNumber } from '../../app/utils/anchors.ts'
import { sanitizeHtml } from '../../app/utils/sanitizeHtml.ts'
import type { CommentaryItem, SourceSegment } from '../../shared/types/content.ts'
import { extractLeadingHeading } from './heading.ts'
import type { JaggedNodeShape } from './jagged-array.ts'
import { ohrPenimiItemRef, segmentRefFor } from './sefaria-refs.ts'
import type { SefariaLink } from './sefaria-api-types.ts'

const OHR_PENIMI_COMMENTATOR = 'Ohr Penimi'

/** Mirrors the marker shape `app/utils/anchors.ts` matches — scoped here to rewriting, not extraction. */
const ANCHOR_MARKER_RE = /<i\b([^>]*)>\s*<\/i>/g
const MARKER_ATTR_RE = /data-(commentator|label)\s*=\s*"([^"]*)"/g

/**
 * Replaces inline commentary markers from any commentator other than Ohr
 * Penimi with their bare label text (no link). `normalizeAnchors` (Task 2)
 * turns *every* marker it sees into an anchor link regardless of
 * commentator — left unfiltered, a foreign marker would produce a
 * `data-anchor` in `html` with no matching entry in `anchors[]` (we only
 * ever index Ohr Penimi commentary), tripping the content-integrity
 * anchor/html consistency check. Not exercised by Section I (only "Ohr
 * Penimi" markers appear there), but kept correct for sections not yet
 * imported.
 */
const neutralizeForeignAnchorMarkers = (html: string): string =>
  html.replace(ANCHOR_MARKER_RE, (full, attrString: string) => {
    let commentator: string | undefined
    let label: string | undefined
    for (const match of (attrString as string).matchAll(MARKER_ATTR_RE)) {
      if (match[1] === 'commentator') commentator = match[2]
      if (match[1] === 'label') label = match[2]
    }
    if (commentator === undefined || commentator === OHR_PENIMI_COMMENTATOR) return full
    return label ?? ''
  })

export interface DroppedAnchor {
  sefariaRef: string
  commentator: string
  order: number
}

export interface BuildSourceSegmentsResult {
  segments: SourceSegment[]
  /** Inline markers found for a commentator other than Ohr Penimi — excluded from `anchors[]`, surfaced for the report. */
  droppedAnchors: DroppedAnchor[]
}

/**
 * Builds the `SourceSegment[]` for one chapter file from one language's
 * raw (un-normalized) per-seif HTML. `items[i] === ''` means this language
 * has no text at that position — the position is skipped, not emitted as
 * an empty segment.
 */
export const buildSourceSegments = (
  node: JaggedNodeShape,
  chapterRef: string,
  items: string[],
  /**
   * Whether to peel a leading `<b>`/`<small>` gloss into `heading`. Scoped
   * to the main-text "chapter" kind, where this structural pattern is
   * verified (chapter-topic line + per-seif gloss) — left off for sibling
   * nodes (Questions/Answers/Histaklut Penimit lists) whose leading
   * `<small>`/`<b>` markup is different in kind (e.g. a backlink), so
   * "don't force it" per the import brief.
   */
  extractHeadings: boolean,
): BuildSourceSegmentsResult => {
  const segments: SourceSegment[] = []
  const droppedAnchors: DroppedAnchor[] = []

  items.forEach((rawHtml, index) => {
    if (rawHtml === '') return

    const itemIndex = index + 1
    const sefariaRef = segmentRefFor(chapterRef, node, itemIndex)
    const { heading, rest } = extractHeadings ? extractLeadingHeading(rawHtml) : { heading: undefined, rest: rawHtml }
    const anchors: string[] = []

    for (const anchor of extractAnchors(rest)) {
      if (anchor.commentator === OHR_PENIMI_COMMENTATOR) {
        anchors.push(anchor.anchorId)
      }
      else {
        droppedAnchors.push({ sefariaRef, commentator: anchor.commentator, order: anchor.order })
      }
    }

    const html = sanitizeHtml(normalizeAnchors(neutralizeForeignAnchorMarkers(rest)))
    segments.push({
      n: itemIndex,
      sefariaRef,
      ...(heading ? { heading } : {}),
      html,
      anchors,
    })
  })

  return { segments, droppedAnchors }
}

export interface CommentaryLinkInfo {
  order: number
  targetSeif: number
  heLabel: string
}

export interface ParseCommentaryLinksResult {
  /** chapter number (the integer right before the final `:seif` in `anchorRef`) -> that chapter's link infos. */
  byChapter: Map<number, CommentaryLinkInfo[]>
  warnings: string[]
}

const ANCHOR_REF_CHAPTER_SEIF_RE = /(\d+):(\d+)$/

/**
 * Extracts, from a `GET /api/links/{ref}` response, the Ohr Penimi
 * commentary -> seif mapping, grouped by the chapter each link belongs to
 * (parsed from `anchorRef`'s trailing `chapter:seif`).
 */
export const parseCommentaryLinks = (links: SefariaLink[], commentaryIndexTitle: string): ParseCommentaryLinksResult => {
  const byChapter = new Map<number, CommentaryLinkInfo[]>()
  const warnings: string[] = []

  for (const link of links) {
    if (link.category !== 'Commentary') continue
    if (link.index_title !== commentaryIndexTitle) continue

    const order = link.inline_reference?.['data-order']
    const heLabel = link.inline_reference?.['data-label']
    if (order === undefined || heLabel === undefined) {
      warnings.push(`commentary link "${link.ref}" is missing inline_reference data-order/data-label — skipped`)
      continue
    }

    const match = ANCHOR_REF_CHAPTER_SEIF_RE.exec(link.anchorRef)
    if (!match) {
      warnings.push(`commentary link "${link.ref}" has an anchorRef with an unexpected shape: "${link.anchorRef}" — skipped`)
      continue
    }

    const chapterNumber = Number.parseInt(match[1] as string, 10)
    const targetSeif = Number.parseInt(match[2] as string, 10)

    const list = byChapter.get(chapterNumber) ?? []
    list.push({ order, targetSeif, heLabel })
    byChapter.set(chapterNumber, list)
  }

  return { byChapter, warnings }
}

export interface BuildCommentaryItemsResult {
  items: CommentaryItem[]
  warnings: string[]
}

/**
 * Builds the `CommentaryItem[]` for one chapter's commentary file in one
 * language, from that language's raw per-order Ohr Penimi text and the
 * chapter's link infos (source of `targetSeif`/`label.he`). `rawItems[i]
 * === ''` means this language has no text at that order.
 */
export const buildCommentaryItems = (
  chapterRef: string,
  rawItems: string[],
  links: CommentaryLinkInfo[],
  language: 'he' | 'en',
): BuildCommentaryItemsResult => {
  const items: CommentaryItem[] = []
  const warnings: string[] = []
  const linksByOrder = new Map(links.map(link => [link.order, link]))

  rawItems.forEach((raw, index) => {
    if (raw === '') return

    const order = index + 1
    const link = linksByOrder.get(order)
    if (!link) {
      warnings.push(`${chapterRef}: commentary item order ${order} (${language}) has text but no links entry for it — skipped`)
      return
    }

    let text = raw
    if (language === 'en') {
      const stripped = stripLeadingItemNumber(raw)
      if (stripped.number !== undefined && stripped.number !== order) {
        warnings.push(
          `${chapterRef}: commentary item order ${order} en text leading number "${stripped.number}." does not match data-order ${order} — trusting data-order`,
        )
      }
      text = stripped.text
    }

    items.push({
      anchorId: `op-${order}`,
      order,
      label: { he: link.heLabel, en: String(order) },
      sefariaRef: ohrPenimiItemRef(chapterRef, order),
      targetSeif: link.targetSeif,
      section: 'ohr-pnimi',
      html: sanitizeHtml(normalizeAnchors(text)),
    })
  })

  return { items, warnings }
}
