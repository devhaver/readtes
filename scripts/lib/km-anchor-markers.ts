/**
 * Converts KabbalahMedia's inline commentary anchor markers into the
 * reader's normalized anchor link markup.
 *
 * IMPORTANT alignment note (verified against
 * `content/parts/part-01/chapters/chapter-01/commentary.he-jerusalem-1956.json`):
 * the printed marker numeral is the *gematria value* of the Hebrew letter
 * `op-<order>` was labeled with in the source (`label.he`), not the
 * sequential `order`/`data-order` itself. E.g. `op-11`'s Hebrew label is
 * "כ" (gematria 20) and KabbalahMedia's English translation prints that
 * marker as "(20)", never "(11)". Orders 1-9 happen to coincide with their
 * own gematria value (letters א-ט), which is why this is easy to miss on a
 * shallow read of a chapter's first few markers. Callers must build
 * `gematriaToAnchorId` from the chapter's Hebrew ground-truth commentary
 * file (see `km-ground-truth.ts`), never assume numeral === order.
 */

export interface ConvertedAnchorMarkers {
  html: string;
  /** anchorIds converted, in order of appearance (may repeat if a marker recurs). */
  converted: string[];
  /** Printed numerals seen in "(N)" form with no ground-truth match — left as plain text. */
  unmatchedNumerals: number[];
}

const MARKER_RE = /\((\d+)\)/g;

/**
 * Replaces every `(N)` marker whose numeral resolves (via
 * `gematriaToAnchorId`) to a known anchor with
 * `<a class="tes-anchor" href="#op-K" data-anchor="op-K">N</a>` (`op-K` the
 * resolved anchor id, `N` the original printed numeral — kept as the
 * visible label so the rendered text still matches the source document).
 * Numerals with no match in `gematriaToAnchorId` are left as plain `(N)`
 * text, and reported via `unmatchedNumerals` — never guessed.
 */
export const convertAnchorMarkers = (
  html: string,
  gematriaToAnchorId: ReadonlyMap<number, string>,
): ConvertedAnchorMarkers => {
  const converted: string[] = [];
  const unmatchedNumerals: number[] = [];

  const outHtml = html.replace(MARKER_RE, (full, numeralStr: string) => {
    const numeral = Number.parseInt(numeralStr, 10);
    const anchorId = gematriaToAnchorId.get(numeral);
    if (!anchorId) {
      unmatchedNumerals.push(numeral);
      return full;
    }
    converted.push(anchorId);
    return `<a class="tes-anchor" href="#${anchorId}" data-anchor="${anchorId}">${numeral}</a>`;
  });

  return { html: outHtml, converted, unmatchedNumerals };
};
