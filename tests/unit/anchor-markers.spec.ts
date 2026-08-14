import { describe, expect, it } from "vitest";
import type { SourceSegment } from "~~/shared/types/content";
import { labelNamesMarker } from "~~/shared/utils/anchorMarkers";

const segment = (n: number, html: string): SourceSegment => ({
  n,
  sefariaRef: `x ${n}`,
  html,
  anchors: [],
});

const anchor = (id: string, marker: string) =>
  `<a class="tes-anchor" href="#${id}" data-anchor="${id}">${marker}</a>`;

describe("anchorMarkersFromSegments", () => {
  it("maps each anchor id to the marker the source text prints", () => {
    const markers = anchorMarkersFromSegments([
      segment(
        1,
        `Know that ${anchor("op-1", "1")} before ${anchor("op-2", "2")}`,
      ),
      segment(2, `When it arose ${anchor("op-12", "30")}`),
    ]);

    expect([...markers]).toEqual([
      ["op-1", "1"],
      ["op-2", "2"],
      ["op-12", "30"],
    ]);
  });

  it("captures the gematria markers the English edition prints (issue #96)", () => {
    // Bnei Baruch's own English document marks the 11th note "(20)" — the
    // gematria of כ — while its commentary list numbers that note "11".
    const markers = anchorMarkersFromSegments([
      segment(1, `light of Ein Sof ${anchor("op-11", "20")}`),
      segment(3, `the triangle ${anchor("op-16", "400")}`),
    ]);

    expect(markers.get("op-11")).toBe("20");
    expect(markers.get("op-16")).toBe("400");
  });

  it("keeps Hebrew letter markers exactly as printed", () => {
    const markers = anchorMarkersFromSegments([
      segment(1, `דע כי ${anchor("op-1", "א")}טרם ${anchor("op-11", "כ")}`),
    ]);

    expect(markers.get("op-1")).toBe("א");
    expect(markers.get("op-11")).toBe("כ");
  });

  it("strips inline markup inside a marker rather than emitting tags", () => {
    const markers = anchorMarkersFromSegments([
      segment(1, `x <a class="tes-anchor" data-anchor="op-1"><b>7</b></a>`),
    ]);

    expect(markers.get("op-1")).toBe("7");
  });

  it("skips an empty marker so the caller falls back to the stored label", () => {
    const markers = anchorMarkersFromSegments([
      segment(1, `x ${anchor("op-1", "")} y ${anchor("op-2", "  ")}`),
    ]);

    expect(markers.has("op-1")).toBe(false);
    expect(markers.has("op-2")).toBe(false);
  });

  it("keeps the first occurrence when an anchor id repeats", () => {
    const markers = anchorMarkersFromSegments([
      segment(1, anchor("op-1", "1")),
      segment(2, anchor("op-1", "999")),
    ]);

    expect(markers.get("op-1")).toBe("1");
  });

  it("returns an empty map for segments with no anchors at all", () => {
    expect(anchorMarkersFromSegments([segment(1, "plain text")]).size).toBe(0);
    expect(anchorMarkersFromSegments([]).size).toBe(0);
  });
});

describe("anchorMarkerOccurrences", () => {
  it("records every marker an anchor prints, in document order", () => {
    // `part-02/chapter-01` op-20 is one note covering two consecutive
    // letters, and the source marks the text twice — "ר" in one seif and
    // "ש" in the next. `anchorMarkersFromHtml` keeps only the first, which
    // is right for labelling a note and wrong for anything reasoning about
    // the text (issue #125).
    const markers = anchorMarkerOccurrences([
      `and it is called ${anchor("op-20", "ר")}the circle of Hochma`,
      `and is called ${anchor("op-20", "ש")}the circle of Bina`,
    ]);

    expect(markers.get("op-20")).toEqual(["ר", "ש"]);
  });

  it("skips an empty marker, so occurrence indices only count printed ones", () => {
    const markers = anchorMarkerOccurrences([
      `${anchor("op-1", "")} ${anchor("op-1", "א")}`,
    ]);

    expect(markers.get("op-1")).toEqual(["א"]);
  });
});

describe("replaceAnchorMarkers", () => {
  it("rewrites a marker and leaves every other byte alone", () => {
    const [html] = replaceAnchorMarkers(
      [`Know that ${anchor("op-11", "11")}the light`],
      () => "20",
    );

    expect(html).toBe(`Know that ${anchor("op-11", "20")}the light`);
  });

  it("counts occurrences across the whole sequence, not per string", () => {
    const seen: [string, number][] = [];

    replaceAnchorMarkers(
      [anchor("op-20", "ר"), anchor("op-20", "ש")],
      ({ anchorId, occurrence }) => {
        seen.push([anchorId, occurrence]);
        return null;
      },
    );

    expect(seen).toEqual([
      ["op-20", 0],
      ["op-20", 1],
    ]);
  });

  it("leaves an anchor alone when the callback returns null", () => {
    const [html] = replaceAnchorMarkers([anchor("op-1", "1")], () => null);

    expect(html).toBe(anchor("op-1", "1"));
  });

  it("refuses to rewrite a marker holding markup, and reports it", () => {
    const skipped: string[] = [];
    const original = `<a class="tes-anchor" data-anchor="op-1"><b>7</b></a>`;

    const [html] = replaceAnchorMarkers(
      [original],
      () => "20",
      ({ anchorId }) => skipped.push(anchorId),
    );

    expect(html).toBe(original);
    expect(skipped).toEqual(["op-1"]);
  });

  it("never asks about an anchor that prints nothing", () => {
    const asked: string[] = [];

    replaceAnchorMarkers([anchor("op-1", "  ")], ({ anchorId }) => {
      asked.push(anchorId);
      return "20";
    });

    expect(asked).toEqual([]);
  });
});

describe("labelNamesMarker", () => {
  it("accepts a label equal to the marker", () => {
    expect(labelNamesMarker("30", "30")).toBe(true);
  });

  it("accepts a label that lists the marker among several", () => {
    // `part-02/chapter-01` op-20 is labelled "ר וש" — one note covering two
    // printed letters — and the source prints the anchor twice, once per
    // letter.
    expect(labelNamesMarker("ר וש", "ר")).toBe(true);
    // The second token carries the conjunction ("and ש"), so it is not the
    // bare letter the text prints. Only the first occurrence is checked
    // against the label, so this costs nothing today — it is recorded here
    // so a future check reading every occurrence knows what it will hit.
    expect(labelNamesMarker("ר וש", "ש")).toBe(false);
  });

  it("rejects an invented ordinal that has no relation to the marker", () => {
    expect(labelNamesMarker("12", "30")).toBe(false);
  });

  it("compares whole tokens, never substrings", () => {
    expect(labelNamesMarker("300", "30")).toBe(false);
    expect(labelNamesMarker("30", "300")).toBe(false);
  });

  it("rejects a missing label rather than throwing", () => {
    expect(labelNamesMarker(undefined, "30")).toBe(false);
  });
});
