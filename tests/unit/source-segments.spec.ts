import { describe, expect, it } from "vitest";

describe("stripLeadingSeifNumber", () => {
  it("strips a leading number that matches the segment's own n", () => {
    expect(
      stripLeadingSeifNumber(
        "1. <b>Explaining the concept of the initial contraction</b>",
        1,
      ),
    ).toBe("<b>Explaining the concept of the initial contraction</b>");
  });

  it("strips regardless of extra whitespace after the period", () => {
    expect(stripLeadingSeifNumber("2.   The reason for creation", 2)).toBe(
      "The reason for creation",
    );
  });

  it("leaves the html alone when there's no leading number at all", () => {
    expect(stripLeadingSeifNumber("<b>No leading number here</b>", 1)).toBe(
      "<b>No leading number here</b>",
    );
  });

  it("leaves the html alone when the leading number doesn't match n (Hebrew has no such prefix)", () => {
    expect(stripLeadingSeifNumber("דע כי טרם שנאצלו", 1)).toBe(
      "דע כי טרם שנאצלו",
    );
  });

  it("leaves the html alone when a leading number happens not to equal this segment's n", () => {
    expect(stripLeadingSeifNumber("42. An unrelated leading number", 1)).toBe(
      "42. An unrelated leading number",
    );
  });
});

describe("sourceSegmentAnchorId", () => {
  it("builds the seif-N id scheme", () => {
    expect(sourceSegmentAnchorId(1)).toBe("seif-1");
    expect(sourceSegmentAnchorId(42)).toBe("seif-42");
  });
});

describe("sourceMiniTocEntries", () => {
  const seifLabel = (n: number) => `Seif ${n}`;

  it("uses each segment's heading when it has one", () => {
    const entries = sourceMiniTocEntries(
      [
        {
          n: 1,
          sefariaRef: "x 1",
          heading: "Before restriction",
          html: "",
          anchors: [],
        },
        {
          n: 2,
          sefariaRef: "x 2",
          heading: "The central point",
          html: "",
          anchors: [],
        },
      ],
      seifLabel,
    );

    expect(entries).toEqual([
      { anchorId: "seif-1", label: "Before restriction" },
      { anchorId: "seif-2", label: "The central point" },
    ]);
  });

  it("falls back to a generic seif label when a segment has no heading", () => {
    const entries = sourceMiniTocEntries(
      [{ n: 1, sefariaRef: "x 1", html: "", anchors: [] }],
      seifLabel,
    );

    expect(entries).toEqual([{ anchorId: "seif-1", label: "Seif 1" }]);
  });

  it("falls back for a blank/whitespace-only heading too", () => {
    const entries = sourceMiniTocEntries(
      [{ n: 1, sefariaRef: "x 1", heading: "   ", html: "", anchors: [] }],
      seifLabel,
    );

    expect(entries).toEqual([{ anchorId: "seif-1", label: "Seif 1" }]);
  });

  it("never shorter than the segment count, even with zero headings", () => {
    const entries = sourceMiniTocEntries(
      [
        { n: 1, sefariaRef: "x 1", html: "", anchors: [] },
        { n: 2, sefariaRef: "x 2", html: "", anchors: [] },
        { n: 3, sefariaRef: "x 3", html: "", anchors: [] },
      ],
      seifLabel,
    );

    expect(entries).toHaveLength(3);
  });
});
