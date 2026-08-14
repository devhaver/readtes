/**
 * Extracts the marker text a source version prints for each of its commentary
 * anchors.
 *
 * Shared because two very different callers need the identical answer, and a
 * second implementation would be a second thing to drift: the reader
 * (`app/utils/anchorMarkers.ts`, labelling notes with the marker on screen)
 * and the content tooling (`scripts/migrate-commentary-labels.ts` +
 * `validate-content.ts`, issue #96).
 *
 * Anchors are normalized at import time (`app/utils/anchors.ts`) to
 * `<a class="tes-anchor" data-anchor="op-N">MARKER</a>`, so a regex over the
 * committed html is sufficient — and unlike `DOMParser` it works unchanged
 * during prerender and under `tsx` in a script.
 *
 * Contains no `zod` and no Nuxt imports, so app code may import it as a
 * value rather than `import type`.
 */

/**
 * One anchor: its opening tag, its `data-anchor` id, whatever it prints, and
 * its closing tag.
 *
 * Held as a pattern and compiled per call rather than shared as one `/g`
 * literal, because `matchAll` and `replace` would otherwise take turns
 * mutating the same `lastIndex`. One pattern is the point — the reader, the
 * validator and the migrations must all agree on what an anchor is.
 */
const ANCHOR_PATTERN =
  /(<a\b[^>]*\bdata-anchor="([^"]+)"[^>]*>)([\s\S]*?)(<\/a>)/;
const anchorRegex = (): RegExp => new RegExp(ANCHOR_PATTERN.source, "g");

const TAG_RE = /<[^>]+>/g;
/** Non-global twin of `TAG_RE`, so `.test()` carries no `lastIndex` state. */
const HAS_TAG_RE = /<[^>]+>/;

/**
 * `anchorId` -> every marker printed for it, in document order.
 *
 * One anchor can be printed more than once, and the occurrences need not
 * print the same thing: `part-02/chapter-01` op-20 is one note covering two
 * consecutive letters, and the Hebrew source marks the text twice — "ר" at
 * one point and "ש" at the next — with `label.he` reading "ר וש". Collapsing
 * that to a single value loses the second marker, which is exactly how a
 * migration comes to overwrite a correct marker with its neighbour's.
 *
 * An anchor whose marker text is empty is omitted rather than recorded as
 * `""`: callers fall back to the item's stored label, and an empty string
 * would silently render a note with no marker at all.
 */
export const anchorMarkerOccurrences = (
  htmlStrings: Iterable<string>,
): Map<string, string[]> => {
  const markers = new Map<string, string[]>();

  for (const html of htmlStrings) {
    for (const match of html.matchAll(anchorRegex())) {
      const [, , anchorId, rawMarker] = match;
      if (!anchorId) continue;

      const marker = (rawMarker ?? "").replace(TAG_RE, "").trim();
      if (marker.length === 0) continue;

      const list = markers.get(anchorId);
      if (list) list.push(marker);
      else markers.set(anchorId, [marker]);
    }
  }

  return markers;
};

/**
 * `anchorId` -> printed marker, over a sequence of source html strings, in
 * order. The FIRST occurrence of an id wins.
 *
 * The right shape for the reader, which labels one note with one marker.
 * Anything reasoning about the text itself — a migration rewriting markers,
 * a check comparing two versions' — wants `anchorMarkerOccurrences` instead.
 */
export const anchorMarkersFromHtml = (
  htmlStrings: Iterable<string>,
): Map<string, string> =>
  new Map(
    [...anchorMarkerOccurrences(htmlStrings)].map(([anchorId, markers]) => [
      anchorId,
      markers[0] as string,
    ]),
  );

/** What `replaceAnchorMarkers` tells `markerFor` about one printed anchor. */
export interface AnchorOccurrence {
  anchorId: string;
  /** What this occurrence prints today, trimmed of surrounding whitespace. */
  current: string;
  /**
   * How many times this same `anchorId` was already printed, counted across
   * the whole sequence — so it indexes straight into that id's list from
   * `anchorMarkerOccurrences` over the same sequence.
   */
  occurrence: number;
}

/**
 * Rewrites the marker each anchor prints across a chapter's segments, asking
 * `markerFor` what each should say. Returning `null` leaves that anchor
 * exactly as it was. Returns the rewritten strings, positionally.
 *
 * Takes the whole sequence rather than one string at a time because
 * occurrence counting has to span it: `part-02/chapter-01` op-20 is printed
 * in one seif and again in the next, and the two print different letters. A
 * caller stitching per-string calls together would have to re-derive that
 * count, and would be free to derive it differently.
 *
 * Anchors printing nothing are not offered to `markerFor` at all and do not
 * advance the count, matching what `anchorMarkerOccurrences` records.
 *
 * An anchor whose current marker contains markup rather than plain text is
 * never rewritten, whatever `markerFor` says: replacing it would silently
 * drop a tag this function does not understand. Those are reported through
 * `onSkipped` so a caller can print them instead of losing them.
 *
 * Written as a replace over the committed html rather than a parse-and-
 * serialize, for the same reason `anchorMarkerOccurrences` is a regex: it
 * must leave every byte it did not deliberately change alone, so a
 * migration's diff shows only the markers it meant to touch.
 */
export const replaceAnchorMarkers = (
  htmlStrings: Iterable<string>,
  markerFor: (anchor: AnchorOccurrence) => string | null,
  onSkipped?: (anchor: AnchorOccurrence, inner: string) => void,
): string[] => {
  const seen = new Map<string, number>();

  return [...htmlStrings].map((html) =>
    html.replace(
      anchorRegex(),
      (whole, open: string, anchorId: string, inner: string, close: string) => {
        const current = inner.trim();
        if (current.length === 0) return whole;

        const occurrence = seen.get(anchorId) ?? 0;
        seen.set(anchorId, occurrence + 1);

        const anchor = { anchorId, current, occurrence };
        const next = markerFor(anchor);
        if (next === null || next === current) return whole;

        if (HAS_TAG_RE.test(inner)) {
          onSkipped?.(anchor, inner);
          return whole;
        }

        return `${open}${next}${close}`;
      },
    ),
  );
};

/**
 * Whether `label` already names `marker` — equal to it, or listing it among
 * several whitespace-separated markers.
 *
 * The looser test exists because a label may legitimately be richer than any
 * one marker beside it: `part-02/chapter-01` op-20 is labelled `"ר וש"`, one
 * note covering two printed letters, and the source text prints the anchor
 * twice — "ר" in one seif and "ש" in the next. Either names the label. That
 * is correct data, not drift. Token equality (never substring) so "30" is
 * not considered named by "300".
 */
export const labelNamesMarker = (
  label: string | undefined,
  marker: string,
): boolean =>
  label !== undefined && label.split(/\s+/).some((token) => token === marker);
