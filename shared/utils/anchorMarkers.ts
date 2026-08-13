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

const ANCHOR_RE = /<a\b[^>]*\bdata-anchor="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
const TAG_RE = /<[^>]+>/g;

/**
 * `anchorId` -> printed marker, over a sequence of source html strings, in
 * order. The FIRST occurrence of an id wins.
 *
 * An anchor whose marker text is empty is omitted rather than mapped to `""`:
 * callers fall back to the item's stored label, and an empty string would
 * silently render a note with no marker at all.
 */
export const anchorMarkersFromHtml = (
  htmlStrings: Iterable<string>,
): Map<string, string> => {
  const markers = new Map<string, string>();

  for (const html of htmlStrings) {
    for (const match of html.matchAll(ANCHOR_RE)) {
      const [, anchorId, rawMarker] = match;
      if (!anchorId || markers.has(anchorId)) continue;

      const marker = (rawMarker ?? "").replace(TAG_RE, "").trim();
      if (marker.length > 0) markers.set(anchorId, marker);
    }
  }

  return markers;
};

/**
 * Whether `label` already names `marker` — equal to it, or listing it among
 * several whitespace-separated markers.
 *
 * The looser test exists because a label may legitimately be richer than the
 * marker beside it: `part-02/chapter-01` op-20 is labelled `"ר וש"`, one
 * note covering two printed letters, while the source text prints only the
 * first. That is correct data, not drift. Token equality (never substring)
 * so "30" is not considered named by "300".
 */
export const labelNamesMarker = (
  label: string | undefined,
  marker: string,
): boolean =>
  label !== undefined && label.split(/\s+/).some((token) => token === marker);
