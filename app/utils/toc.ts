/**
 * Pure helpers over a `Toc` value (volumes -> parts -> chapters, in reading
 * order). No I/O, no Zod — the app only ever needs the inferred types here.
 */
import type {
  Toc,
  TocChapter,
  TocPart,
  TocVolume,
} from "~~/shared/types/content";
import { KIND_ORDER } from "./chapterGrouping";

export interface FlattenedChapter {
  chapter: TocChapter;
  part: TocPart;
  volume: TocVolume;
}

export interface Breadcrumb {
  volume: TocVolume;
  part: TocPart;
  chapter: TocChapter;
}

/**
 * A part's chapters in true reading order: kind first (`KIND_ORDER` —
 * chapter, then inner-observation, then questions, then answers), `number`
 * within a kind second. `TocChapter.number` alone is only unique per kind
 * (e.g. `chapter` chapters 1-2 and `inner-observation` chapters 1-10 both
 * start at 1), so sorting by `number` alone would interleave kinds instead
 * of reading through one before the next.
 */
const orderedChapters = (chapters: TocChapter[]): TocChapter[] =>
  [...chapters].sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      a.number - b.number,
  );

/** Flattens a `Toc` into every chapter, in volume -> part -> chapter reading order. */
export const flattenChapters = (toc: Toc): FlattenedChapter[] => {
  const volumes = [...toc.volumes].sort((a, b) => a.number - b.number);
  const flattened: FlattenedChapter[] = [];

  for (const volume of volumes) {
    const parts = [...volume.parts].sort((a, b) => a.number - b.number);

    for (const part of parts) {
      for (const chapter of orderedChapters(part.chapters)) {
        flattened.push({ chapter, part, volume });
      }
    }
  }

  return flattened;
};

/** Finds a chapter (with its parent part/volume) by chapter id. */
export const findChapter = (
  toc: Toc,
  chapterId: string,
): FlattenedChapter | undefined =>
  flattenChapters(toc).find((entry) => entry.chapter.id === chapterId);

/**
 * Returns the previous/next chapter in reading order, crossing part and
 * volume boundaries. Either side is `null` at the corpus start/end.
 */
export const prevNextChapter = (
  toc: Toc,
  chapterId: string,
): { prev: FlattenedChapter | null; next: FlattenedChapter | null } => {
  const flattened = flattenChapters(toc);
  const index = flattened.findIndex((entry) => entry.chapter.id === chapterId);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index > 0 ? (flattened[index - 1] ?? null) : null,
    next: index < flattened.length - 1 ? (flattened[index + 1] ?? null) : null,
  };
};

/** Returns the volume/part/chapter chain for a chapter id, for breadcrumb UI. */
export const breadcrumbFor = (
  toc: Toc,
  chapterId: string,
): Breadcrumb | null => {
  const entry = findChapter(toc, chapterId);
  return entry
    ? { volume: entry.volume, part: entry.part, chapter: entry.chapter }
    : null;
};

/**
 * URL slug for a volume's contents page (`/volumes/<slug>`), e.g.
 * `volume-1` — independent of the zero-padded `TocVolume.id` (`volume-01`).
 */
export const volumeSlug = (volume: TocVolume): string =>
  `volume-${volume.number}`;

/** Finds a volume by its URL slug (see `volumeSlug`). */
export const findVolumeBySlug = (
  toc: Toc,
  slug: string,
): TocVolume | undefined =>
  toc.volumes.find((volume) => volumeSlug(volume) === slug);

/**
 * Whether a volume has any populated chapters yet — drives the "coming
 * soon" disabled state on the volumes index page. Data-driven rather than
 * hardcoded, so a volume flips to "active" automatically once content
 * lands for any of its parts.
 */
export const volumeHasContent = (volume: TocVolume): boolean =>
  volume.parts.some((part) => part.chapters.length > 0);
