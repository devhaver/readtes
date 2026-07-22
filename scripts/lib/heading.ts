/**
 * Extracts a leading `<b>…</b>`/`<small>…</small>` editorial gloss from the
 * start of a raw (un-normalized) Sefaria segment, when structurally
 * present. The main text of this corpus opens every chapter's first seif
 * with a `<b><big>…</big></b>` chapter-topic line, and every seif with a
 * short `<small>…</small>` gloss — both immediately followed by the seif's
 * actual body text. Peeled elements become the segment's plain-text
 * `heading`; whatever remains is the body `html` gets built from.
 */

const LEADING_ELEMENT_RE = /^(?:\s*<br\s*\/?>\s*)*<(b|small)\b[^>]*>([\s\S]*?)<\/\1>/i
const LEADING_BREAKS_RE = /^(?:\s*<br\s*\/?>\s*)+/i

const stripToPlainText = (html: string): string => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

export interface LeadingHeadingResult {
  heading?: string
  rest: string
}

/**
 * Repeatedly peels leading `<b>`/`<small>` elements (and the `<br>`s
 * between/after them) off the start of `rawHtml`, joining their
 * plain-text content into `heading`. Stops as soon as the remainder no
 * longer starts with one of those elements — never touches content that
 * isn't structurally at the very start of the segment.
 */
export const extractLeadingHeading = (rawHtml: string): LeadingHeadingResult => {
  let remaining = rawHtml
  const parts: string[] = []

  for (;;) {
    const match = LEADING_ELEMENT_RE.exec(remaining)
    if (!match) break
    parts.push(stripToPlainText(match[2] as string))
    remaining = remaining.slice(match[0].length)
  }

  if (parts.length === 0) return { rest: rawHtml }

  remaining = remaining.replace(LEADING_BREAKS_RE, '')
  return { heading: parts.join(' — '), rest: remaining }
}
