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

describe("isContinuationSegment", () => {
  // Issue #91: a consolidated answer split across several Sefaria
  // sub-items shares one `n` — the second (and later) segment(s) render as
  // continuations, without their own `id="seif-N"` anchor or seif chip.
  const segments = [
    { n: 1, sefariaRef: "x 1:1", html: "", anchors: [] },
    { n: 2, sefariaRef: "x 2:1", html: "", anchors: [] },
    { n: 2, sefariaRef: "x 2:2", html: "", anchors: [] },
    { n: 2, sefariaRef: "x 2:3", html: "", anchors: [] },
    { n: 3, sefariaRef: "x 3:1", html: "", anchors: [] },
  ];

  it("is false for the first segment of a run", () => {
    expect(isContinuationSegment(segments, 0)).toBe(false);
    expect(isContinuationSegment(segments, 1)).toBe(false);
    expect(isContinuationSegment(segments, 4)).toBe(false);
  });

  it("is true for every later segment sharing the same n", () => {
    expect(isContinuationSegment(segments, 2)).toBe(true);
    expect(isContinuationSegment(segments, 3)).toBe(true);
  });
});

describe("sourceSegmentKey", () => {
  it("uses sefariaRef when present, even across a same-n pair", () => {
    const first = { n: 2, sefariaRef: "x 2:1", html: "", anchors: [] };
    const second = { n: 2, sefariaRef: "x 2:2", html: "", anchors: [] };

    expect(sourceSegmentKey(first, 1)).toBe("x 2:1");
    expect(sourceSegmentKey(second, 2)).toBe("x 2:2");
    expect(sourceSegmentKey(first, 1)).not.toBe(sourceSegmentKey(second, 2));
  });

  it("falls back to n + index when sefariaRef is absent", () => {
    const segment = { n: 5, html: "", anchors: [] };

    expect(sourceSegmentKey(segment, 3)).toBe("5-3");
  });
});

describe("sourceMiniTocEntries", () => {
  const seifLabel = (n: number) => `Seif ${n}`;

  it("uses each segment's heading when it has one", () => {
    const { entries } = sourceMiniTocEntries(
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
    const { entries } = sourceMiniTocEntries(
      [{ n: 1, sefariaRef: "x 1", html: "", anchors: [] }],
      seifLabel,
    );

    expect(entries).toEqual([{ anchorId: "seif-1", label: "Seif 1" }]);
  });

  it("falls back for a blank/whitespace-only heading too", () => {
    const { entries } = sourceMiniTocEntries(
      [{ n: 1, sefariaRef: "x 1", heading: "   ", html: "", anchors: [] }],
      seifLabel,
    );

    expect(entries).toEqual([{ anchorId: "seif-1", label: "Seif 1" }]);
  });

  it("never shorter than the distinct seif count, even with zero headings", () => {
    const { entries, total } = sourceMiniTocEntries(
      [
        { n: 1, sefariaRef: "x 1", html: "", anchors: [] },
        { n: 2, sefariaRef: "x 2", html: "", anchors: [] },
        { n: 3, sefariaRef: "x 3", html: "", anchors: [] },
      ],
      seifLabel,
    );

    expect(entries).toHaveLength(3);
    expect(total).toBe(3);
  });

  it("collapses a continuation segment into its first segment's entry", () => {
    // Issue #91: a consolidated answer split across several segments
    // shares one `n` — only the first gets a mini-toc entry, since only it
    // carries the `id="seif-N"` DOM anchor.
    const { entries, total } = sourceMiniTocEntries(
      [
        { n: 1, sefariaRef: "x 1:1", html: "", anchors: [] },
        { n: 2, sefariaRef: "x 2:1", html: "", anchors: [] },
        { n: 2, sefariaRef: "x 2:2", html: "", anchors: [] },
        { n: 3, sefariaRef: "x 3:1", html: "", anchors: [] },
      ],
      seifLabel,
    );

    expect(entries.map((entry) => entry.anchorId)).toEqual([
      "seif-1",
      "seif-2",
      "seif-3",
    ]);
    expect(total).toBe(3);
  });

  it("caps entries at MINI_TOC_LIMIT and reports the true total as truncated", () => {
    const segments = Array.from({ length: MINI_TOC_LIMIT + 10 }, (_, i) => ({
      n: i + 1,
      sefariaRef: `x ${i + 1}`,
      html: "",
      anchors: [],
    }));

    const { entries, truncated, total } = sourceMiniTocEntries(
      segments,
      seifLabel,
    );

    expect(entries).toHaveLength(MINI_TOC_LIMIT);
    expect(truncated).toBe(true);
    expect(total).toBe(MINI_TOC_LIMIT + 10);
  });

  it("is not truncated at exactly MINI_TOC_LIMIT distinct seifim", () => {
    const segments = Array.from({ length: MINI_TOC_LIMIT }, (_, i) => ({
      n: i + 1,
      sefariaRef: `x ${i + 1}`,
      html: "",
      anchors: [],
    }));

    const { entries, truncated } = sourceMiniTocEntries(segments, seifLabel);

    expect(entries).toHaveLength(MINI_TOC_LIMIT);
    expect(truncated).toBe(false);
  });
});
