import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import SummaryPane from "~/components/reader/SummaryPane.vue";
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

describe("SummaryPane", () => {
  it("renders the curated summary when the chapter has one", async () => {
    const wrapper = await mountSuspended(SummaryPane, {
      props: { summaryItems, sourceSegments },
    });

    expect(wrapper.text()).toContain("Before restriction: the simple light");
    // The mini-toc must not also render alongside a real summary.
    expect(wrapper.text()).not.toContain("In this chapter");
  });

  it("falls back to a heading mini-toc when there's no summary layer", async () => {
    const wrapper = await mountSuspended(SummaryPane, {
      props: { summaryItems: [], sourceSegments },
    });

    expect(wrapper.text()).toContain("In this chapter");
    expect(wrapper.text()).toContain("Before restriction");
    // Segment 2 has no `heading` — falls back to a generic seif label so the
    // mini-toc entry count still matches the segment count.
    expect(wrapper.text()).toContain("Seif 2");
  });

  it("is never an empty box, even with no summary and no source segments", async () => {
    const wrapper = await mountSuspended(SummaryPane, {
      props: { summaryItems: [], sourceSegments: [] },
    });

    expect(wrapper.text().trim().length).toBeGreaterThan(0);
  });

  it("activates a seif anchor from the summary pane on mini-toc entry click", async () => {
    const wrapper = await mountSuspended(SummaryPane, {
      props: { summaryItems: [], sourceSegments },
    });

    const button = wrapper
      .findAll("button")
      .find((b) => b.text() === "Before restriction");
    expect(button).toBeTruthy();
    await button?.trigger("click");
    // No error thrown, and the button exists/responds — the actual
    // cross-pane effect (SourcePane highlighting `seif-1`) is covered by
    // `useReaderState`'s own unit tests plus the source pane's handling of
    // `data-anchor`/`id` lookups.
  });
});
