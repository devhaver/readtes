/**
 * Small allowlist HTML sanitizer for content HTML.
 *
 * There is no external sanitizer dependency here on purpose: the input is
 * Sefaria's own API output, and every content file is validated at build
 * time (`pnpm validate:content`), not at request time — so a compact,
 * well-tested regex-based pass is an acceptable trust trade-off. This is
 * NOT meant to be safe against arbitrary/hostile HTML from the open web.
 *
 * Allowed tags: b i em strong small big br sup span a
 * Allowed attrs: a[href, class, data-anchor], span[class, title], sup[class]
 */

const ALLOWED_TAGS = new Set(['b', 'i', 'em', 'strong', 'small', 'big', 'br', 'sup', 'span', 'a'])
const VOID_TAGS = new Set(['br'])
const STRIP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'noscript']

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'class', 'data-anchor'],
  span: ['class', 'title'],
  sup: ['class'],
}

const TAG_RE = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)\s*(\/)?>/g
const ATTR_PAIR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g
const DANGEROUS_BLOCK_RE = new RegExp(
  `<(${STRIP_WITH_CONTENT.join('|')})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  'gi',
)
const FOOTNOTE_PAIR_RE
  = /<sup\b[^>]*class="[^"]*footnote-marker[^"]*"[^>]*>[\s\S]*?<\/sup>\s*<i\b[^>]*class="[^"]*\bfootnote\b[^"]*"[^>]*>([\s\S]*?)<\/i>/gi

/** Removes all tags, keeping only their text content. */
const stripTags = (html: string): string => html.replace(/<[^>]*>/g, '')

const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const isSafeHref = (href: string): boolean => !/^\s*javascript:/i.test(href)

/**
 * Converts Sefaria's footnote-marker/footnote pair into a single inline
 * span carrying the footnote text as a `title` attribute:
 *
 *   <sup class="footnote-marker">*</sup><i class="footnote">Text</i>
 *   -> <span class="tes-footnote" title="Text">*</span>
 */
const convertFootnotes = (html: string): string =>
  html.replace(FOOTNOTE_PAIR_RE, (_full, footnoteHtml: string) => {
    const text = stripTags(footnoteHtml).replace(/\s+/g, ' ').trim()
    return `<span class="tes-footnote" title="${escapeAttr(text)}">*</span>`
  })

const sanitizeTag = (
  _full: string,
  closing: string | undefined,
  rawName: string,
  attrString: string,
  selfClose: string | undefined,
): string => {
  const tagName = rawName.toLowerCase()
  if (!ALLOWED_TAGS.has(tagName)) return ''

  if (closing) return `</${tagName}>`
  if (VOID_TAGS.has(tagName)) return '<br>'

  const allowedForTag = ALLOWED_ATTRS[tagName] ?? []
  const attrs: string[] = []

  for (const match of attrString.matchAll(ATTR_PAIR_RE)) {
    const name = (match[1] as string).toLowerCase()
    if (!allowedForTag.includes(name)) continue

    const value = match[3] ?? match[4] ?? match[5] ?? ''
    if (name === 'href' && !isSafeHref(value)) continue

    attrs.push(`${name}="${escapeAttr(value)}"`)
  }

  const attrsStr = attrs.length > 0 ? ` ${attrs.join(' ')}` : ''
  return selfClose ? `<${tagName}${attrsStr} />` : `<${tagName}${attrsStr}>`
}

/** Sanitizes content HTML to the fixed tag/attribute allowlist above. */
export const sanitizeHtml = (html: string): string => {
  let output = html
  output = output.replace(/<!--[\s\S]*?-->/g, '')
  output = output.replace(DANGEROUS_BLOCK_RE, '')
  output = convertFootnotes(output)
  output = output.replace(TAG_RE, sanitizeTag)
  return output
}
