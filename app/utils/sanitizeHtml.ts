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

const ALLOWED_TAGS = new Set([
  "b",
  "i",
  "em",
  "strong",
  "small",
  "big",
  "br",
  "sup",
  "span",
  "a",
]);
const VOID_TAGS = new Set(["br"]);
const STRIP_WITH_CONTENT = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "class", "data-anchor"],
  span: ["class", "title"],
  sup: ["class"],
};

const TAG_RE = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^<>]*)?)\s*(\/)?>/g;
const ATTR_PAIR_RE =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
const DANGEROUS_BLOCK_RE = new RegExp(
  `<(${STRIP_WITH_CONTENT.join("|")})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  "gi",
);
const FOOTNOTE_PAIR_RE =
  /<sup\b[^>]*class="[^"]*footnote-marker[^"]*"[^>]*>[\s\S]*?<\/sup>\s*<i\b[^>]*class="[^"]*\bfootnote\b[^"]*"[^>]*>([\s\S]*?)<\/i>/gi;

/**
 * Placeholder token a converted footnote is temporarily replaced with,
 * until the general tag-sanitizing pass has run. Contains no `<`, `>`, or
 * whitespace, and an unlikely-to-collide marker string, so it survives
 * `TAG_RE`/`ATTR_PAIR_RE` untouched.
 */
const FOOTNOTE_TOKEN_RE = /@@tes-footnote:(\d+)@@/g;

/** Removes all tags, keeping only their text content. */
const stripTags = (html: string): string => html.replace(/<[^>]*>/g, "");

const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const isSafeHref = (href: string): boolean => !/^\s*javascript:/i.test(href);

/**
 * Sefaria's own site-relative cross-reference links — e.g. a "List of
 * Questions" item linking to its answer:
 * `href="/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_55"`.
 * That path doesn't exist on this site (only `#op-N`/`#seif-N` in-page
 * fragments do) — Nitro's prerender crawler would otherwise follow it as an
 * internal route and 404. Rewritten to an absolute sefaria.org link instead
 * of stripped, since it's a genuinely useful cross-reference for the
 * reader, just not one this site can serve itself.
 */
const SEFARIA_ORIGIN = "https://www.sefaria.org";
const isSiteRelativeHref = (href: string): boolean =>
  href.startsWith("/") && !href.startsWith("//");

/**
 * Converts each Sefaria footnote-marker/footnote pair into an opaque
 * placeholder token, stashing the (unescaped) footnote text in `footnotes`
 * by index:
 *
 *   <sup class="footnote-marker">*</sup><i class="footnote">Text</i>
 *   -> @@tes-footnote:0@@
 *
 * The placeholder contains no `<`/`>`, so the general tag-sanitizing pass
 * below (which re-parses tags and re-escapes their attribute values)
 * leaves it untouched. `restoreFootnotes` swaps it back for the real
 * `<span title="...">` markup afterwards, escaping the stashed text
 * exactly once. Emitting the final `<span title="...">` HTML here instead
 * (as an earlier version of this function did) would have the tag pass
 * re-parse and re-escape that synthetic span's `title` attribute,
 * double-escaping `&`, `"`, `<`, `>` in footnote text.
 */
const convertFootnotes = (html: string, footnotes: string[]): string =>
  html.replace(FOOTNOTE_PAIR_RE, (_full, footnoteHtml: string) => {
    const text = stripTags(footnoteHtml).replace(/\s+/g, " ").trim();
    const index = footnotes.push(text) - 1;
    return `@@tes-footnote:${index}@@`;
  });

/** Replaces footnote placeholder tokens with the final, singly-escaped span markup. */
const restoreFootnotes = (html: string, footnotes: string[]): string =>
  html.replace(FOOTNOTE_TOKEN_RE, (_full, indexStr: string) => {
    const text = footnotes[Number(indexStr)] ?? "";
    return `<span class="tes-footnote" title="${escapeAttr(text)}">*</span>`;
  });

const sanitizeTag = (
  _full: string,
  closing: string | undefined,
  rawName: string,
  attrString: string,
  selfClose: string | undefined,
): string => {
  const tagName = rawName.toLowerCase();
  if (!ALLOWED_TAGS.has(tagName)) return "";

  if (closing) return `</${tagName}>`;
  if (VOID_TAGS.has(tagName)) return "<br>";

  const allowedForTag = ALLOWED_ATTRS[tagName] ?? [];
  const attrs: string[] = [];
  let rewroteSiteRelativeHref = false;

  for (const match of attrString.matchAll(ATTR_PAIR_RE)) {
    const name = (match[1] as string).toLowerCase();
    if (!allowedForTag.includes(name)) continue;

    let value = match[3] ?? match[4] ?? match[5] ?? "";
    if (name === "href") {
      if (!isSafeHref(value)) continue;
      if (isSiteRelativeHref(value)) {
        value = `${SEFARIA_ORIGIN}${value}`;
        rewroteSiteRelativeHref = true;
      }
    }

    attrs.push(`${name}="${escapeAttr(value)}"`);
  }

  // A rewritten Sefaria link now points off-site — open it in a new tab
  // rather than navigating the reader away mid-chapter. `target`/`rel`
  // aren't part of `ALLOWED_ATTRS.a` (nothing in the source content should
  // control them), these are synthesized only for links this function
  // itself just rewrote.
  if (rewroteSiteRelativeHref) {
    attrs.push('target="_blank"', 'rel="noopener noreferrer"');
  }

  const attrsStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  return selfClose ? `<${tagName}${attrsStr} />` : `<${tagName}${attrsStr}>`;
};

/** Sanitizes content HTML to the fixed tag/attribute allowlist above. */
export const sanitizeHtml = (html: string): string => {
  let output = html;
  output = output.replace(/<!--[\s\S]*?-->/g, "");
  output = output.replace(DANGEROUS_BLOCK_RE, "");

  const footnotes: string[] = [];
  output = convertFootnotes(output, footnotes);
  output = output.replace(TAG_RE, sanitizeTag);
  output = restoreFootnotes(output, footnotes);

  return output;
};

const LEGACY_SITE_RELATIVE_HREF_RE = /href="(\/[^"#][^"]*)"/g;

/**
 * Rewrites a *already-sanitized* segment's remaining Sefaria site-relative
 * hrefs (see `isSiteRelativeHref` above) to absolute sefaria.org links, with
 * `target="_blank" rel="noopener noreferrer"`.
 *
 * `sanitizeHtml` does this itself for anything imported from here on — this
 * narrow, standalone pass is only for content committed before this fix
 * existed (Part 1's Questions/Answers source segments, which do this
 * cross-referencing). It does a single attribute-level string replace, not
 * a full re-parse of the html — the reader renders import-sanitized html
 * as-is (see `SourcePane`), this is a one-off patch for pre-existing
 * content, not a general render-time re-sanitization pass.
 */
export const rewriteLegacySefariaRelativeHrefs = (html: string): string =>
  html.replace(LEGACY_SITE_RELATIVE_HREF_RE, (full, path: string) =>
    path.startsWith("//")
      ? full
      : `href="${SEFARIA_ORIGIN}${path}" target="_blank" rel="noopener noreferrer"`,
  );
