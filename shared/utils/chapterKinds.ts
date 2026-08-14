/**
 * Reading order of chapter kinds — the single copy.
 *
 * A part's `TocChapter.number` is only unique *within* a kind (`chapter` 1-2
 * and `inner-observation` 1-10 both start at 1), so every consumer that puts
 * a part's chapters in true reading order needs this list to break the tie:
 * all of one kind before the next.
 *
 * It used to be duplicated in four places — `app/utils/chapterGrouping.ts`,
 * `scripts/lib/toc-builder.ts`, `scripts/lib/toc-splits.ts` and
 * `nuxt.config.ts` — each with a comment asking the next person to keep them
 * in sync, because `app/` modules cannot be imported from `scripts/` or from
 * the root-tsconfig'd `nuxt.config.ts`. `shared/` has no such problem: it is
 * exactly the layer all four already reach into (`shared/types/content.ts`,
 * `shared/utils/languages.ts`), which is why this lives here rather than
 * being copied a fifth time when issue #86 added the Cause-and-Effect kinds.
 *
 * `app/` code imports it through `~~/shared/utils/chapterKinds`.
 */
import type { ChapterKind } from "../types/content";

/**
 * Questions and answers pair up by subject — terminology, then topics, then
 * cause-and-effect — and each subject's questions sit with the other
 * questions rather than beside their own answers, because that is how the
 * printed edition sets them: two tables at the back of a part, not six.
 */
export const CHAPTER_KIND_ORDER: readonly ChapterKind[] = [
  // First, because it introduces the whole work and the reader meets it
  // before Part 1's first chapter — which is exactly why it is housed in
  // part-01 (issue #86).
  "introduction",
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "questions-cause-effect",
  "answers-terminology",
  "answers-topics",
  "answers-cause-effect",
];

/** Position in reading order; `-1` for a kind not listed, matching `indexOf`. */
export const chapterKindOrder = (kind: ChapterKind): number =>
  CHAPTER_KIND_ORDER.indexOf(kind);
