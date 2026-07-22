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
