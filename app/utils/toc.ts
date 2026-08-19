/**
 * Pure helpers over the split ToC files app code loads directly:
 * `content/toc.volumes.json` (the volumes -> parts skeleton, no chapter
 * lists) and `content/toc.parts/part-NN.json` (one part's full chapters
 * plus its own + parent volume's identity) — see
 * `useLocalizedVolumes`/`useLocalizedParts` for the loaders and AGENTS.md
 * "Content model" for the file shapes. No I/O, no Zod.
 *
 * App code must never import `content/toc.json` (the full, un-split ToC)
 * directly — these helpers deliberately operate over the smaller
 * per-volume-skeleton/per-part shapes instead.
 */
import type {
  ChapterKind,
  TocChapter,
  TocPartFile,
  TocPartSkeleton,
  TocVolumeSkeleton,
} from "~~/shared/types/content";
import { KIND_ORDER } from "./chapterGrouping";
import type { LocalizedText } from "./localization";

/** A prev/next chapter nav link — just enough to render the label + href. */
export interface ChapterLink {
  id: string;
  title: LocalizedText;
}

/**
 * A part's chapters in true reading order: kind first (`KIND_ORDER` —
 * chapter, then inner-observation, then questions, then answers), `number`
 * within a kind second. `TocChapter.number` alone is only unique per kind
 * (e.g. `chapter` chapters 1-2 and `inner-observation` chapters 1-10 both
 * start at 1), so sorting by `number` alone would interleave kinds instead
 * of reading through one before the next. `scripts/lib/toc-splits.ts` keeps
 * its own copy of this exact order (see that file's comment) when it
 * derives `firstChapterId`/`lastChapterId` for `toc.volumes.json`.
 */
export const orderedPartChapters = (chapters: TocChapter[]): TocChapter[] =>
  [...chapters].sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      a.number - b.number,
  );

/** Finds a chapter by id within an already-loaded part file. */
export const findChapterInPart = (
  partFile: TocPartFile,
  chapterId: string,
): TocChapter | undefined =>
  partFile.chapters.find((chapter) => chapter.id === chapterId);

/**
 * A part's `inner-observation` kind chapters only, in section order (by
 * `number` — every chapter here shares the one kind, so there's no
 * kind-interleaving concern `orderedPartChapters` exists for). Powers the
 * Inner Observation pane/mobile slide: absent entirely for five parts (5,
 * 11, 14, 15, 16 — confirmed against KabbalahMedia's own source, not a gap
 * in our import), present but never chapter-scoped for the rest — see
 * `usePartScopedSections`.
 */
export const innerObservationChaptersInPart = (
  chapters: TocChapter[],
): TocChapter[] =>
  chapters
    .filter((chapter) => chapter.kind === "inner-observation")
    .sort((a, b) => a.number - b.number);

/**
 * The kinds behind the third pane's Questions and Answers tabs, in the order
 * the printed book asks them: terminology first, then topics, then part 6's
 * Cause and Effect (the only part that has one).
 *
 * Listed explicitly rather than matched on a `questions-`/`answers-` prefix:
 * `ChapterKind` is a closed enum, and a prefix test would silently adopt any
 * future kind that happened to start with the same word into a reader pane
 * nobody had decided it belonged in.
 */
const QUESTION_KINDS: ChapterKind[] = [
  "questions-terminology",
  "questions-topics",
  "questions-cause-effect",
];

const ANSWER_KINDS: ChapterKind[] = [
  "answers-terminology",
  "answers-topics",
  "answers-cause-effect",
];

const chaptersOfKinds = (
  chapters: TocChapter[],
  kinds: ChapterKind[],
): TocChapter[] =>
  chapters
    .filter((chapter) => kinds.includes(chapter.kind))
    .sort(
      (a, b) =>
        kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.number - b.number,
    );

/**
 * A part's question chapters, for the third pane's Questions tab.
 *
 * Every one of the 16 parts has these (issue #91 consolidated them to one
 * chapter per kind), which is what lets the third pane exist even for the
 * five parts with no Inner Observation at all.
 */
export const questionsChaptersInPart = (chapters: TocChapter[]): TocChapter[] =>
  chaptersOfKinds(chapters, QUESTION_KINDS);

/** A part's answer chapters, for the third pane's Answers tab. */
export const answersChaptersInPart = (chapters: TocChapter[]): TocChapter[] =>
  chaptersOfKinds(chapters, ANSWER_KINDS);

/** Original mode's Prev/Next pagination position within a part. */
export interface PartPaginationPosition {
  /** 1-based position of the current chapter within the part's ToC order. */
  index: number;
  total: number;
  prev: TocChapter | null;
  next: TocChapter | null;
}

