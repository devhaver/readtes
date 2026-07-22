import { describe, expect, it } from "vitest";
import type {
  TocChapter,
  TocPartFile,
  TocVolumeSkeleton,
} from "~~/shared/types/content";

const chapterOf = (id: string, kind: TocChapter["kind"], number: number) => ({
  id,
  kind,
  number,
  title: { en: id, he: id },
  availableLayers: [],
  availableVersions: { summary: [], source: [], commentary: [] },
});

const chapter = (id: string, number: number) =>
  chapterOf(id, "chapter", number);

describe("orderedPartChapters", () => {
  it("orders chapters by kind first, then by number within the kind", () => {
    const chapters: TocChapter[] = [
      chapterOf("part-01/answers-terminology-02", "answers-terminology", 2),
      chapterOf("part-01/inner-observation-02", "inner-observation", 2),
      chapterOf("part-01/chapter-02", "chapter", 2),
      chapterOf("part-01/answers-terminology-01", "answers-terminology", 1),
      chapterOf("part-01/questions-terminology-01", "questions-terminology", 1),
      chapterOf("part-01/inner-observation-01", "inner-observation", 1),
      chapterOf("part-01/chapter-01", "chapter", 1),
    ];

    expect(orderedPartChapters(chapters).map((c) => c.id)).toEqual([
      "part-01/chapter-01",
      "part-01/chapter-02",
      "part-01/inner-observation-01",
      "part-01/inner-observation-02",
      "part-01/questions-terminology-01",
      "part-01/answers-terminology-01",
      "part-01/answers-terminology-02",
    ]);
  });
});

describe("findChapterInPart", () => {
  const partFile: TocPartFile = {
    part: { id: "part-01", number: 1, title: { en: "Part 1", he: "חלק 1" } },
    volume: {
      id: "volume-01",
      number: 1,
      title: { en: "Volume 1", he: "כרך 1" },
    },
    chapters: [
      chapter("part-01/chapter-01", 1),
      chapter("part-01/chapter-02", 2),
    ],
  };

  it("finds a chapter by id", () => {
    expect(findChapterInPart(partFile, "part-01/chapter-02")?.number).toBe(2);
  });

  it("returns undefined for an unknown chapter id", () => {
    expect(findChapterInPart(partFile, "part-01/chapter-99")).toBeUndefined();
  });
});

describe("volumeSlug", () => {
  it("builds a plain (non-zero-padded) slug from the volume number", () => {
    expect(volumeSlug({ number: 1 })).toBe("volume-1");
    expect(volumeSlug({ number: 2 })).toBe("volume-2");
  });
});

const skeletonVolumes: TocVolumeSkeleton[] = [
  {
    id: "volume-01",
    number: 1,
    title: { en: "Volume 1", he: "כרך 1" },
    parts: [
      {
        id: "part-01",
        number: 1,
        title: { en: "Part 1", he: "חלק 1" },
        sefariaNode: "x",
        chapterCount: 2,
        kindsPresent: ["chapter"],
        firstChapterId: "part-01/chapter-01",
        lastChapterId: "part-01/chapter-02",
        firstChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        lastChapterTitle: { en: "Chapter 2", he: "פרק ב׳" },
        availableSummary: { he: "full", en: "none" },
      },
      {
        id: "part-02",
        number: 2,
        title: { en: "Part 2", he: "חלק 2" },
        sefariaNode: "y",
        chapterCount: 1,
        kindsPresent: ["chapter"],
        firstChapterId: "part-02/chapter-01",
        lastChapterId: "part-02/chapter-01",
        firstChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        lastChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        availableSummary: { he: "full", en: "none" },
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
        title: { en: "Part 3", he: "חלק 3" },
        sefariaNode: "z",
        chapterCount: 1,
        kindsPresent: ["chapter"],
        firstChapterId: "part-03/chapter-01",
        lastChapterId: "part-03/chapter-01",
        firstChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        lastChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        availableSummary: { he: "full", en: "none" },
      },
    ],
  },
];

