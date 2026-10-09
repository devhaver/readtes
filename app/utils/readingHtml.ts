/**
 * Render-time touch-ups for the reader's content html, applied on top of what
 * the importers committed (those files are generated, so a rendering quirk in
 * them is fixed here, where it is displayed, never by editing them).
 *
 * Every function is a pure string transform over html that is already
 * sanitized (`app/utils/sanitizeHtml.ts`) and never adds a tag the sanitizer's
 * allowlist would not — `class`/`title`/`aria-label` on elements the reader's
 * own CSS and a11y rules target.
 */

const BREAK = String.raw`<br\s*\/?>`;

const LEADING_BREAKS_RE = new RegExp(String.raw`^(?:\s*${BREAK})+\s*`, "i");
const TRAILING_BREAKS_RE = new RegExp(String.raw`\s*(?:${BREAK}\s*)+$`, "i");
/** Breaks a wrapper opens or closes with: `<small><br>…`, `…<br></span>`. */
const WRAPPER_LEADING_BREAKS_RE = new RegExp(
  String.raw`(<(?:small|span class="tes-para")[^>]*>)(?:\s*${BREAK})+\s*`,
  "gi",
);
const WRAPPER_TRAILING_BREAKS_RE = new RegExp(
  String.raw`\s*(?:${BREAK}\s*)+(<\/(?:small|span)>)`,
  "gi",
);

/**
 * Drops `<br>`s that open or close an item. 882 commentary items open with
 * one (the kabbalah.info edition separates a note's catchword from the
 * previous line that way), which renders as a blank first line; the same
 * happens inside a leading `<small>` or `.tes-para` wrapper.
 */
export const trimEdgeBreaks = (html: string): string =>
  html
    .replace(WRAPPER_LEADING_BREAKS_RE, "$1")
    .replace(WRAPPER_TRAILING_BREAKS_RE, "$1")
    .replace(LEADING_BREAKS_RE, "")
    .replace(TRAILING_BREAKS_RE, "");

/** `<a class="tes-anchor" …>MARKER</a>` — the sanitizer keeps `class` first. */
const NOTE_MARKER_RE = /<a (class="tes-anchor"[^>]*)>([^<]*)<\/a>/g;
/** Whitespace sitting before a marker, unless that marker follows another one. */
const SPACE_BEFORE_MARKER_RE = /(?<!<\/a>)\s+(?=<a class="tes-anchor")/g;
const LETTER_AFTER_MARKER_RE =
  /(<a class="tes-anchor"[^>]*>[^<]*<\/a>)(?=\p{L})/gu;

/**
 * Glues each note marker to the word it annotates. The marker is an atomic
 * inline, so the space before it was a line-break opportunity: markers wrapped
 * onto the start of the next line ("reality / ³.") and detached from their
 * word (1,410 of them). Removing the space leaves no break opportunity between
 * word and marker; a space is put back after the marker when a letter follows
 * it, so the next word does not fuse onto the marker. `noteLabel` names the
 * marker for assistive tech, which would otherwise read a bare "3".
 */
export const attachNoteMarkers = (
  html: string,
  noteLabel?: (marker: string) => string,
): string => {
  let output = html
    .replace(SPACE_BEFORE_MARKER_RE, "")
    .replace(LETTER_AFTER_MARKER_RE, "$1 ");

  if (noteLabel) {
    output = output.replace(
      NOTE_MARKER_RE,
      (_full, attrs: string, marker: string) =>
        `<a ${attrs} aria-label="${noteLabel(marker).replace(/"/g, "&quot;")}">${marker}</a>`,
    );
  }

  return output;
};

const LEADING_PRINT_MARK_RE = /^(\s*)\*(?=\s)/;

/**
 * The lone `*` ~550 Hebrew seifim open with is a mark from the printed
 * edition. Bare, it reads as a stray character; wrapped, it can be styled
 * as a mark and carry a tooltip saying what it is.
 */
export const markPrintAsterisk = (html: string, title: string): string =>
  html.replace(
    LEADING_PRINT_MARK_RE,
    (_full, space: string) =>
      `${space}<span class="tes-print-mark" title="${title.replace(/"/g, "&quot;")}">*</span>`,
  );

const SMALL_RE = /<small>((?:(?!<\/small>)[\s\S])*)<\/small>/g;
/** Longer than a heading: a synopsis wraps whole paragraphs of text. */
const SYNOPSIS_MIN_LENGTH = 160;

/**
 * kabbalah.info wraps both a section's heading and its whole synopsis in
 * `<small>`. Tags the long or multi-line ones `tes-synopsis` so CSS can set
 * them as their own block and leave the short ones to read as headings.
 */
export const markSynopses = (html: string): string =>
  html.replace(SMALL_RE, (full, inner: string) =>
    new RegExp(BREAK, "i").test(inner) || inner.length > SYNOPSIS_MIN_LENGTH
      ? `<small class="tes-synopsis">${inner}</small>`
      : full,
  );

const TITLE_PARAGRAPH_RE =
  /^<span class="tes-para">((?:(?!<span class="tes-para">)[\s\S])*?)<\/span>(?=<span class="tes-para"><small>)/;

/**
 * A segment that opens with a plain title paragraph followed by a `<small>`
 * heading ("Circles and straightness… / Chapter One / Explains…") has no
 * markup saying the first line is the title. Tags it `tes-para-title`.
 */
export const markTitleParagraph = (html: string): string =>
  html.replace(
    TITLE_PARAGRAPH_RE,
    (_full, inner: string) =>
      `<span class="tes-para tes-para-title">${inner}</span>`,
  );

export interface ReadingHtmlOptions {
  /** Accessible name for a note marker, from its printed text. */
  noteLabel?: (marker: string) => string;
  /** Tooltip for a leading print `*`; omit to leave the asterisk bare. */
  printMarkTitle?: string;
}

/** All of the above, for a source segment's html. */
export const prepareReadingHtml = (
  html: string,
  options: ReadingHtmlOptions = {},
): string => {
  let output = trimEdgeBreaks(html);
  if (options.printMarkTitle) {
    output = markPrintAsterisk(output, options.printMarkTitle);
  }
  return attachNoteMarkers(
    markSynopses(markTitleParagraph(output)),
    options.noteLabel,
  );
};

const LEADING_BOLD_RE = /^\s*<b\b/i;

/** Whether a paragraph's html opens with its bold run (not merely contains one). */
export const startsWithBold = (html: string): boolean =>
  LEADING_BOLD_RE.test(html);
