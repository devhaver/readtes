import { describe, expect, it } from "vitest";
import {
  chapterRefFor,
  segmentRefFor,
  type IndexOffsetsByDepth,
} from "../../scripts/lib/sefaria-refs.ts";

// Shapes and offsets below are verbatim from Sefaria's own index for this
// book (`/api/v2/raw/index/Talmud_Eser_HaSefirot`), and the expected refs
// were confirmed live against `/api/v3/texts/…` — see issue #103.
const PARAGRAPH_LIST = { depth: 1, sectionNames: ["Paragraph"] };
const SIMAN_PARAGRAPH = { depth: 2, sectionNames: ["Siman", "Paragraph"] };
const CHAPTER_PARAGRAPH = { depth: 2, sectionNames: ["Chapter", "Paragraph"] };
const CHAPTER_ONLY = { depth: 1, sectionNames: ["Chapter"] };

const SECTION_VI = "Talmud Eser HaSefirot, Section VI";
const TOPICS_OFFSET: IndexOffsetsByDepth = { "1": 30 };
/** Section I Histaklut Penimit — one cumulative paragraph offset per chapter. */
const HISTAKLUT_OFFSET: IndexOffsetsByDepth = {
  "2": [0, 9, 14, 15, 21, 23, 26, 28, 32, 34],
};

describe("index offsets — depth-1 scalar (issue #103)", () => {
  const base = `${SECTION_VI}, List of Questions on Topics`;

  it("offsets the segment on a flat Paragraph list, where the item is the first address component", () => {
    // Verified live: `… List of Questions on Topics 1` is a 404 and `31` is a 200.
    expect(segmentRefFor(base, PARAGRAPH_LIST, 1, TOPICS_OFFSET)).toBe(
      `${base} 31`,
    );
    expect(segmentRefFor(base, PARAGRAPH_LIST, 12, TOPICS_OFFSET)).toBe(
      `${base} 42`,
    );
  });

  it("offsets the chapter on a Siman/Paragraph list, where the siman is the first component", () => {
    const answers = `${SECTION_VI}, List of Answers on Topics`;

    expect(chapterRefFor(answers, 1, TOPICS_OFFSET)).toBe(`${answers} 31`);
    // ...and the paragraph within it is NOT offset — there is no depth-2 entry.
    expect(
      segmentRefFor(`${answers} 31`, SIMAN_PARAGRAPH, 1, TOPICS_OFFSET),
    ).toBe(`${answers} 31:1`);
  });

  it("does not double-apply: a flat list's chapter ref is the base itself", () => {
    expect(chapterRefFor(base, undefined, TOPICS_OFFSET)).toBe(base);
  });
});

describe("index offsets — depth-2 array (issue #103)", () => {
  const base = "Talmud Eser HaSefirot, Section I, Histaklut Penimit";

  it("offsets the paragraph by its own chapter's entry", () => {
    // Verified live: `…Histaklut Penimit 2:1` is a 404, `2:10` is a 200,
    // and `3:15` is a 200.
    expect(
      segmentRefFor(`${base} 2`, CHAPTER_PARAGRAPH, 1, HISTAKLUT_OFFSET, 1),
    ).toBe(`${base} 2:10`);
    expect(
      segmentRefFor(`${base} 3`, CHAPTER_PARAGRAPH, 1, HISTAKLUT_OFFSET, 2),
    ).toBe(`${base} 3:15`);
  });

  it("leaves the first chapter unoffset — its entry is 0", () => {
    expect(
      segmentRefFor(`${base} 1`, CHAPTER_PARAGRAPH, 1, HISTAKLUT_OFFSET, 0),
    ).toBe(`${base} 1:1`);
  });

  it("does not offset the chapter number itself — there is no depth-1 entry", () => {
    expect(chapterRefFor(base, 2, HISTAKLUT_OFFSET)).toBe(`${base} 2`);
  });

  it("falls back to no offset for a chapter beyond the array", () => {
    expect(
      segmentRefFor(`${base} 99`, CHAPTER_PARAGRAPH, 1, HISTAKLUT_OFFSET, 98),
    ).toBe(`${base} 99:1`);
  });
});

describe("index offsets — nodes without them are unchanged", () => {
  const base = "Talmud Eser HaSefirot, Section I";

  it("composes a chapter ref with no offsets given", () => {
    expect(chapterRefFor(base, 3)).toBe(`${base} 3`);
  });

  it("composes a segment ref with no offsets given", () => {
    expect(segmentRefFor(`${base} 3`, CHAPTER_PARAGRAPH, 4)).toBe(
      `${base} 3:4`,
    );
    expect(segmentRefFor(base, PARAGRAPH_LIST, 4)).toBe(`${base} 4`);
  });

  it("still treats a depth-1 [Chapter] node as its own single segment", () => {
    expect(segmentRefFor(`${base} 3`, CHAPTER_ONLY, 1, { "1": 99 })).toBe(
      `${base} 3`,
    );
  });
});
