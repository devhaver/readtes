/**
 * The marker text the CURRENTLY DISPLAYED source version prints for each of
 * its anchors — so the commentary pane can label a note with the very
 * characters the reader just clicked in the Ari's text.
 *
 * Why this is needed rather than trusting `CommentaryItem.label`: the two
 * disagree, and both are faithful. Fetched from Bnei Baruch's own English
 * document for Part 1 Chapter 1 (KabbalahMedia `doc2html/vYyXn9gY`,
 * 2026-08-13), their printed edition marks the Ari's text
 * `(1)…(10) (20) (30) … (400)` — the gematria values of the Hebrew letters —
 * while numbering the Inner Light notes themselves `1. 2. 3.` in plain
 * running order. Our corpus reproduces both sides exactly: `en-bb`'s source
 * html carries "20", its `label.en` carries "11". The printed edition is
 * internally inconsistent; the import is not (see issue #96).
 *
 * The reader can do better than the page without falsifying either file.
 * Taking the marker from whichever source version is on screen means the
 * two panes can never disagree — and it stays right when the panes are in
 * different languages, since a Hebrew source pane yields "כ" and the
 * commentary pane then shows "כ" too.
 *
 * Anchors are normalized at import time (`app/utils/anchors.ts`) to
 * `<a class="tes-anchor" data-anchor="op-N">MARKER</a>`, so a regex over the
 * committed html is sufficient and — unlike `DOMParser` — works unchanged
 * during prerender.
 */
import type { SourceSegment } from "~~/shared/types/content";

const ANCHOR_RE = /<a\b[^>]*\bdata-anchor="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

const TAG_RE = /<[^>]+>/g;

/**
 * `anchorId` -> printed marker, for every anchor in these segments.
 *
 * An anchor whose marker text is empty is skipped rather than mapped to ""
 * — callers fall back to the item's own `label`, and an empty string would
 * silently render a note with no marker at all.
 */
export const anchorMarkersFromSegments = (
  segments: SourceSegment[],
): Map<string, string> => {
  const markers = new Map<string, string>();

  for (const segment of segments) {
    for (const match of segment.html.matchAll(ANCHOR_RE)) {
      const [, anchorId, rawMarker] = match;
      if (!anchorId || markers.has(anchorId)) continue;

      const marker = (rawMarker ?? "").replace(TAG_RE, "").trim();
      if (marker.length > 0) markers.set(anchorId, marker);
    }
  }

  return markers;
};
