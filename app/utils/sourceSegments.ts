/**
 * Pure helpers over `SourceSegment[]` for the reader's source pane and
 * `ReaderSummaryBody`'s heading-mini-toc fallback.
 */
import type { SourceSegment } from "~~/shared/types/content";

/** DOM id a source segment renders with — the mini-toc's jump target. */
export const sourceSegmentAnchorId = (n: number): string => `seif-${n}`;

/**
 * Whether `segments[index]` is a continuation of the one immediately
 * before it — same `n`, later position. Issue #91's consolidated
 * `answers-*` chapters legitimately hold several segments per answer
 * number (~109 answers across the corpus were themselves imported as more
 * than one Sefaria sub-item); positional rather than a `sefariaRef`
 * comparison so it holds for every source dialect, KM-parsed included.
 * `SourcePane`/`StudyStream`/`OriginalStream` use this to render only the
 * first segment of a run with the `id="seif-N"` DOM anchor and the seif
 * chip — a second `id="seif-N"` in the same document is invalid HTML, and
 * `:key="segment.n"` would collide in the same way `v-for` requires unique
 * keys.
 */
export const isContinuationSegment = (
  segments: SourceSegment[],
  index: number,
): boolean => index > 0 && segments[index - 1]?.n === segments[index]?.n;

/**
 * A genuinely unique `v-for` key for a source segment list — `sefariaRef`
 * where present (unique per item: Sefaria's own `…N:1`, `…N:2` sub-item
 * suffixes disambiguate same-`n` continuations), falling back to `n`
 * combined with the segment's own position for the rare source with no
 * `sefariaRef` at all (see `sourceSegmentSchema.sefariaRef`).
 */
export const sourceSegmentKey = (
  segment: SourceSegment,
  index: number,
): string => segment.sefariaRef ?? `${segment.n}-${index}`;

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
 * Above this many distinct seifim, the mini-toc stops trying to be a full
 * jump list and summarizes instead (issue #91: consolidated `answers-*`
 * chapters, and the `questions-*` chapters that were always this shape,
 * run up to 253 items — a "mini" table of contents longer than the chapter
 * itself defeats its own purpose, doubly so when every entry without its
 * own `heading` reads as the same generic "Seif N" label the reader is
 * about to scroll past anyway). Measured over the full committed corpus:
 * `chapter` kind tops out at 22 segments, `inner-observation` at 35 — this
 * sits comfortably above both, so neither is ever summarized — while every
 * `questions-*`/`answers-*` chapter has at least 30 (median 96), so most of
 * them are.
 */
export const MINI_TOC_LIMIT = 40;

export interface MiniToc {
  /** Capped at `MINI_TOC_LIMIT` entries — see `truncated`/`total`. */
  entries: MiniTocEntry[];
  /** True once `total` exceeds `MINI_TOC_LIMIT` — `entries` is a prefix, not the full list. */
  truncated: boolean;
  /** The chapter's actual distinct seif count, even when `entries` is capped. */
  total: number;
}

/**
 * Builds `ReaderSummaryBody`'s fallback mini-table-of-contents from a
 * source version's segments: one entry per *distinct* `n` (issue #91: a
 * consolidated answer split across several segments shares one `n` — a
 * second mini-toc entry for it would jump nowhere new, since only the
 * first such segment carries the `id="seif-N"` DOM anchor — see
 * `isContinuationSegment`), labelled by its `heading` where the version has
 * one (only chapters 1-2's Hebrew edition do, currently), falling back to a
 * generic "Seif N" label otherwise — so the entry list is never shorter
 * than the chapter's own distinct seif count, and the mini-toc is never an
 * empty box even for a chapter with no `heading` data at all.
 */
export const sourceMiniTocEntries = (
  segments: SourceSegment[],
  seifLabel: (n: number) => string,
): MiniToc => {
  const entries = segments
    .filter((segment, index) => !isContinuationSegment(segments, index))
    .map((segment) => ({
      anchorId: sourceSegmentAnchorId(segment.n),
      label: segment.heading?.trim() || seifLabel(segment.n),
    }));

  return {
    entries: entries.slice(0, MINI_TOC_LIMIT),
    truncated: entries.length > MINI_TOC_LIMIT,
    total: entries.length,
  };
};
