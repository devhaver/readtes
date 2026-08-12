// `SummaryPane` (the old dedicated pane) is gone — `ReaderSummaryBody`, the
// component it wrapped, now renders directly inside `SourcePane`'s
// collapsible mini-toc details and study mode's `ChapterIntro`. This covers
// the component itself, decoupled from either host.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import ReaderSummaryBody from "~/components/reader/ReaderSummaryBody.vue";
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

const summaryItems: SummaryItem[] = [
  {
    id: "summary-1",
    targetSeif: 1,
    heading: "Before restriction: the simple light",
    html: "<p>Before anything…</p>",
  },
];

const sourceSegments: SourceSegment[] = [
  {
    n: 1,
    sefariaRef: "x 1",
    heading: "Before restriction",
    html: "",
    anchors: [],
  },
  { n: 2, sefariaRef: "x 2", html: "", anchors: [] },
];

describe("ReaderSummaryBody", () => {
  it("renders the curated summary when the chapter has one", async () => {
    const wrapper = await mountSuspended(ReaderSummaryBody, {
      props: { summaryItems, sourceSegments },
    });

    expect(wrapper.text()).toContain("Before restriction: the simple light");
    // The mini-toc must not also render alongside a real summary.
    expect(wrapper.find("nav").exists()).toBe(false);
  });

  it("falls back to a heading mini-toc when there's no summary layer", async () => {
    const wrapper = await mountSuspended(ReaderSummaryBody, {
      props: { summaryItems: [], sourceSegments },
    });

    // The name is the `<nav>`'s accessible label, never visible text: the
    // only host (`ChapterIntro`) already prints "In this chapter" in its
    // `<summary>`, directly above this. Rendering it again produced the
    // heading twice, one line apart.
    expect(wrapper.find("nav").attributes("aria-label")).toBe(
      "In this chapter",
    );
    expect(wrapper.text()).not.toContain("In this chapter");
    expect(wrapper.text()).toContain("Before restriction");
    // Segment 2 has no `heading` — falls back to a generic seif label so the
    // mini-toc entry count still matches the segment count.
    expect(wrapper.text()).toContain("Seif 2");
  });

  it("collapses a continuation segment (same n) into one mini-toc entry", async () => {
    // Issue #91: a consolidated answer split across several segments
    // shares one `n` — the mini-toc must not list it twice.
    const wrapper = await mountSuspended(ReaderSummaryBody, {
      props: {
        summaryItems: [],
        sourceSegments: [
          { n: 1, sefariaRef: "x 1:1", html: "", anchors: [] },
          { n: 1, sefariaRef: "x 1:2", html: "", anchors: [] },
          { n: 2, sefariaRef: "x 2:1", html: "", anchors: [] },
        ],
      },
    });

    expect(wrapper.findAll("button")).toHaveLength(2);
  });

  it("summarizes past MINI_TOC_LIMIT distinct seifim instead of listing them all", async () => {
    const longChapter: SourceSegment[] = Array.from(
      { length: MINI_TOC_LIMIT + 5 },
      (_, i) => ({
        n: i + 1,
        sefariaRef: `x ${i + 1}`,
        html: "",
        anchors: [],
      }),
    );

    const wrapper = await mountSuspended(ReaderSummaryBody, {
      props: { summaryItems: [], sourceSegments: longChapter },
    });

    expect(wrapper.findAll("button")).toHaveLength(MINI_TOC_LIMIT);
    expect(wrapper.text()).toContain("…and 5 more");
  });

  it("is never an empty box, even with no summary and no source segments", async () => {
    const wrapper = await mountSuspended(ReaderSummaryBody, {
      props: { summaryItems: [], sourceSegments: [] },
    });

    expect(wrapper.text().trim().length).toBeGreaterThan(0);
  });

  it("scrolls the matching seif into view on a mini-toc entry click — a plain local DOM jump, not the cross-pane anchor sync", async () => {
    Element.prototype.scrollIntoView = vi.fn();

    // The mini-toc's target (`#seif-1`) must exist in the same document for
    // the jump to find it — both real hosts (`SourcePane`, `ChapterIntro`)
    // render this body in the same container as the segments it targets.
    const target = document.createElement("li");
    target.id = "seif-1";
    document.body.appendChild(target);

    const wrapper = await mountSuspended(ReaderSummaryBody, {
      props: { summaryItems: [], sourceSegments },
    });

    const button = wrapper
      .findAll("button")
      .find((b) => b.text() === "Before restriction");
    expect(button).toBeTruthy();
    await button?.trigger("click");

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    target.remove();
  });
});
