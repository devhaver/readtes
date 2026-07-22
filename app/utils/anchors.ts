/**
 * Utilities for Sefaria's inline commentary anchor markers.
 *
 * The Hebrew "Jerusalem, 1956-1966" version of Talmud Eser HaSefirot embeds
 * empty `<i>` markers in segment HTML, one per commentary anchor:
 *
 *   <i data-commentator="Ohr Penimi" data-label="א" data-order="1"></i>
 *
 * `data-order` is continuous per chapter and is what ties a marker to a
 * `CommentaryItem.anchorId` (grammar: `op-<order>`, see AGENTS.md).
 */

export interface ExtractedAnchor {
  anchorId: string;
  label: string;
  order: number;
  /** Raw `data-commentator` value — filter on this at the call site. */
  commentator: string;
}

const ANCHOR_MARKER_RE = /<i\b([^>]*)>\s*<\/i>/g;
const ANCHOR_ATTR_RE = /data-(commentator|label|order)\s*=\s*"([^"]*)"/g;

const anchorIdFor = (order: number): string => `op-${order}`;

const parseAnchorAttrs = (
  attrString: string,
): { commentator?: string; label?: string; order?: string } => {
  const attrs: { commentator?: string; label?: string; order?: string } = {};
  for (const match of attrString.matchAll(ANCHOR_ATTR_RE)) {
    const key = match[1] as "commentator" | "label" | "order";
    attrs[key] = match[2];
  }
  return attrs;
};

/**
 * Extracts every anchor marker from raw (un-normalized) Sefaria HTML, in
 * order of appearance. Markers from commentators other than "Ohr Penimi"
 * are still returned (with their `commentator` value) — callers decide
 * whether to keep them.
 */
export const extractAnchors = (html: string): ExtractedAnchor[] => {
  const anchors: ExtractedAnchor[] = [];

  for (const match of html.matchAll(ANCHOR_MARKER_RE)) {
    const attrs = parseAnchorAttrs(match[1] ?? "");
    if (attrs.order === undefined || attrs.label === undefined) continue;

    const order = Number.parseInt(attrs.order, 10);
    if (!Number.isFinite(order)) continue;

    anchors.push({
      anchorId: anchorIdFor(order),
      label: attrs.label,
      order,
      commentator: attrs.commentator ?? "",
    });
  }

  return anchors;
};

/**
 * Replaces every raw anchor marker with the normalized, sanitizer-safe
 * anchor link consumed by the reader UI:
 *
 *   <a class="tes-anchor" href="#op-N" data-anchor="op-N">LABEL</a>
 */
export const normalizeAnchors = (html: string): string =>
  html.replace(ANCHOR_MARKER_RE, (full, attrString: string) => {
    const attrs = parseAnchorAttrs(attrString ?? "");
    if (attrs.order === undefined || attrs.label === undefined) return full;

    const order = Number.parseInt(attrs.order, 10);
    if (!Number.isFinite(order)) return full;

    const anchorId = anchorIdFor(order);
    return `<a class="tes-anchor" href="#${anchorId}" data-anchor="${anchorId}">${attrs.label}</a>`;
  });

/**
 * English commentary strings from Sefaria are prefixed with their item
 * number, e.g. `"1.Time in spirituality will be…"`. Splits that prefix off.
 */
export const stripLeadingItemNumber = (
  text: string,
): { number?: number; text: string } => {
  const match = text.match(/^(\d+)\.\s*/);
  if (!match) return { text };

  return {
    number: Number.parseInt(match[1] as string, 10),
    text: text.slice(match[0].length),
  };
};
