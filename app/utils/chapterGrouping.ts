/**
 * Groups a part's chapters for display on a volume's contents page: main
 * chapters first, then Inner Observation (Histaklut Penimit), then the
 * Questions lists, then the Answers lists — clustered, since a part can
 * have 100+ tiny "answer" chapters that must not render as 100 rows (see
 * AGENTS.md "Unknown sibling nodes" / the Sefaria import coverage notes).
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

/** Reading order of kinds within a section — also the order sections are built in. */
const KIND_ORDER: ChapterKind[] = [
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "answers-terminology",
  "answers-topics",
];

/** Kinds compact enough in a typical part (1-2 chapters) to render as individual rows. */
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
 * collapsed into a single cluster entry each (count + link to the first).
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
          count: sorted.length,
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
