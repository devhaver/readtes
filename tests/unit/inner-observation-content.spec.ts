import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";
import type {
  ChapterLayerFile,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";

// `useInnerObservationContent` reuses `useChapterContent`'s per-file lazy
// loader; stubbing it keeps this spec about *when* the bodies are fetched
// (never during setup/SSR, once per part after mount, never at all while the
// pane's mode isn't showing) rather than about the committed corpus. The
// "essay text never reaches server-rendered HTML" invariant is guarded
// against the real corpus in `inner-observation-not-prerendered.spec.ts`.
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

const resolveTo = (partId: string) =>
  loadLayerFile.mockImplementation((_partId, chapterSlug, _layer, versionId) =>
    Promise.resolve(layerFile(`${partId}/${chapterSlug}`, versionId)),
  );

// A microtask flush deep enough for the composable's `onMounted` handler
// (an `await` per section, plus one per version inside it) to settle.
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

const mountHost = async (
  partId: string,
  chapters: TocChapter[],
  enabled?: () => boolean,
) => {
  const Host = defineComponent({
    setup() {
      const content = useInnerObservationContent(partId, chapters, enabled);
      // Captured synchronously in `setup` — i.e. what the prerendered HTML
      // and the client's hydrating render both resolve to.
      const preMount = {
        state: content.state.value,
        sections: content.sections.value,
        loads: loadLayerFile.mock.calls.length,
      };
      return { content, preMount };
    },
    render: () => null,
  });

  return await mountSuspended(Host);
};

// Every test asserts on call counts, and the composable's per-part cache is
// module-level; a fresh mock per test (plus a part id used nowhere else)
// keeps each one independent of the ones above it.
beforeEach(() => {
  loadLayerFile.mockReset();
});

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
    resolveTo("part-90");

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
    expect(wrapper.vm.preMount.state).toBe("pending");

    // Versions come from the ToC, so the pane's version <select> is
    // identical on both sides of hydration even with no bodies loaded.
    expect(wrapper.vm.content.versions.value).toEqual(["he-jerusalem-1956"]);

    await flush();

    expect(wrapper.vm.content.state.value).toBe("ready");
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
    resolveTo("part-91");

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

  // Regression guard for the state this change makes newly reachable: before
  // it, the bodies were in the prerendered HTML and could not fail. A cached
  // document that outlives its hashed chunks (redeploy) 404s them, and the
  // pane must not answer that with "this part has no Inner Observation".
  it("reports a failed load distinctly from an empty part", async () => {
    loadLayerFile.mockRejectedValue(new Error("chunk load failed"));

    const wrapper = await mountHost("part-92", [
      innerObservationChapter("part-92/inner-observation-01", ["en-bb"]),
    ]);
    await flush();

    expect(wrapper.vm.content.state.value).toBe("failed");
    expect(wrapper.vm.content.state.value).not.toBe("ready");
    expect(wrapper.vm.content.sections.value).toEqual([]);
  });

  it("evicts a rejected load so the next mount re-attempts it", async () => {
    const chapters = [
      innerObservationChapter("part-94/inner-observation-01", ["en-bb"]),
    ];

    loadLayerFile.mockRejectedValue(new Error("chunk load failed"));
    const first = await mountHost("part-94", chapters);
    await flush();
    expect(first.vm.content.state.value).toBe("failed");

    // Caching the rejection would strand every later chapter of the part on
    // the failed state even once the fetch would succeed.
    resolveTo("part-94");
    const second = await mountHost("part-94", chapters);
    await flush();

    expect(second.vm.content.state.value).toBe("ready");
    expect(second.vm.content.sections.value).toHaveLength(1);
  });

  it("is ready, not pending, for a part with no Inner Observation chapters", async () => {
    const wrapper = await mountHost("part-93", []);
    await flush();

    expect(wrapper.vm.content.state.value).toBe("ready");
    expect(loadLayerFile).not.toHaveBeenCalled();
  });
});

describe("useInnerObservationContent (mode gate)", () => {
  it("fetches nothing while the pane's mode isn't showing", async () => {
    resolveTo("part-95");

    const wrapper = await mountHost(
      "part-95",
      [innerObservationChapter("part-95/inner-observation-01", ["en-bb"])],
      () => false,
    );
    await flush();

    // Study and original modes render no Inner Observation pane at all, so
    // on a phone this is a whole part's essays not fetched.
    expect(loadLayerFile).not.toHaveBeenCalled();
    expect(wrapper.vm.content.state.value).toBe("pending");
  });

  it("loads as soon as the reader switches into the pane's mode", async () => {
    resolveTo("part-96");

    const showing = ref(false);
    const wrapper = await mountHost(
      "part-96",
      [innerObservationChapter("part-96/inner-observation-01", ["en-bb"])],
      () => showing.value,
    );
    await flush();
    expect(loadLayerFile).not.toHaveBeenCalled();

    showing.value = true;
    await flush();

    expect(loadLayerFile).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.content.state.value).toBe("ready");
  });
});