/**
 * Original mode reproduces KabbalahMedia's own single-column pager
 * ("◀ Prev. | N/M | Next ▶"), paginating through one part's chapters in ToC
 * order (`orderedPartChapters`) — every chapter/questions/answers/inner-
 * observation "node" the part has, not just its main `chapter`-kind ones.
 *
 * NOTE: `orderedPartChapters` sorts kind-then-number via the single global
 * `KIND_ORDER` (`~/utils/chapterGrouping`), which only matches
 * KabbalahMedia's own physical ordering for parts 1-3 — it interleaves each
 * question table with its matching answer table per-part for the rest.
 * Fixing that needs a per-part order recorded by the importer, which is out
 * of scope here; this just consumes whatever order `orderedPartChapters`
 * already produces.
 */
export const partPaginationPosition = (
  chapters: TocChapter[],
  chapterId: string,
): PartPaginationPosition | null => {
  const ordered = orderedPartChapters(chapters);
  const index = ordered.findIndex((chapter) => chapter.id === chapterId);
  if (index === -1) return null;

  return {
    index: index + 1,
    total: ordered.length,
    prev: index > 0 ? (ordered[index - 1] ?? null) : null,
    next: index < ordered.length - 1 ? (ordered[index + 1] ?? null) : null,
  };
};

/**
 * URL slug for a volume's contents page (`/volumes/<slug>`), e.g.
 * `volume-1` — independent of the zero-padded volume id (`volume-01`).
 */
export const volumeSlug = (volume: { number: number }): string =>
  `volume-${volume.number}`;

/** Finds a volume skeleton entry by its URL slug (see `volumeSlug`). */
export const findVolumeBySlug = (
  volumes: TocVolumeSkeleton[],
  slug: string,
): TocVolumeSkeleton | undefined =>
  volumes.find((volume) => volumeSlug(volume) === slug);

/**
 * Whether a volume has any populated parts yet — drives the "coming soon"
 * disabled state on the volumes index page. Data-driven rather than
 * hardcoded, so a volume flips to "active" automatically once content
 * lands for any of its parts.
 */
export const volumeHasContent = (volume: TocVolumeSkeleton): boolean =>
  volume.parts.some((part) => part.chapterCount > 0);

/** Every part across every volume, in volume -> part reading order. */
export const flattenPartSkeletons = (
  volumes: TocVolumeSkeleton[],
): TocPartSkeleton[] =>
  [...volumes]
    .sort((a, b) => a.number - b.number)
    .flatMap((volume) => [...volume.parts].sort((a, b) => a.number - b.number));

/** The part immediately before/after `partId` in reading order, if any. */
export const adjacentParts = (
  volumes: TocVolumeSkeleton[],
  partId: string,
): { prevPart: TocPartSkeleton | null; nextPart: TocPartSkeleton | null } => {
  const parts = flattenPartSkeletons(volumes);
  const index = parts.findIndex((part) => part.id === partId);

  if (index === -1) return { prevPart: null, nextPart: null };

  return {
    prevPart: index > 0 ? (parts[index - 1] ?? null) : null,
    nextPart: index < parts.length - 1 ? (parts[index + 1] ?? null) : null,
  };
};

/**
 * Previous/next chapter nav links, crossing part and volume boundaries.
 * Within the current part, walks the part file's own chapters
 * (`orderedPartChapters` — unchanged logic from before the ToC split); at a
 * part boundary, uses the adjacent part's `firstChapterId`/`lastChapterId`
 * + `firstChapterTitle`/`lastChapterTitle` from the volumes skeleton, so
 * the reader never has to load the neighbor part's full file just to label
 * a nav link.
 */
export const prevNextChapterLinks = (
  volumes: TocVolumeSkeleton[],
  partFile: TocPartFile,
  chapterId: string,
): { prev: ChapterLink | null; next: ChapterLink | null } => {
  const ordered = orderedPartChapters(partFile.chapters);
  const index = ordered.findIndex((chapter) => chapter.id === chapterId);

  if (index === -1) return { prev: null, next: null };

  const prevInPart = index > 0 ? ordered[index - 1] : undefined;
  const nextInPart =
    index < ordered.length - 1 ? ordered[index + 1] : undefined;
  const { prevPart, nextPart } = adjacentParts(volumes, partFile.part.id);

  const prev: ChapterLink | null = prevInPart
    ? { id: prevInPart.id, title: prevInPart.title }
    : prevPart?.lastChapterId && prevPart.lastChapterTitle
      ? { id: prevPart.lastChapterId, title: prevPart.lastChapterTitle }
      : null;

  const next: ChapterLink | null = nextInPart
    ? { id: nextInPart.id, title: nextInPart.title }
    : nextPart?.firstChapterId && nextPart.firstChapterTitle
      ? { id: nextPart.firstChapterId, title: nextPart.firstChapterTitle }
      : null;

  return { prev, next };
};
