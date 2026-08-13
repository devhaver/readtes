import { describe, expect, it } from "vitest";
import type { ChapterKind, TocChapter } from "~~/shared/types/content";

const chapter = (
  id: string,
  kind: ChapterKind,
  number: number,
  itemCount?: number,
): TocChapter => ({
  id,
  kind,
  number,
  title: { en: id, he: id },
  availableLayers: [],
  availableVersions: { summary: [], source: [], commentary: [] },
  itemCount,
});

describe("groupChaptersByKind", () => {
  it("groups into chapters / inner-observation / questions / answers sections, in that order", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/answers-topics-01", "answers-topics", 1),
      chapter("part-01/questions-terminology-01", "questions-terminology", 1),
      chapter("part-01/chapter-01", "chapter", 1),
      chapter("part-01/inner-observation-01", "inner-observation", 1),
      chapter("part-01/answers-terminology-01", "answers-terminology", 1),
    ];

    const sections = groupChaptersByKind(chapters);

    expect(sections.map((s) => s.section)).toEqual([
      "chapters",
      "inner-observation",
      "questions",
      "answers",
    ]);
  });

  it("keeps individual rows for non-clustered kinds, sorted by chapter number", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/chapter-02", "chapter", 2),
      chapter("part-01/chapter-01", "chapter", 1),
    ];

    const [section] = groupChaptersByKind(chapters);

    expect(section?.entries).toEqual([
      { type: "chapter", chapter: chapters[1] },
      { type: "chapter", chapter: chapters[0] },
    ]);
  });

  it("clusters the single consolidated answers-terminology chapter, counted by its itemCount", () => {
    // Issue #91: a part holds exactly one `answers-terminology` `TocChapter`
    // now — the cluster's `count` has to come from `itemCount` (the real
    // answer count), since the chapter array itself is always length 1.
    const chapters: TocChapter[] = [
      chapter("part-01/answers-terminology-01", "answers-terminology", 1, 54),
    ];

    const sections = groupChaptersByKind(chapters);
    const answers = sections.find((s) => s.section === "answers");

    expect(answers?.entries).toEqual([
      {
        type: "cluster",
        kind: "answers-terminology",
        count: 54,
        firstChapter: chapters[0],
      },
    ]);
  });

  it("clusters answers-terminology and answers-topics independently within the answers section", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/answers-terminology-01", "answers-terminology", 1, 54),
      chapter("part-01/answers-topics-01", "answers-topics", 1, 51),
    ];

    const sections = groupChaptersByKind(chapters);
    const answers = sections.find((s) => s.section === "answers");

    expect(answers?.entries).toEqual([
      {
        type: "cluster",
        kind: "answers-terminology",
        count: 54,
        firstChapter: chapters[0],
      },
      {
        type: "cluster",
        kind: "answers-topics",
        count: 51,
        firstChapter: chapters[1],
      },
    ]);
  });

  it("falls back to the chapter count when itemCount is absent (no source version to read it from)", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/answers-terminology-01", "answers-terminology", 1),
    ];

    const sections = groupChaptersByKind(chapters);
    const answers = sections.find((s) => s.section === "answers");

    expect(answers?.entries).toEqual([
      {
        type: "cluster",
        kind: "answers-terminology",
        count: 1,
        firstChapter: chapters[0],
      },
    ]);
  });

  it("groups questions-terminology and questions-topics together under one 'questions' section", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/questions-topics-01", "questions-topics", 1),
      chapter("part-01/questions-terminology-01", "questions-terminology", 1),
    ];

    const sections = groupChaptersByKind(chapters);
    const questions = sections.find((s) => s.section === "questions");

    expect(questions?.entries).toEqual([
      { type: "chapter", chapter: chapters[1] },
      { type: "chapter", chapter: chapters[0] },
    ]);
  });

  it("omits sections with no chapters", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/chapter-01", "chapter", 1),
    ];

    expect(groupChaptersByKind(chapters)).toEqual([
      {
        section: "chapters",
        entries: [{ type: "chapter", chapter: chapters[0] }],
      },
    ]);
  });

  it("returns an empty array for a part with no chapters", () => {
    expect(groupChaptersByKind([])).toEqual([]);
  });
});

// Issue #86 added the Cause-and-Effect pair. These pin the two decisions
// that a new kind can silently get wrong: which section it lands in, and
// whether it clusters like the other answers lists.
describe("groupChaptersByKind — Cause and Effect (issue #86)", () => {
  it("reads questions in subject order: terminology, topics, cause-and-effect", () => {
    const chapters: TocChapter[] = [
      chapter("part-06/questions-cause-effect-01", "questions-cause-effect", 1),
      chapter("part-06/questions-topics-01", "questions-topics", 1),
      chapter("part-06/questions-terminology-01", "questions-terminology", 1),
    ];

    const [section] = groupChaptersByKind(chapters);

    expect(section?.section).toBe("questions");
    expect(
      section?.entries.map((entry) =>
        entry.type === "chapter" ? entry.chapter.kind : entry.kind,
      ),
    ).toEqual([
      "questions-terminology",
      "questions-topics",
      "questions-cause-effect",
    ]);
  });

  it("clusters the cause-and-effect answers on their real item count", () => {
    // Part 6's table is 34 answers folded into one chapter by issue #91 —
    // a plain row would read "chapter 1", the thing clustering exists to
    // avoid, and a new answers kind is exactly where that gets forgotten.
    const chapters: TocChapter[] = [
      chapter("part-06/answers-cause-effect-01", "answers-cause-effect", 1, 34),
    ];

    const [section] = groupChaptersByKind(chapters);

    expect(section?.entries).toEqual([
      {
        type: "cluster",
        kind: "answers-cause-effect",
        count: 34,
        firstChapter: expect.objectContaining({
          id: "part-06/answers-cause-effect-01",
        }),
      },
    ]);
  });
});
