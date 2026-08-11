/**
 * Groups a part's chapters for display on a volume's contents page: main
 * chapters first, then Inner Observation (Histaklut Penimit), then the
 * Questions lists, then the Answers lists — `answers-*` rendered as a
 * single clustered row with the real answer count in parens, rather than
 * the misleading "chapter 1" a plain row would show now that issue #91
 * folded every answer of a kind into one `…-01` chapter (`sorted.length`
 * is always 1 post-consolidation — see `TocChapter.itemCount`, which is
 * what the cluster's `count` actually comes from).
 */
import type { ChapterKind, TocChapter } from "~~/shared/types/content";

/** The four row-grouping sections a volume's contents page renders, in order. */
export type ChapterSection =
  "chapters" | "inner-observation" | "questions" | "answers";

const SECTION_ORDER: ChapterSection[] = [
  "chapters",
  "inner-observation",
  "questions",
  "answers",
];

const SECTION_FOR_KIND: Record<ChapterKind, ChapterSection> = {
  chapter: "chapters",
  "inner-observation": "inner-observation",
  "questions-terminology": "questions",
  "questions-topics": "questions",
  "answers-terminology": "answers",
  "answers-topics": "answers",
};

/**
 * Reading order of kinds within a section — also the order sections are
 * built in. Exported so `~/utils/toc` (`orderedPartChapters`) can sort a
 * part's chapters into true reading order too: a part's `TocChapter.number`
 * is only unique *within* a kind (e.g. `chapter` chapters 1-2 and
 * `inner-observation` chapters 1-10 both start their own numbering at 1), so
 * sorting by `number` alone interleaves kinds instead of reading through one
 * kind before the next.
 */
export const KIND_ORDER: ChapterKind[] = [
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "answers-terminology",
  "answers-topics",
];

/** Kinds that render as one clustered row (count + link to the first chapter) rather than one row per chapter — see `groupChaptersByKind`'s doc comment. */
type ClusteredKind = "answers-terminology" | "answers-topics";
const CLUSTERED_KINDS = new Set<ChapterKind>([
  "answers-terminology",
  "answers-topics",
] satisfies ClusteredKind[]);

export interface ChapterRowEntry {
  type: "chapter";
  chapter: TocChapter;
}

export interface ChapterClusterEntry {
  type: "cluster";
  kind: ClusteredKind;
  count: number;
  /** The lowest-numbered chapter in the cluster — the cluster links here. */
  firstChapter: TocChapter;
}

export type ChapterGroupEntry = ChapterRowEntry | ChapterClusterEntry;

export interface ChapterGroupSection {
  section: ChapterSection;
  entries: ChapterGroupEntry[];
}

/**
 * Groups a part's chapters into display sections. Every kind keeps its
 * chapters in `number` order; `answers-terminology`/`answers-topics` are
 * collapsed into a single cluster entry each (count + link to the first —
 * "first" still matters even though there's only ever one `TocChapter` of
 * these kinds now, since it's what the cluster row links to).
 */
export const groupChaptersByKind = (
  chapters: TocChapter[],
): ChapterGroupSection[] => {
  const byKind = new Map<ChapterKind, TocChapter[]>();
  for (const chapter of chapters) {
    const list = byKind.get(chapter.kind) ?? [];
    list.push(chapter);
    byKind.set(chapter.kind, list);
  }

  const entriesBySection = new Map<ChapterSection, ChapterGroupEntry[]>();

  for (const kind of KIND_ORDER) {
    const kindChapters = byKind.get(kind);
    if (!kindChapters || kindChapters.length === 0) continue;

    const sorted = [...kindChapters].sort((a, b) => a.number - b.number);
    const section = SECTION_FOR_KIND[kind];
    const entries = entriesBySection.get(section) ?? [];

    if (CLUSTERED_KINDS.has(kind)) {
      const firstChapter = sorted[0];
      if (firstChapter) {
        entries.push({
          type: "cluster",
          kind: kind as ClusteredKind,
          // `firstChapter.itemCount` is the real answer count (issue #91);
          // `sorted.length` (always 1 post-consolidation) is only a
          // fallback for the edge case of no source version to read it
          // from at all — see `itemCountFor` in `scripts/lib/toc-splits.ts`.
          count: firstChapter.itemCount ?? sorted.length,
          firstChapter,
        });
      }
    } else {
      for (const chapter of sorted) {
        entries.push({ type: "chapter", chapter });
      }
    }

    entriesBySection.set(section, entries);
  }

  return SECTION_ORDER.map((section) => ({
    section,
    entries: entriesBySection.get(section) ?? [],
  })).filter((group) => group.entries.length > 0);
};
