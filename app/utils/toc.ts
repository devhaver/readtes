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

/** Flattens a `Toc` into every chapter, in volume -> part -> chapter reading order. */
export const flattenChapters = (toc: Toc): FlattenedChapter[] => {
  const volumes = [...toc.volumes].sort((a, b) => a.number - b.number);
  const flattened: FlattenedChapter[] = [];

  for (const volume of volumes) {
    const parts = [...volume.parts].sort((a, b) => a.number - b.number);

    for (const part of parts) {
      const chapters = [...part.chapters].sort((a, b) => a.number - b.number);

      for (const chapter of chapters) {
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
