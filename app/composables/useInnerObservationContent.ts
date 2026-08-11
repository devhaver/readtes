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
 * part's Inner Observation essays. Issue #84's measurements of the built
 * site: `read/part-02/chapter-01/index.html` at 251KB for 8.7KB of its own
 * text, against 16KB for the equivalent page in a part that has none, and
 * ~411MB of the 751MB build attributable to this one duplication.
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
 * always resolves to `"pending"` with no sections. Only `onMounted` flips it.
 * `versions` is derived from the ToC's `availableVersions` instead of from
 * the loaded files precisely so the pane's version `<select>` stays
 * identical on both sides of hydration.
 *
 * Three states, not two. Moving the bodies to a client fetch makes a failure
 * mode reachable that prerendered markup could not have: a cached HTML
 * document that outlives the hashed chunks it references (a redeploy between
 * the document being cached and the pane being opened) 404s on every one of
 * them. `"failed"` is therefore distinct from `"ready"` with no sections —
 * the pane must never tell a reader that a part they can see listed in the
 * ToC has no Inner Observation just because a fetch fell over.
 *
 * The recovery for that state is a page reload, not an in-place retry, and
 * deliberately so: these bodies arrive by `import()`, and the module map
 * records a module's failure permanently for the lifetime of the document.
 * Measured against the dev server with the source requests routed to abort,
 * then unblocked: re-running the load issued zero further network requests
 * and stayed failed; `page.reload()` recovered it (137 items). A reload also
 * happens to be the actual fix for the failure this exists for, since it
 * fetches the current document and therefore the current chunk URLs. The
 * per-part cache still evicts a rejected load, so an ordinary chapter
 * navigation re-attempts it too.
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

/**
 * `"pending"` until the browser has the bodies, then `"ready"` (which may
 * still mean genuinely no sections) or `"failed"` (a chunk fetch threw —
 * never to be shown as "none available"). Parts with no Inner Observation
 * chapters start, and stay, `"ready"`.
 */
export type InnerObservationLoadState = "pending" | "ready" | "failed";

export interface InnerObservationContent {
  /** Union of every section's available source versions, first-seen order. */
  versions: ComputedRef<string[]>;
  /** Empty until the bodies have loaded in the browser — see the module doc. */
  sections: ComputedRef<InnerObservationSection[]>;
  /** Lets the pane tell "not loaded yet" and "load failed" from "genuinely empty". */
  state: ComputedRef<InnerObservationLoadState>;
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
// part's loader map and re-await ten already-imported modules on every
// chapter step within a part whose Inner Observation is, by definition,
// unchanged. It does not skip the skeleton — `state` still starts
// `"pending"` on each remount and is only settled from inside the mounted
// handler — it just makes that skeleton resolve in a microtask off an
// already-settled promise rather than after a fresh walk, so no skeleton
// frame reaches the screen. A rejected load is evicted so a failure isn't
// cached forever — the part's next chapter re-attempts it.
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

/**
 * `enabled` gates the *fetch* (never the ToC-derived `versions`, which the
 * pane header needs unconditionally): the reader's study and original modes
 * render no Inner Observation pane at all, so on a phone — where study is
 * the resolved default — fetching the part's bodies is pure waste. Callers
 * pass a getter over `useReaderMode`'s `mode`; it is watched from inside
 * `onMounted` with `immediate: true`, so a reader who later switches into
 * panes mode still gets the load, with no ordering assumption about when the
 * mode settles beyond "not before this component is mounted".
 *
 * Note for callers gating on `mode`: `useReaderMode` only consults the
 * viewport in its own `onMounted`. In the reader page that hook belongs to
 * `layouts/reader.vue` (the provide owner) rather than to the page, and the
 * page is Suspense-wrapped by its own top-level `await`s, so the layout has
 * already mounted and settled the mode before the page's `onMounted` runs —
 * the gate reads a real viewport value, not the fixed pre-mount default.
 * Do not rely on setup-call ordering for this; a caller that mounts before
 * whoever owns `useReaderMode`'s hook would evaluate `enabled` against the
 * pre-mount mode ("panes") and load on every viewport. The watch below makes
 * that a lost optimisation rather than a bug.
 */
export const useInnerObservationContent = (
  partId: string,
  chapters: TocChapter[],
  enabled: () => boolean = () => true,
): InnerObservationContent => {
  const versionIds = innerObservationVersionIds(chapters);
  const hasChapters = chapters.length > 0;

  const sections = shallowRef<InnerObservationSection[]>([]);
  const state = ref<InnerObservationLoadState>(
    hasChapters ? "pending" : "ready",
  );

  const load = async () => {
    state.value = "pending";
    try {
      sections.value = await loadPartSections(partId, chapters);
      state.value = "ready";
    } catch {
      // A failed chunk fetch gets its own state — never the empty one, which
      // would tell the reader this part has no Inner Observation when the ToC
      // says it has — and is swallowed here rather than taken to an unhandled
      // rejection that would surface as a page-level error.
      sections.value = [];
      state.value = "failed";
    }
  };

  onMounted(() => {
    if (!hasChapters) return;

    let started = false;
    watch(
      enabled,
      (on) => {
        if (!on || started) return;
        started = true;
        void load();
      },
      { immediate: true },
    );
  });

  return {
    versions: computed(() => versionIds),
    sections: computed(() => sections.value),
    state: computed(() => state.value),
  };
};
