// Covers the committed offset map (issue #103): collecting it from a
// Sefaria index, merging a single-part refresh into it, and the floor check
// `validate-content.ts` runs over every committed `sefariaRef`.
//
// The index fixture below is a trimmed but verbatim slice of Sefaria's own
// `/api/v2/index/Talmud_Eser_HaSefirot` — the two offset shapes this book
// actually uses, plus one node with no offsets at all.
import { describe, expect, it } from "vitest";
import type { SefariaIndex } from "../../scripts/lib/sefaria-api-types.ts";
import {
  collectOffsetNodes,
  mergeOffsetNodes,
  offsetViolations,
  resolveOffsetNodeRef,
} from "../../scripts/lib/sefaria-offset-nodes.ts";

const BOOK = "Talmud Eser HaSefirot";

const INDEX: SefariaIndex = {
  title: BOOK,
  heTitle: "תלמוד עשר הספירות",
  schema: {
    nodes: [
      {
        key: "Section I",
        title: "Section I",
        heTitle: "חלק א",
        nodes: [
          {
            key: "default",
            title: "",
            heTitle: "",
            depth: 2,
            sectionNames: ["Chapter", "Seif"],
          },
          {
            key: "Histaklut Penimit",
            title: "Histaklut Penimit",
            heTitle: "הסתכלות פנימית",
            depth: 2,
            sectionNames: ["Chapter", "Paragraph"],
            index_offsets_by_depth: { "2": [0, 9, 14] },
          },
          {
            key: "List of Questions on Topics",
            title: "List of Questions on Topics",
            heTitle: "שאלות בנושאים",
            depth: 1,
            sectionNames: ["Paragraph"],
            index_offsets_by_depth: { "1": 54 },
          },
        ],
      },
    ],
  },
};

const HISTAKLUT = `${BOOK}, Section I, Histaklut Penimit`;
const QUESTIONS = `${BOOK}, Section I, List of Questions on Topics`;

describe("collectOffsetNodes", () => {
  const collected = collectOffsetNodes(INDEX);

  it("keys each offset-carrying node by the ref base the importer composes", () => {
    expect(Object.keys(collected.nodes)).toEqual([HISTAKLUT, QUESTIONS]);
  });

  it("carries the node shape, not just the numbers", () => {
    expect(collected.nodes[HISTAKLUT]).toEqual({
      depth: 2,
      sectionNames: ["Chapter", "Paragraph"],
      indexOffsetsByDepth: { "2": [0, 9, 14] },
    });
  });

  it("omits nodes that start at 1 — absence is the common case", () => {
    expect(collected.nodes[`${BOOK}, Section I`]).toBeUndefined();
  });
});

describe("mergeOffsetNodes", () => {
  it("keeps entries a single-part refresh did not see", () => {
    const merged = mergeOffsetNodes(
      {
        nodes: {
          [`${BOOK}, Section XVI, List of Questions on Topics`]: {
            depth: 1,
            sectionNames: ["Paragraph"],
            indexOffsetsByDepth: { "1": 253 },
          },
        },
      },
      collectOffsetNodes(INDEX),
    );

    expect(Object.keys(merged.nodes)).toHaveLength(3);
    expect(
      merged.nodes[`${BOOK}, Section XVI, List of Questions on Topics`],
    ).toBeDefined();
  });

  it("lets a fresh index win where both have the node", () => {
    const merged = mergeOffsetNodes(
      {
        nodes: {
          [QUESTIONS]: {
            depth: 1,
            sectionNames: ["Paragraph"],
            indexOffsetsByDepth: { "1": 1 },
          },
        },
      },
      collectOffsetNodes(INDEX),
    );

    expect(merged.nodes[QUESTIONS]?.indexOffsetsByDepth).toEqual({ "1": 54 });
  });
});

describe("resolveOffsetNodeRef", () => {
  const offsets = collectOffsetNodes(INDEX);

  it("matches the longest node prefix, never a shorter parent", () => {
    expect(resolveOffsetNodeRef(offsets, `${HISTAKLUT} 2:10`)?.refBase).toBe(
      HISTAKLUT,
    );
  });

  it("returns null for a ref under no offset-carrying node", () => {
    expect(resolveOffsetNodeRef(offsets, `${BOOK}, Section I 3:4`)).toBeNull();
  });

  it("returns null for a non-numeric address rather than guessing", () => {
    expect(resolveOffsetNodeRef(offsets, `${QUESTIONS} intro`)).toBeNull();
  });
});

describe("offsetViolations", () => {
  const offsets = collectOffsetNodes(INDEX);

  it("catches the depth-1 scalar case — the ref issue #103 was filed over", () => {
    expect(offsetViolations(offsets, `${QUESTIONS} 1`)).toEqual([
      { position: 1, value: 1, floor: 55 },
    ]);
  });

  it("passes a correctly offset depth-1 ref", () => {
    expect(offsetViolations(offsets, `${QUESTIONS} 55`)).toEqual([]);
  });

  it("catches the depth-2 array case, per chapter", () => {
    expect(offsetViolations(offsets, `${HISTAKLUT} 2:1`)).toEqual([
      { position: 2, value: 1, floor: 10 },
    ]);
    expect(offsetViolations(offsets, `${HISTAKLUT} 3:14`)).toEqual([
      { position: 2, value: 14, floor: 15 },
    ]);
  });

  it("leaves a chapter whose own offset is 0 alone", () => {
    expect(offsetViolations(offsets, `${HISTAKLUT} 1:1`)).toEqual([]);
  });

  it("does not offset the chapter component when only depth 2 is offset", () => {
    expect(offsetViolations(offsets, `${HISTAKLUT} 1:1`)).toEqual([]);
    expect(offsetViolations(offsets, `${HISTAKLUT} 2:10`)).toEqual([]);
  });

  it("treats a chapter beyond the array as unoffset rather than failing", () => {
    expect(offsetViolations(offsets, `${HISTAKLUT} 99:1`)).toEqual([]);
  });

  it("ignores refs outside every offset-carrying node", () => {
    expect(offsetViolations(offsets, `${BOOK}, Section I 1:1`)).toEqual([]);
  });
});
