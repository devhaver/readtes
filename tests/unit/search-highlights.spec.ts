import { describe, expect, it } from "vitest";
import { highlightedSearchExcerpt } from "~~/shared/utils/searchHighlights";

const highlighted = (excerpt: string, query: string) => {
  const parts = highlightedSearchExcerpt(excerpt, query);
  expect(parts.map((part) => part.text).join("")).toBe(excerpt);
  return parts.filter((part) => part.highlighted).map((part) => part.text);
};

describe("shared/utils/searchHighlights", () => {
  it("matches accents, decomposed marks, case and compatibility characters", () => {
    expect(highlighted("Café cafe\u0301 and ﬂower", "cafe")).toEqual([
      "Café",
      "cafe\u0301",
    ]);
    expect(highlighted("A ﬂower", "flower")).toEqual(["ﬂower"]);
  });

  it("keeps niqqud and internal quote marks in highlighted Hebrew", () => {
    expect(highlighted("אוֹר פְּנִימִי של ז״א", "אור פנימי")).toEqual([
      "אוֹר פְּנִימִי",
    ]);
    expect(highlighted("אוֹר של ז״א", "זא")).toEqual(["ז״א"]);
  });

  it("matches phrases across punctuation and whitespace without changing them", () => {
    expect(highlighted("“Light—  vessel”", "light vessel")).toEqual([
      "Light—  vessel",
    ]);
  });

  it("highlights separated tokens and merges overlapping matches", () => {
    expect(
      highlighted("Receiving the light", "light receive receiving"),
    ).toEqual(["Receiving", "light"]);
  });

  it("uses whole-string case normalization and preserves astral offsets", () => {
    expect(highlighted("🙂 ΟΣ café", "ος")).toEqual(["ΟΣ"]);
    expect(highlighted("🙂 ΟΣ café", "cafe")).toEqual(["café"]);
  });

  it("returns plain text for absent or punctuation-only queries", () => {
    expect(highlighted("Café", "other")).toEqual([]);
    expect(highlighted("Café", "—‘’")).toEqual([]);
    expect(highlightedSearchExcerpt("", "light")).toEqual([
      { highlighted: false, text: "" },
    ]);
  });
});
