import { describe, expect, it } from "vitest";
import {
  packBatches,
  proseLength,
  untranslatedItems,
  type TranslatableChapter,
} from "../../scripts/lib/translation-batches.ts";
import type { CommentaryItem } from "../../shared/types/content.ts";

const item = (
  anchorId: string,
  order: number,
  html: string,
): CommentaryItem => ({
  anchorId,
  order,
  label: { he: String(order), en: String(order) },
  section: "ohr-pnimi",
  html,
});

const chapter = (
  chapterId: string,
  items: CommentaryItem[],
): TranslatableChapter => ({
  chapterId,
  items,
  sourceSegments: [],
  targetSegments: null,
});

/** `n` characters of prose wrapped in markup, to prove tags aren't budgeted. */
const prose = (n: number) => `<b>${"א".repeat(n)}</b>`;

describe("proseLength", () => {
  it("measures the text, not the markup", () => {
    expect(proseLength("<b>abc</b>")).toBe(3);
    expect(proseLength("one<br><small>(x)</small>")).toBe(6);
  });

  it("counts an untagged string as-is", () => {
    expect(proseLength("hello")).toBe(5);
  });
});

describe("untranslatedItems", () => {
  it("returns the source items the target does not cover", () => {
    const source = [
      item("op-1", 1, "a"),
      item("op-2", 2, "b"),
      item("op-3", 3, "c"),
    ];
    const target = [item("op-2", 2, "translated")];

    expect(untranslatedItems(source, target).map((i) => i.anchorId)).toEqual([
      "op-1",
      "op-3",
    ]);
  });

  it("returns them in reading order regardless of input order", () => {
    const source = [item("op-9", 9, "a"), item("op-2", 2, "b")];

    expect(untranslatedItems(source, []).map((i) => i.order)).toEqual([2, 9]);
  });

  it("supports a partially translated chapter — the validator allows subsets", () => {
    const source = [item("op-1", 1, "a"), item("op-2", 2, "b")];

    expect(untranslatedItems(source, [source[0]!])).toHaveLength(1);
  });

  it("returns nothing when the chapter is fully covered", () => {
    const source = [item("op-1", 1, "a")];
    expect(untranslatedItems(source, source)).toEqual([]);
  });
});

describe("packBatches", () => {
  it("closes a batch rather than exceeding the budget", () => {
    // Two 600-char chapters would be 1,200 against a 1,000 budget, so the
    // first batch closes at one chapter. The budget is a ceiling, not a
    // target — a token budget you overshoot is one a model may refuse.
    const chapters = [
      chapter("p/c1", [item("op-1", 1, prose(600))]),
      chapter("p/c2", [item("op-1", 1, prose(600))]),
      chapter("p/c3", [item("op-1", 1, prose(600))]),
    ];

    const batches = packBatches(chapters, 1000, "en");

    expect(batches.map((b) => b.chapters.map((c) => c.chapterId))).toEqual([
      ["p/c1"],
      ["p/c2"],
      ["p/c3"],
    ]);
  });

  it("packs several chapters together when they fit", () => {
    const chapters = [
      chapter("p/c1", [item("op-1", 1, prose(300))]),
      chapter("p/c2", [item("op-1", 1, prose(300))]),
      chapter("p/c3", [item("op-1", 1, prose(300))]),
      chapter("p/c4", [item("op-1", 1, prose(300))]),
    ];

    const batches = packBatches(chapters, 1000, "en");

    expect(batches.map((b) => b.chapters.map((c) => c.chapterId))).toEqual([
      ["p/c1", "p/c2", "p/c3"],
      ["p/c4"],
    ]);
  });

  it("never exceeds the budget except for a single oversize chapter", () => {
    const chapters = Array.from({ length: 40 }, (_, index) =>
      chapter(`p/c${index}`, [item("op-1", 1, prose(100 + index * 37))]),
    );

    for (const batch of packBatches(chapters, 1000, "en")) {
      const overBudget = batch.chars > 1000;
      expect(overBudget && batch.chapters.length > 1).toBe(false);
    }
  });

  it("budgets on prose, so markup never inflates a batch", () => {
    const chapters = [chapter("p/c1", [item("op-1", 1, prose(100))])];

    expect(packBatches(chapters, 1000, "en")[0]?.chars).toBe(100);
  });

  it("gives an oversize chapter a batch of its own rather than splitting it", () => {
    // The corpus's largest single item is 37,057 characters — nearly double a
    // 20,000-char budget — and a chapter is one output file, so it must not be
    // split across batches.
    const chapters = [
      chapter("p/small", [item("op-1", 1, prose(100))]),
      chapter("p/huge", [item("op-1", 1, prose(37_057))]),
      chapter("p/after", [item("op-1", 1, prose(100))]),
    ];

    const batches = packBatches(chapters, 20_000, "en");

    expect(batches.map((b) => b.chapters.map((c) => c.chapterId))).toEqual([
      ["p/small"],
      ["p/huge"],
      ["p/after"],
    ]);
  });

  it("never splits a chapter's items across batches", () => {
    const chapters = [
      chapter("p/c1", [
        item("op-1", 1, prose(800)),
        item("op-2", 2, prose(800)),
      ]),
    ];

    const batches = packBatches(chapters, 1000, "en");

    expect(batches).toHaveLength(1);
    expect(batches[0]?.items).toBe(2);
  });

  it("numbers batches in order with a stable, zero-padded id", () => {
    const chapters = Array.from({ length: 3 }, (_, index) =>
      chapter(`p/c${index}`, [item("op-1", 1, prose(1200))]),
    );

    expect(packBatches(chapters, 1000, "en-part-05").map((b) => b.id)).toEqual([
      "en-part-05-001",
      "en-part-05-002",
      "en-part-05-003",
    ]);
  });

  it("reports item and character totals per batch", () => {
    const chapters = [
      chapter("p/c1", [
        item("op-1", 1, prose(300)),
        item("op-2", 2, prose(200)),
      ]),
    ];

    const [batch] = packBatches(chapters, 10_000, "en");

    expect(batch?.items).toBe(2);
    expect(batch?.chars).toBe(500);
  });

  it("returns no batches for no chapters", () => {
    expect(packBatches([], 1000, "en")).toEqual([]);
  });
});
