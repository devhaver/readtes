import { describe, expect, it } from "vitest";
import type { ChapterKind, TocChapter } from "~~/shared/types/content";

const chapter = (
  id: string,
  kind: ChapterKind,
  number: number,
): TocChapter => ({
  id,
  kind,
  number,
  title: { en: id, he: id },
  availableLayers: [],
  availableVersions: { summary: [], source: [], commentary: [] },
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

  it("collapses answers-terminology into a single cluster with a count and the first chapter", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/answers-terminology-03", "answers-terminology", 3),
      chapter("part-01/answers-terminology-01", "answers-terminology", 1),
      chapter("part-01/answers-terminology-02", "answers-terminology", 2),
    ];

    const sections = groupChaptersByKind(chapters);
    const answers = sections.find((s) => s.section === "answers");

    expect(answers?.entries).toEqual([
      {
        type: "cluster",
        kind: "answers-terminology",
        count: 3,
        firstChapter: chapters[1],
      },
    ]);
  });

  it("clusters answers-terminology and answers-topics independently within the answers section", () => {
    const chapters: TocChapter[] = [
      chapter("part-01/answers-terminology-01", "answers-terminology", 1),
      chapter("part-01/answers-terminology-02", "answers-terminology", 2),
      chapter("part-01/answers-topics-01", "answers-topics", 1),
    ];

    const sections = groupChaptersByKind(chapters);
    const answers = sections.find((s) => s.section === "answers");

    expect(answers?.entries).toEqual([
      {
        type: "cluster",
        kind: "answers-terminology",
        count: 2,
        firstChapter: chapters[0],
      },
      {
        type: "cluster",
        kind: "answers-topics",
        count: 1,
        firstChapter: chapters[2],
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
