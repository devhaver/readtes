/**
 * Loads a part's Inner Observation content: unlike every other layer, Inner
 * Observation isn't a per-chapter layer file — it lives in its own
 * `kind: "inner-observation"` chapters within the same part (see the
 * content model skill / AGENTS.md), so for any chapter in part N the Inner
 * Observation pane shows part N's `inner-observation` chapters' `source`
 * content, concatenated in section order — the exact same content
 * regardless of which chapter in the part the reader is on.
 *
 * Takes the part's already-loaded `TocChapter[]` (callers pass
 * `innerObservationChaptersInPart(partFile.chapters)`, `~/utils/toc`) rather
 * than re-resolving the part here, and reuses `useChapterContent`'s own
 * per-file lazy loader (`loadLayerFile`) so every version's
 * `content/parts/**` chunk is still only ever fetched once, not duplicated
 * behind a second `import.meta.glob` over the same files.
 *
 * There is no commentary layer for these chapters and none of the corpus's
 * Inner Observation items carry anchors, so this only ever loads `source`.
 */
import type { ComputedRef } from "vue";
import { loadLayerFile } from "~/composables/useChapterContent";
import type {
  ChapterLayerFile,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";

export interface InnerObservationSection {
  chapterId: string;
  title: TocChapter["title"];
  itemsByVersion: Record<string, ChapterLayerFile<SourceSegment> | null>;
}

export interface InnerObservationContent {
  /** Union of every section's available source versions, first-seen order. */
  versions: ComputedRef<string[]>;
  sections: ComputedRef<InnerObservationSection[]>;
}

export const useInnerObservationContent = async (
  partId: string,
  chapters: TocChapter[],
): Promise<InnerObservationContent> => {
  const sections = await Promise.all(
    chapters.map(async (chapter) => {
      const chapterSlug = chapter.id.split("/")[1] as string;
      const versionIds = chapter.availableVersions.source;

      const entries = await Promise.all(
        versionIds.map(async (versionId) => {
          const file = await loadLayerFile<SourceSegment>(
            partId,
            chapterSlug,
            "source",
            versionId,
          );
          return [versionId, file] as const;
        }),
      );

      return {
        chapterId: chapter.id,
        title: chapter.title,
        itemsByVersion: Object.fromEntries(entries),
      };
    }),
  );

  const versionIds: string[] = [];
  for (const section of sections) {
    for (const versionId of Object.keys(section.itemsByVersion)) {
      if (!versionIds.includes(versionId)) versionIds.push(versionId);
    }
  }

  return {
    versions: computed(() => versionIds),
    sections: computed(() => sections),
  };
};
