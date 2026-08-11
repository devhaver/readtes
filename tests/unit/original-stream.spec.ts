import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import OriginalStream from "~/components/reader/OriginalStream.vue";
import type { PartPaginationPosition } from "~/utils/toc";
import type { CommentaryItem, SourceSegment } from "~~/shared/types/content";

const segments: SourceSegment[] = [
  { n: 1, sefariaRef: "x 1", html: "First seif.", anchors: ["op-1"] },
  { n: 2, sefariaRef: "x 2", html: "Second seif.", anchors: [] },
];

const commentaryItem = (anchorId: string): CommentaryItem => ({
  anchorId,
  order: 1,
  label: { en: "1", he: "א" },
  sefariaRef: "y",
  targetSeif: 1,
  section: "ohr-pnimi",
  html: "Inner Light commentary.",
});

const pagination: PartPaginationPosition = {
  index: 2,
  total: 5,
  prev: {
    id: "part-01/chapter-01",
    kind: "chapter",
    number: 1,
    title: { en: "Chapter 1", he: "פרק א" },
    availableLayers: ["source"],
    availableVersions: { summary: [], source: [], commentary: [] },
  },
  next: {
    id: "part-01/chapter-03",
    kind: "chapter",
    number: 3,
    title: { en: "Chapter 3", he: "פרק ג" },
    availableLayers: ["source"],
    availableVersions: { summary: [], source: [], commentary: [] },
  },
};

describe("OriginalStream", () => {
  it("renders the source segments, then an Inner Light heading, then the commentary items", async () => {
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [commentaryItem("op-1")],
        sourceMeta: null,
        commentaryMeta: null,
        pagination: null,
      },
    });

    const text = wrapper.text();
    expect(text).toContain("First seif.");
    expect(text).toContain("Inner Light");
    expect(text).toContain("Inner Light commentary.");
    expect(text.indexOf("Second seif.")).toBeLessThan(
      text.indexOf("Inner Light"),
    );
  });

  it("omits the Inner Light heading entirely when the chapter has no commentary", async () => {
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [],
        sourceMeta: null,
        commentaryMeta: null,
        pagination: null,
      },
    });

    expect(wrapper.text()).not.toContain("Inner Light");
  });

  it("renders the Prev/Next pager (twice — top and bottom) when a pagination position is given", async () => {
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [],
        sourceMeta: null,
        commentaryMeta: null,
        pagination,
      },
    });

    expect(wrapper.text()).toContain("2/5");
    const links = wrapper.findAll("a");
    expect(
      links.some((link) =>
        link.attributes("href")?.includes("part-01/chapter-01"),
      ),
    ).toBe(true);
    expect(
      links.some((link) =>
        link.attributes("href")?.includes("part-01/chapter-03"),
      ),
    ).toBe(true);
  });

  it("gives every seif its own `seif-N` id, so a `#seif-N` cross-reference lands", async () => {
    // Panes and study mode both carry these ids; original mode is a full
    // reading mode a reader can be persistently in, and a Questions/Answers
    // link targets `…#seif-N` (`useLinkedCrossRefs`) whichever mode is up.
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [],
        sourceMeta: null,
        commentaryMeta: null,
        pagination: null,
      },
    });

    expect(wrapper.find("#seif-1").exists()).toBe(true);
    expect(wrapper.find("#seif-2").text()).toContain("Second seif.");
  });

  it("renders no pager at all when there's no pagination position (unknown chapter)", async () => {
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [],
        sourceMeta: null,
        commentaryMeta: null,
        pagination: null,
      },
    });

    expect(wrapper.find('[role="navigation"], nav').exists()).toBe(false);
  });
});
