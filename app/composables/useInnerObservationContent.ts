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
 *
 * CLIENT-ONLY BODIES (scaling fix, issue #84). Because the content is part-scoped,
 * server-rendering it made every chapter page of a part carry the whole
 * part's Inner Observation essays: `read/part-02/chapter-01/index.html` was
 * 251KB for 8.7KB of its own text, against 16KB for the equivalent page in a
 * part that has none — ~411MB of the 751MB build was this one duplication.
 * The bodies are therefore never loaded or rendered during prerendering;
 * `onMounted` fetches them in the browser instead, from the same per-part
 * content chunks the pane already used, so they cost one fetch for the whole
 * part rather than being re-inlined into hundreds of documents. Nothing
 * indexable is lost — each Inner Observation chapter still prerenders at its
 * own `/read/<part>/inner-observation-NN` URL, where it is the primary
 * (source-pane) content.
 *
 * Hydration note (same discipline as `useReaderVersions`/`useReaderMode`):
 * the loaded-ness of the bodies is state the server can't have, so the very
 * first render — prerendered HTML and the client's hydrating render alike —
 * always resolves to `pending` with no sections. Only `onMounted` flips it.
 * `versions` is derived from the ToC's `availableVersions` instead of from
 * the loaded files precisely so the pane's version `<select>` stays
 * identical on both sides of hydration.
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
  /** Empty until the bodies have loaded in the browser — see the module doc. */
  sections: ComputedRef<InnerObservationSection[]>;
  /** True while the bodies are still pending, so the pane can tell "not loaded yet" from "genuinely empty". */
  pending: ComputedRef<boolean>;
}

/** Union of the source versions the ToC lists for these chapters, first-seen order. */
export const innerObservationVersionIds = (
  chapters: TocChapter[],
): string[] => {
  const versionIds: string[] = [];
  for (const chapter of chapters) {
    for (const versionId of chapter.availableVersions.source) {
      if (!versionIds.includes(versionId)) versionIds.push(versionId);
    }
  }
  return versionIds;
};

const loadSections = async (
  partId: string,
  chapters: TocChapter[],
): Promise<InnerObservationSection[]> =>
  await Promise.all(
    chapters.map(async (chapter) => {
      const chapterSlug = chapter.id.split("/")[1] as string;

      const entries = await Promise.all(
        chapter.availableVersions.source.map(async (versionId) => {
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

// One in-flight/settled load per part, shared by every chapter page of that
// part: moving to `onMounted` means the page remounts (`key: route.fullPath`)
// on every chapter navigation, and without this each one would re-walk the
// part's loader map and re-await ten already-imported modules — a visible
// pending flicker on a page whose content is, by definition, unchanged. A
// rejected load is evicted so a transient chunk-fetch failure isn't cached
// forever.
const sectionsByPart = new Map<string, Promise<InnerObservationSection[]>>();

const loadPartSections = (
  partId: string,
  chapters: TocChapter[],
): Promise<InnerObservationSection[]> => {
  const cached = sectionsByPart.get(partId);
  if (cached) return cached;

  const pending = loadSections(partId, chapters).catch((error: unknown) => {
    sectionsByPart.delete(partId);
    throw error;
  });
  sectionsByPart.set(partId, pending);
  return pending;
};

export const useInnerObservationContent = (
  partId: string,
  chapters: TocChapter[],
): InnerObservationContent => {
  const versionIds = innerObservationVersionIds(chapters);

  const sections = shallowRef<InnerObservationSection[]>([]);
  const pending = ref(chapters.length > 0);

  onMounted(async () => {
    if (chapters.length === 0) return;

    try {
      sections.value = await loadPartSections(partId, chapters);
    } catch {
      // A failed chunk fetch leaves the pane on its empty state rather than
      // taking hydration down with an unhandled rejection.
      sections.value = [];
    } finally {
      pending.value = false;
    }
  });

  return {
    versions: computed(() => versionIds),
    sections: computed(() => sections.value),
    pending: computed(() => pending.value),
  };
};
