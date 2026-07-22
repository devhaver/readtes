import { describe, expect, it } from "vitest";
import {
  tocPartFileSchema,
  tocVolumesFileSchema,
  type ContentVersion,
  type Toc,
} from "~~/shared/types/content";
import {
  deriveTocPartFiles,
  deriveTocVolumesFile,
} from "../../scripts/lib/toc-splits.ts";

const versions: ContentVersion[] = [
  {
    id: "he-jerusalem-1956",
    language: "he",
    direction: "rtl",
    title: "ירושלים",
    license: "Public Domain",
    source: "sefaria",
  },
  {
    id: "en-sefaria-community",
    language: "en",
    direction: "ltr",
    title: "Sefaria Community Translation",
    license: "CC0",
    source: "sefaria",
  },
];

const fixtureToc: Toc = {
  volumes: [
    {
      id: "volume-01",
      number: 1,
      title: { en: "Volume 1", he: "כרך 1" },
      parts: [
        {
          id: "part-01",
          number: 1,
          sefariaNode: "Talmud Eser HaSefirot, Section I",
          title: { en: "Part 1", he: "חלק 1" },
          chapters: [
            {
              id: "part-01/chapter-02",
              kind: "chapter",
              number: 2,
              title: { en: "Chapter 2", he: "פרק ב׳" },
              availableLayers: ["source"],
              availableVersions: {
                summary: [],
                source: ["he-jerusalem-1956"],
                commentary: [],
              },
            },
            {
              id: "part-01/chapter-01",
              kind: "chapter",
              number: 1,
              title: { en: "Chapter 1", he: "פרק א׳" },
              availableLayers: ["source"],
              availableVersions: {
                summary: [],
                source: ["he-jerusalem-1956", "en-sefaria-community"],
                commentary: [],
              },
            },
            {
              id: "part-01/inner-observation-01",
              kind: "inner-observation",
              number: 1,
              title: { en: "Inner Observation 1", he: "הסתכלות פנימית א׳" },
              availableLayers: ["source"],
              availableVersions: {
                summary: [],
                source: ["he-jerusalem-1956"],
                commentary: [],
              },
            },
          ],
        },
        {
          id: "part-02",
          number: 2,
          sefariaNode: "Talmud Eser HaSefirot, Section II",
          title: { en: "Part 2", he: "חלק 2" },
          chapters: [],
        },
      ],
    },
    {
      id: "volume-02",
      number: 2,
      title: { en: "Volume 2", he: "כרך 2" },
      parts: [
        {
          id: "part-03",
          number: 3,
          sefariaNode: "Talmud Eser HaSefirot, Section III",
          title: { en: "Part 3", he: "חלק 3" },
          chapters: [
            {
              id: "part-03/chapter-01",
              kind: "chapter",
              number: 1,
              title: { en: "Chapter 1", he: "פרק א׳" },
              availableLayers: [],
              availableVersions: { summary: [], source: [], commentary: [] },
            },
          ],
        },
      ],
    },
  ],
};

describe("deriveTocVolumesFile", () => {
  const result = deriveTocVolumesFile(fixtureToc, versions);

  it("validates against tocVolumesFileSchema", () => {
    expect(tocVolumesFileSchema.safeParse(result).success).toBe(true);
  });

  it("keeps volume identity, drops chapter lists", () => {
    expect(result.volumes.map((v) => v.id)).toEqual(["volume-01", "volume-02"]);
    for (const volume of result.volumes) {
      for (const part of volume.parts) {
        expect(part).not.toHaveProperty("chapters");
      }
    }
  });

  it("computes chapterCount and kindsPresent per part", () => {
    const part01 = result.volumes[0]?.parts[0];
    expect(part01?.chapterCount).toBe(3);
    expect(part01?.kindsPresent).toEqual(["chapter", "inner-observation"]);

    const part02 = result.volumes[0]?.parts[1];
    expect(part02?.chapterCount).toBe(0);
    expect(part02?.kindsPresent).toEqual([]);
  });

  it("orders firstChapterId/lastChapterId by kind then number, not array order", () => {
    // part-01's chapters array above is authored out of order on purpose:
    // chapter-02, chapter-01, inner-observation-01. Reading order is
    // chapter-01, chapter-02, inner-observation-01.
    const part01 = result.volumes[0]?.parts[0];
    expect(part01?.firstChapterId).toBe("part-01/chapter-01");
    expect(part01?.lastChapterId).toBe("part-01/inner-observation-01");
    expect(part01?.firstChapterTitle).toEqual({
      en: "Chapter 1",
      he: "פרק א׳",
    });
    expect(part01?.lastChapterTitle).toEqual({
      en: "Inner Observation 1",
      he: "הסתכלות פנימית א׳",
    });
  });

  it("is null for first/lastChapterId on an empty part", () => {
    const part02 = result.volumes[0]?.parts[1];
    expect(part02?.firstChapterId).toBeNull();
    expect(part02?.lastChapterId).toBeNull();
    expect(part02?.firstChapterTitle).toBeNull();
    expect(part02?.lastChapterTitle).toBeNull();
  });

  it("computes availableSummary he/en coverage across the part's chapters", () => {
    // part-01: all 3 chapters have he; only chapter-01 has en -> he full, en partial.
    const part01 = result.volumes[0]?.parts[0];
    expect(part01?.availableSummary).toEqual({ he: "full", en: "partial" });

    // part-02: no chapters -> none/none.
    const part02 = result.volumes[0]?.parts[1];
    expect(part02?.availableSummary).toEqual({ he: "none", en: "none" });

    // part-03: one chapter, no versions at all -> none/none.
    const part03 = result.volumes[1]?.parts[0];
    expect(part03?.availableSummary).toEqual({ he: "none", en: "none" });
  });
});

describe("deriveTocPartFiles", () => {
  const results = deriveTocPartFiles(fixtureToc);

  it("emits one file per part, each validating against tocPartFileSchema", () => {
    expect(results.map((r) => r.part.id)).toEqual([
      "part-01",
      "part-02",
      "part-03",
    ]);
    for (const file of results) {
      expect(tocPartFileSchema.safeParse(file).success).toBe(true);
    }
  });

  it("carries the part's full TocChapter[] verbatim (including array order)", () => {
    const part01 = results.find((r) => r.part.id === "part-01");
    expect(part01?.chapters.map((c) => c.id)).toEqual([
      "part-01/chapter-02",
      "part-01/chapter-01",
      "part-01/inner-observation-01",
    ]);
  });

  it("carries the part's own identity and its parent volume's", () => {
    const part03 = results.find((r) => r.part.id === "part-03");
    expect(part03?.part).toEqual({
      id: "part-03",
      number: 3,
      title: { en: "Part 3", he: "חלק 3" },
    });
    expect(part03?.volume).toEqual({
      id: "volume-02",
      number: 2,
      title: { en: "Volume 2", he: "כרך 2" },
    });
  });
});
