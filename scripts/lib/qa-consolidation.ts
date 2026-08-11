/**
 * Merges the many originally-per-answer chapters of an `answers-terminology`
 * / `answers-topics` sibling node into the single consolidated chapter's
 * items (issue #91) — the answer chapters were the structural anomaly, the
 * `questions-*` chapters (always one chapter holding every question) were
 * always the right shape.
 *
 * Shared by the Sefaria importer (`import-sefaria.ts`, merging freshly
 * fetched per-answer `SourceSegment[]`) and `migrate-consolidate-qa.ts`
 * (rebuilding from the already-committed per-answer chapter files on disk)
 * so both produce byte-identical merged items for equivalent input — see
 * `tests/unit/qa-consolidation.spec.ts`.
 */
import type { ChapterKind, SourceSegment } from "../../shared/types/content.ts";

/** The two `ChapterKind`s issue #91 consolidates — every other kind is untouched. */
export const CONSOLIDATED_QA_KINDS: ChapterKind[] = [
  "answers-terminology",
  "answers-topics",
];

export const isConsolidatedQaKind = (kind: ChapterKind): boolean =>
  CONSOLIDATED_QA_KINDS.includes(kind);

/**
 * One per-answer chapter's own ordinal (its printed "answer number", e.g.
 * `answers-terminology-06` -> `6`) and its own segments — each segment still
 * carrying the *local* `n` it had inside its own one-answer file (almost
 * always `1`; a handful of answers are themselves broken into several
 * segments, numbered from `1` within that one answer).
 */
export interface AnswerUnitSegments {
  number: number;
  segments: SourceSegment[];
}

/**
 * Merges N per-answer chapters' segments into the single consolidated
 * chapter's items: every segment's `n` is reset to its originating answer's
 * `number` — so `#seif-N` addresses answer N directly, mirroring how a
 * `questions-*` chapter's `n` already addresses question N directly — while
 * `sefariaRef`, `heading`, `html` and `anchors` are carried verbatim. Units
 * are ordered by answer number; within a unit, segment order (relevant only
 * for the rare answer broken into several segments) is preserved, so
 * several output items can legitimately share the same `n`.
 */
export const consolidateAnswerSegments = (
  units: AnswerUnitSegments[],
): SourceSegment[] =>
  [...units]
    .sort((a, b) => a.number - b.number)
    .flatMap((unit) =>
      unit.segments.map((segment) => ({ ...segment, n: unit.number })),
    );
