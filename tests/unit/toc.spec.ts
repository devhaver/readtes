import { describe, expect, it } from "vitest";
import type { Toc } from "~~/shared/types/content";

const chapter = (id: string, number: number) => ({
  id,
  kind: "chapter" as const,
  number,
  title: { en: id, he: id },
  availableLayers: [],
  availableVersions: { summary: [], source: [], commentary: [] },
});

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
            chapter("part-01/chapter-01", 1),
            chapter("part-01/chapter-02", 2),
            chapter("part-01/chapter-03", 3),
          ],
        },
        {
          id: "part-02",
          number: 2,
          sefariaNode: "Talmud Eser HaSefirot, Section II",
          title: { en: "Part 2", he: "חלק 2" },
          chapters: [chapter("part-02/chapter-01", 1)],
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
          chapters: [chapter("part-03/chapter-01", 1)],
        },
      ],
    },
  ],
};

describe("flattenChapters", () => {
  it("flattens every chapter in volume -> part -> chapter reading order", () => {
    expect(
      flattenChapters(fixtureToc).map((entry) => entry.chapter.id),
    ).toEqual([
      "part-01/chapter-01",
      "part-01/chapter-02",
      "part-01/chapter-03",
      "part-02/chapter-01",
      "part-03/chapter-01",
    ]);
  });
});

describe("findChapter", () => {
  it("finds a chapter with its parent part and volume", () => {
    const found = findChapter(fixtureToc, "part-02/chapter-01");

    expect(found?.chapter.id).toBe("part-02/chapter-01");
    expect(found?.part.id).toBe("part-02");
    expect(found?.volume.id).toBe("volume-01");
  });

  it("returns undefined for an unknown chapter id", () => {
    expect(findChapter(fixtureToc, "part-99/chapter-01")).toBeUndefined();
  });
});

describe("prevNextChapter", () => {
  it("returns prev/next within the same part", () => {
    const { prev, next } = prevNextChapter(fixtureToc, "part-01/chapter-02");

    expect(prev?.chapter.id).toBe("part-01/chapter-01");
    expect(next?.chapter.id).toBe("part-01/chapter-03");
  });

  it("crosses a part boundary within the same volume", () => {
    const { next } = prevNextChapter(fixtureToc, "part-01/chapter-03");

    expect(next?.chapter.id).toBe("part-02/chapter-01");
  });

  it("crosses a volume boundary", () => {
    const { next } = prevNextChapter(fixtureToc, "part-02/chapter-01");

    expect(next?.chapter.id).toBe("part-03/chapter-01");
  });

  it("has a null prev at the corpus start", () => {
    const { prev } = prevNextChapter(fixtureToc, "part-01/chapter-01");

    expect(prev).toBeNull();
  });

  it("has a null next at the corpus end", () => {
    const { next } = prevNextChapter(fixtureToc, "part-03/chapter-01");

    expect(next).toBeNull();
  });

  it("returns nulls for an unknown chapter id", () => {
    expect(prevNextChapter(fixtureToc, "nope")).toEqual({
      prev: null,
      next: null,
    });
  });
});

describe("breadcrumbFor", () => {
  it("returns the volume/part/chapter chain for a known chapter", () => {
    const breadcrumb = breadcrumbFor(fixtureToc, "part-02/chapter-01");

    expect(breadcrumb).toEqual({
      volume: fixtureToc.volumes[0],
      part: fixtureToc.volumes[0]?.parts[1],
      chapter: fixtureToc.volumes[0]?.parts[1]?.chapters[0],
    });
  });

  it("returns null for an unknown chapter id", () => {
    expect(breadcrumbFor(fixtureToc, "nope")).toBeNull();
  });
});
