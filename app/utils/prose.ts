/**
 * Paragraph recovery for the Inner Observation (Histaklut Pnimit) essays.
 *
 * Unlike the chapter seifim, these segments arrive as ONE html string per
 * segment with no block structure at all — the corpus's own numbers
 * (measured 2026-08-12 on `part-01/inner-observation-01`): 9 segments, no
 * `heading` on any of them, average 1,423 characters and a longest of
 * 5,347 — roughly 900 unbroken words. Rendered as a single `v-html` span
 * that is a genuine wall: nothing for the eye to catch, and nothing to
 * scroll back to when you lose your place.
 *
 * The paragraph boundaries do exist, as `<br>` (9 of them in that longest
 * segment) — Sefaria's Hebrew carries the printed page's line breaks that
 * way rather than as `<p>`. Splitting on them recovers the author's own
 * paragraphing instead of inventing one: no sentence counting, no length
 * heuristic, no guessing.
 *
 * Safe against the committed corpus because the html is already sanitized
 * at import time (`app/utils/sanitizeHtml.ts`) — `<br>` is a void element
 * that can never wrap anything, so splitting on it cannot orphan an open
 * tag the way splitting on an arbitrary tag could.
 */

/** `<br>`, `<br/>`, `<br />` — never `<b>`, which has no `r`. */
const BREAK_TAG = /<br\s*\/?>/gi;

/**
 * The segment's paragraphs, in order, with empty runs dropped (consecutive
 * `<br>`s are a blank line in the print, not an empty paragraph). Returns a
 * single-element array when there is no `<br>` at all, so callers can render
 * the result uniformly without a "did it split?" branch.
 */
export const splitProseParagraphs = (html: string): string[] =>
  html
    .split(BREAK_TAG)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
