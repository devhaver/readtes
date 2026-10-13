import { describe, expect, it } from "vitest";

import {
  htmlToSearchText,
  normalizedSearchText,
  searchDocuments,
  type SearchDocument,
} from "~~/shared/utils/fullTextSearch";

const documents: SearchDocument[] = [
  {
    id: "part-01/chapter-01:source:he:1",
    chapterId: "part-01/chapter-01",
    layer: "source",
    versionId: "he-jerusalem-1956",
    language: "he",
    chapterTitle: "פרק א",
    partTitle: "חלק א",
    itemId: "seif-1",
    text: "דע, כי טרם שנאצלו הנאצלים ונבראו הנבראים",
  },
  {
    id: "part-01/chapter-01:source:en:1",
    chapterId: "part-01/chapter-01",
    layer: "source",
    versionId: "en-ai",
    language: "en",
    chapterTitle: "Chapter 1",
    partTitle: "Part 1",
    itemId: "seif-1",
    text: "Know that before the emanated beings were emanated and the created beings were created.",
  },
  {
    id: "part-02/chapter-01:commentary:en:1",
    chapterId: "part-02/chapter-01",
    layer: "commentary",
    versionId: "en-ai",
    language: "en",
    chapterTitle: "Chapter 1",
    partTitle: "Part 2",
    itemId: "op-1",
    text: "The desire to receive is the vessel for the light.",
  },
];

describe("shared/utils/fullTextSearch", () => {
  it("normalizes Hebrew niqqud, quote marks, punctuation, case, and whitespace", () => {
    expect(normalizedSearchText("  ז״א\nבְּחִינָה—LIGHT  ")).toBe(
      "זא בחינה light",
    );
  });

  it("turns content HTML into decoded, whitespace-normalized plain text", () => {
    expect(
      htmlToSearchText(
        '<b>Light</b><br>and&nbsp;<span title="ignored">vessel</span> &amp; screen',
      ),
    ).toBe("Light and vessel & screen");
  });

  it("requires every query token and can limit results to one language", () => {
    const results = searchDocuments(documents, {
      query: "created beings",
      language: "en",
      limit: 20,
    });

    expect(results.map((result) => result.document.id)).toEqual([
      "part-01/chapter-01:source:en:1",
    ]);
    expect(
      searchDocuments(documents, {
        query: "created vessel",
        language: "en",
        limit: 20,
      }),
    ).toEqual([]);
  });

  it("finds unpointed Hebrew queries in pointed Hebrew text", () => {
    const pointed = [
      {
        ...(documents[0] as SearchDocument),
        text: "אוֹר פְּנִימִי מִתְלַבֵּשׁ בַּכְּלִי",
      },
    ];

    expect(
      searchDocuments(pointed, {
        query: "אור פנימי",
        language: "he",
        limit: 20,
      })[0]?.document.id,
    ).toBe(documents[0]?.id);
  });

  it("ranks an exact phrase before separated tokens and returns an excerpt", () => {
    const results = searchDocuments(
      [
        documents[2] as SearchDocument,
        {
          ...(documents[2] as SearchDocument),
          id: "separated",
          text: "The desire shapes a vessel that is prepared to receive abundance.",
        },
      ],
      { query: "desire to receive", language: "en", limit: 20 },
    );

    expect(results.map((result) => result.document.id)).toEqual([
      "part-02/chapter-01:commentary:en:1",
      "separated",
    ]);
    expect(results[0]?.excerpt).toContain("desire to receive");
  });

  it("uses document id as a stable tie-breaker and enforces the result limit", () => {
    const tied = [
      { ...(documents[2] as SearchDocument), id: "b" },
      { ...(documents[2] as SearchDocument), id: "a" },
    ];

    expect(
      searchDocuments(tied, { query: "vessel", language: "en", limit: 1 }).map(
        (result) => result.document.id,
      ),
    ).toEqual(["a"]);
  });
});
