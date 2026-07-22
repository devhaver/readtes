/**
 * Pure helpers over `SourceSegment[]` for the reader's source pane and the
 * summary pane's heading-mini-toc fallback.
 */
import type { SourceSegment } from "~~/shared/types/content";

/** DOM id a source segment renders with — the mini-toc's jump target (`activateAnchor`). */
export const sourceSegmentAnchorId = (n: number): string => `seif-${n}`;

const LEADING_SEIF_NUMBER_RE = /^(\d+)\.\s*/;

/**
 * English source segments imported from Sefaria carry a leading `"N. "`
 * prefix that duplicates the segment's own `n` (e.g. `"1. Explaining the
 * concept…"` for segment `n: 1`) — the Hebrew edition has no such prefix.
 * Strips it for display when (and only when) the number matches `n`, so an
 * incidental leading number that isn't the seif number is left alone. Pure
 * and render-only — never mutates the content files themselves.
 */
export const stripLeadingSeifNumber = (html: string, n: number): string => {
  const match = html.match(LEADING_SEIF_NUMBER_RE);
  if (!match) return html;

  const matchedNumber = Number.parseInt(match[1] as string, 10);
  if (matchedNumber !== n) return html;

  return html.slice(match[0].length);
};

export interface MiniTocEntry {
  anchorId: string;
  label: string;
}

/**
 * Builds the summary pane's fallback mini-table-of-contents from a source
 * version's segments: one entry per segment, labelled by its `heading` where
 * the version has one (only chapters 1-2's Hebrew edition do, currently),
 * falling back to a generic "Seif N" label otherwise — so the entry list is
 * never shorter than the chapter's own seif count, and the summary pane is
 * never an empty box even for a chapter with no `heading` data at all.
 */
export const sourceMiniTocEntries = (
  segments: SourceSegment[],
  seifLabel: (n: number) => string,
): MiniTocEntry[] =>
  segments.map((segment) => ({
    anchorId: sourceSegmentAnchorId(segment.n),
    label: segment.heading?.trim() || seifLabel(segment.n),
  }));
