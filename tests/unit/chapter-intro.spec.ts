import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ChapterIntro from "~/components/reader/ChapterIntro.vue";
import type { SourceSegment, SummaryItem } from "~~/shared/types/content";

const segment = (n: number, heading?: string): SourceSegment => ({
  n,
  sefariaRef: `x ${n}`,
  html: `Segment ${n}`,
  anchors: [],
  ...(heading ? { heading } : {}),
});

const summary: SummaryItem[] = [
  { id: "summary-1", heading: "Before restriction", html: "<p>Text</p>" },
];

const mountIntro = (
  sourceSegments: SourceSegment[],
  summaryItems: SummaryItem[] = [],
) =>
  mountSuspended(ChapterIntro, {
    props: { sourceSegments, summaryItems },
  });

describe("ChapterIntro", () => {
  it("renders nothing for a chapter with no headings and no summary", async () => {
    const wrapper = await mountIntro([segment(1), segment(2), segment(3)]);

    expect(wrapper.find("details").exists()).toBe(false);
  });

  it("renders nothing for a lone heading — a one-entry contents is not a contents", async () => {
    const wrapper = await mountIntro([segment(1, "Only heading"), segment(2)]);

    expect(wrapper.find("details").exists()).toBe(false);
  });

  it("renders once two segments carry a real heading", async () => {
    const wrapper = await mountIntro([
      segment(1, "First"),
      segment(2, "Second"),
    ]);

    expect(wrapper.find("details").exists()).toBe(true);
  });

  it("renders for a curated summary even with no headings", async () => {
    const wrapper = await mountIntro([segment(1)], summary);

    expect(wrapper.find("details").exists()).toBe(true);
    expect(wrapper.text()).toContain("Before restriction");
  });
});