describe("findVolumeBySlug", () => {
  it("finds a volume by its URL slug", () => {
    expect(findVolumeBySlug(skeletonVolumes, "volume-2")?.id).toBe("volume-02");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findVolumeBySlug(skeletonVolumes, "volume-99")).toBeUndefined();
  });
});

describe("volumeHasContent", () => {
  it("is true when at least one part has chapters", () => {
    expect(volumeHasContent(skeletonVolumes[0]!)).toBe(true);
  });

  it("is false when every part is still empty", () => {
    const emptyVolume: TocVolumeSkeleton = {
      ...skeletonVolumes[0]!,
      parts: skeletonVolumes[0]!.parts.map((part) => ({
        ...part,
        chapterCount: 0,
      })),
    };

    expect(volumeHasContent(emptyVolume)).toBe(false);
  });

  it("is false for a volume with no parts at all", () => {
    expect(volumeHasContent({ ...skeletonVolumes[0]!, parts: [] })).toBe(false);
  });
});

describe("flattenPartSkeletons", () => {
  it("flattens every part in volume -> part reading order", () => {
    expect(flattenPartSkeletons(skeletonVolumes).map((p) => p.id)).toEqual([
      "part-01",
      "part-02",
      "part-03",
    ]);
  });
});

describe("adjacentParts", () => {
  it("returns the previous/next part within the same volume", () => {
    const { prevPart, nextPart } = adjacentParts(skeletonVolumes, "part-01");
    expect(prevPart).toBeNull();
    expect(nextPart?.id).toBe("part-02");
  });

  it("crosses a volume boundary", () => {
    const { nextPart } = adjacentParts(skeletonVolumes, "part-02");
    expect(nextPart?.id).toBe("part-03");
  });

  it("has null next at the corpus end", () => {
    const { nextPart } = adjacentParts(skeletonVolumes, "part-03");
    expect(nextPart).toBeNull();
  });

  it("returns nulls for an unknown part id", () => {
    expect(adjacentParts(skeletonVolumes, "part-99")).toEqual({
      prevPart: null,
      nextPart: null,
    });
  });
});

describe("prevNextChapterLinks", () => {
  const part01File: TocPartFile = {
    part: { id: "part-01", number: 1, title: { en: "Part 1", he: "חלק 1" } },
    volume: {
      id: "volume-01",
      number: 1,
      title: { en: "Volume 1", he: "כרך 1" },
    },
    chapters: [
      chapter("part-01/chapter-01", 1),
      chapter("part-01/chapter-02", 2),
    ],
  };

  it("returns prev within the same part when not at the part's first chapter", () => {
    const { prev } = prevNextChapterLinks(
      skeletonVolumes,
      part01File,
      "part-01/chapter-02",
    );

    expect(prev).toEqual({
      id: "part-01/chapter-01",
      title: { en: "part-01/chapter-01", he: "part-01/chapter-01" },
    });
  });

  it("has a null prev at the corpus start (first chapter, no prior part)", () => {
    const { prev } = prevNextChapterLinks(
      skeletonVolumes,
      part01File,
      "part-01/chapter-01",
    );
    expect(prev).toBeNull();
  });

  it("crosses a part boundary using the adjacent part's firstChapterId/firstChapterTitle — no neighbor part file loaded", () => {
    // part-01/chapter-02 is last-in-part -> next crosses into part-02's
    // firstChapterId/firstChapterTitle from the skeleton, never part-02's
    // own toc.parts file.
    const { next } = prevNextChapterLinks(
      skeletonVolumes,
      part01File,
      "part-01/chapter-02",
    );
    expect(next).toEqual({
      id: "part-02/chapter-01",
      title: { en: "Chapter 1", he: "פרק א׳" },
    });
  });

  it("returns nulls for an unknown chapter id", () => {
    expect(prevNextChapterLinks(skeletonVolumes, part01File, "nope")).toEqual({
      prev: null,
      next: null,
    });
  });
});
