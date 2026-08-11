import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import type {
  ChapterLayerFile,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";

// `useInnerObservationContent` reuses `useChapterContent`'s per-file lazy
// loader; stubbing it keeps this spec about *when* the bodies are fetched
// (never during setup/SSR, once per part after mount) rather than about the
// committed corpus.
const { loadLayerFile } = vi.hoisted(() => ({ loadLayerFile: vi.fn() }));

vi.mock("~/composables/useChapterContent", () => ({ loadLayerFile }));

const layerFile = (
  chapterId: string,
  versionId: string,
): ChapterLayerFile<SourceSegment> => ({
  chapterId,
  layer: "source",
  versionId,
  items: [{ n: 1, sefariaRef: `${chapterId} 1`, html: "Body.", anchors: [] }],
});

const innerObservationChapter = (
  id: string,
  sourceVersions: string[],
): TocChapter => ({
  id,
  kind: "inner-observation",
  number: 1,
  title: { en: `Histaklut ${id}`, he: `הסתכלות ${id}` },
  availableLayers: ["source"],
  availableVersions: { summary: [], source: sourceVersions, commentary: [] },
});

// A microtask flush deep enough for the composable's `onMounted` handler
// (an `await` per section, plus one per version inside it) to settle.
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

const mountHost = async (partId: string, chapters: TocChapter[]) => {
  const Host = defineComponent({
    setup() {
      const content = useInnerObservationContent(partId, chapters);
      // Captured synchronously in `setup` — i.e. what the prerendered HTML
      // and the client's hydrating render both resolve to.
      const preMount = {
        pending: content.pending.value,
        sections: content.sections.value,
        loads: loadLayerFile.mock.calls.length,
      };
      return { content, preMount };
    },
    render: () => null,
  });

  return await mountSuspended(Host);
};

describe("innerObservationVersionIds", () => {
  it("unions the ToC's source versions across sections, in first-seen order", () => {
    expect(
      innerObservationVersionIds([
        innerObservationChapter("part-01/inner-observation-01", [
          "he-jerusalem-1956",
          "en-bb",
        ]),
        innerObservationChapter("part-01/inner-observation-02", [
          "en-bb",
          "en-ai",
        ]),
      ]),
    ).toEqual(["he-jerusalem-1956", "en-bb", "en-ai"]);
  });

  it("returns an empty list for a part with no Inner Observation chapters", () => {
    expect(innerObservationVersionIds([])).toEqual([]);
  });
});

describe("useInnerObservationContent (hydration)", () => {
  it("fetches no bodies during setup, then loads them after mount", async () => {
    loadLayerFile.mockImplementation(
      (_partId, chapterSlug, _layer, versionId) =>
        Promise.resolve(layerFile(`part-90/${chapterSlug}`, versionId)),
    );

    const chapters = [
      innerObservationChapter("part-90/inner-observation-01", [
        "he-jerusalem-1956",
      ]),
    ];

    const wrapper = await mountHost("part-90", chapters);

    // The scaling guarantee: prerendering must not pull a single body file
    // in, so the part's essays are never inlined into this chapter's HTML.
    expect(wrapper.vm.preMount.loads).toBe(0);
    expect(wrapper.vm.preMount.sections).toEqual([]);
    // ...and the pane is told it's pending, not empty, so it can't flash the
    // "no Inner Observation" message before the bodies arrive.
    expect(wrapper.vm.preMount.pending).toBe(true);

    // Versions come from the ToC, so the pane's version <select> is
    // identical on both sides of hydration even with no bodies loaded.
    expect(wrapper.vm.content.versions.value).toEqual(["he-jerusalem-1956"]);

    await flush();

    expect(wrapper.vm.content.pending.value).toBe(false);
    expect(wrapper.vm.content.sections.value).toEqual([
      {
        chapterId: "part-90/inner-observation-01",
        title: chapters[0]?.title,
        itemsByVersion: {
          "he-jerusalem-1956": layerFile(
            "part-90/inner-observation-01",
            "he-jerusalem-1956",
          ),
        },
      },
    ]);
  });

  it("loads a part's bodies once and reuses them across its chapters", async () => {
    loadLayerFile.mockClear();
    loadLayerFile.mockImplementation(
      (_partId, chapterSlug, _layer, versionId) =>
        Promise.resolve(layerFile(`part-91/${chapterSlug}`, versionId)),
    );

    const chapters = [
      innerObservationChapter("part-91/inner-observation-01", ["en-bb"]),
      innerObservationChapter("part-91/inner-observation-02", ["en-bb"]),
    ];

    const first = await mountHost("part-91", chapters);
    await flush();
    expect(loadLayerFile).toHaveBeenCalledTimes(2);

    // The next chapter of the same part remounts the page (`key:
    // route.fullPath`) — it must reuse the resolved sections rather than
    // re-walking the part's loader map.
    const second = await mountHost("part-91", chapters);
    await flush();

    expect(loadLayerFile).toHaveBeenCalledTimes(2);
    expect(second.vm.content.sections.value).toEqual(
      first.vm.content.sections.value,
    );
  });

  it("settles into the empty state when a body chunk fails to load", async () => {
    loadLayerFile.mockClear();
    loadLayerFile.mockRejectedValue(new Error("chunk load failed"));

    const wrapper = await mountHost("part-92", [
      innerObservationChapter("part-92/inner-observation-01", ["en-bb"]),
    ]);
    await flush();

    expect(wrapper.vm.content.pending.value).toBe(false);
    expect(wrapper.vm.content.sections.value).toEqual([]);
  });

  it("is never pending for a part with no Inner Observation chapters", async () => {
    loadLayerFile.mockClear();

    const wrapper = await mountHost("part-93", []);
    await flush();

    expect(wrapper.vm.content.pending.value).toBe(false);
    expect(loadLayerFile).not.toHaveBeenCalled();
  });
});
