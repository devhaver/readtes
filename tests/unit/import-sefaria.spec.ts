import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildChapterUnits,
  chapterSlug,
} from "../../scripts/lib/chapter-units.ts";
import { buildCoverageMarkdown } from "../../scripts/lib/coverage-report.ts";
import { extractLeadingHeading } from "../../scripts/lib/heading.ts";
import { hebrewNumeral } from "../../scripts/lib/hebrew-numerals.ts";
import {
  alignJaggedArrays,
  normalizeToChapterItemLists,
} from "../../scripts/lib/jagged-array.ts";
import type {
  SefariaIndex,
  SefariaLink,
  SefariaV3TextsResponse,
} from "../../scripts/lib/sefaria-api-types.ts";
import {
  findMainTextNode,
  findSectionNode,
  findSiblingNodes,
  mapNodeTitleToKind,
} from "../../scripts/lib/sefaria-index.ts";
import {
  chapterRefFor,
  ohrPenimiChapterRef,
  ohrPenimiItemRef,
  segmentRefFor,
} from "../../scripts/lib/sefaria-refs.ts";
import {
  buildTocChapter,
  mainChapterTitle,
  siblingChapterTitle,
  sortTocChapters,
} from "../../scripts/lib/toc-builder.ts";
import {
  buildCommentaryItems,
  buildSourceSegments,
  parseCommentaryLinks,
} from "../../scripts/lib/transform.ts";

const fixturesDir = join(process.cwd(), "tests/fixtures/sefaria-import");
const readFixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(fixturesDir, name), "utf-8")) as T;

const index = readFixture<SefariaIndex>("index.json");
const mainText = readFixture<SefariaV3TextsResponse>("main-text.json");
const links = readFixture<SefariaLink[]>("links.json");
const ohrPenimiText = readFixture<SefariaV3TextsResponse>(
  "ohr-penimi-text.json",
);

const versionText = (response: SefariaV3TextsResponse, language: string) =>
  response.versions.find((v) => v.language === language)?.text ?? [];

describe("hebrewNumeral", () => {
  it.each([
    [1, "א׳"],
    [9, "ט׳"],
    [10, "י׳"],
    [11, "י״א"],
    [15, "ט״ו"],
    [16, "ט״ז"],
    [20, "כ׳"],
    [21, "כ״א"],
    [54, "נ״ד"],
    [99, "צ״ט"],
    [100, "ק׳"],
    [101, "ק״א"],
  ])("converts %i to %s", (n, expected) => {
    expect(hebrewNumeral(n)).toBe(expected);
  });
});

describe("sefaria-index: node resolution", () => {
  it("resolves a section node from a toc.json sefariaNode", () => {
    const section = findSectionNode(index, "Talmud Eser HaSefirot, Section I");
    expect(section?.title).toBe("Section I");
  });

  it("returns undefined for an unknown sefariaNode", () => {
    expect(
      findSectionNode(index, "Talmud Eser HaSefirot, Section XCIX"),
    ).toBeUndefined();
  });

  it('finds the main-text ("default") node', () => {
    const section = findSectionNode(index, "Talmud Eser HaSefirot, Section I")!;
    const mainNode = findMainTextNode(section);
    expect(mainNode).toMatchObject({
      key: "default",
      depth: 2,
      sectionNames: ["Chapter", "Seif"],
    });
  });

  it('finds sibling nodes, excluding "default"', () => {
    const section = findSectionNode(index, "Talmud Eser HaSefirot, Section I")!;
    const siblings = findSiblingNodes(section);
    expect(siblings.map((n) => n.title)).toEqual([
      "Histaklut Penimit",
      "List of Questions on Terminology",
      "List of Answers on Terminology",
    ]);
  });

  it("maps known sibling titles to a ChapterKind", () => {
    expect(mapNodeTitleToKind("Histaklut Penimit")).toBe("inner-observation");
    expect(mapNodeTitleToKind("List of Questions on Terminology")).toBe(
      "questions-terminology",
    );
    expect(mapNodeTitleToKind("List of Questions on Topics")).toBe(
      "questions-topics",
    );
    expect(mapNodeTitleToKind("List of Answers on Terminology")).toBe(
      "answers-terminology",
    );
    expect(mapNodeTitleToKind("List of Answers on Topics")).toBe(
      "answers-topics",
    );
  });

  it("returns undefined for an unmapped sibling title (e.g. Section VI's Cause and Effect lists) — never guesses", () => {
    const section = findSectionNode(
      index,
      "Talmud Eser HaSefirot, Section VI",
    )!;
    const siblings = findSiblingNodes(section);
    expect(siblings.map((n) => n.title)).toContain(
      "List of Questions on Cause and Effect",
    );
    expect(
      mapNodeTitleToKind("List of Questions on Cause and Effect"),
    ).toBeUndefined();
  });
});

describe("jagged-array: normalizeToChapterItemLists", () => {
  it("passes depth-2 nested arrays through unchanged", () => {
    const shaped = normalizeToChapterItemLists({ depth: 2 }, [
      ["a", "b"],
      ["c"],
    ]);
    expect(shaped).toEqual([["a", "b"], ["c"]]);
  });

  it('wraps each item as its own chapter for depth-1 "Chapter"-addressed nodes (Sections V+ main text)', () => {
    const shaped = normalizeToChapterItemLists(
      { depth: 1, sectionNames: ["Chapter"] },
      ["whole chapter 1", "whole chapter 2"],
    );
    expect(shaped).toEqual([["whole chapter 1"], ["whole chapter 2"]]);
  });

  it('treats a depth-1 non-"Chapter" node as one implicit chapter containing every item', () => {
    const shaped = normalizeToChapterItemLists(
      { depth: 1, sectionNames: ["Paragraph"] },
      ["q1", "q2", "q3"],
    );
    expect(shaped).toEqual([["q1", "q2", "q3"]]);
  });
});

describe("jagged-array: alignJaggedArrays", () => {
  it('pads a shorter secondary array (missing trailing chapters/items) with ""', () => {
    const primary = [["a", "b"], ["c"]];
    const secondary = [["x"]]; // second chapter entirely missing, first chapter's second item missing
    expect(alignJaggedArrays(primary, secondary)).toEqual([["x", ""], [""]]);
  });

  it('returns an all-"" shape when secondary is undefined', () => {
    expect(alignJaggedArrays([["a", "b"]], undefined)).toEqual([["", ""]]);
  });
});

describe("sefaria-refs", () => {
  it("builds a chapter ref by appending the chapter index", () => {
    expect(chapterRefFor("Talmud Eser HaSefirot, Section I", 2)).toBe(
      "Talmud Eser HaSefirot, Section I 2",
    );
  });

  it("a chapter ref with no chapterIndex is the base ref itself (single implicit chapter)", () => {
    expect(
      chapterRefFor(
        "Talmud Eser HaSefirot, Section I, List of Questions on Terminology",
        undefined,
      ),
    ).toBe(
      "Talmud Eser HaSefirot, Section I, List of Questions on Terminology",
    );
  });

  it("builds a depth-2 segment ref with a colon separator", () => {
    const ref = segmentRefFor(
      "Talmud Eser HaSefirot, Section I 1",
      { depth: 2, sectionNames: ["Chapter", "Seif"] },
      3,
    );
    expect(ref).toBe("Talmud Eser HaSefirot, Section I 1:3");
  });

  it('a depth-1 "Chapter" segment ref is the chapter ref itself (whole chapter is the one segment)', () => {
    const ref = segmentRefFor(
      "Talmud Eser HaSefirot, Section V 3",
      { depth: 1, sectionNames: ["Chapter"] },
      1,
    );
    expect(ref).toBe("Talmud Eser HaSefirot, Section V 3");
  });

  it('a depth-1 non-"Chapter" segment ref appends the item index with a space', () => {
    const ref = segmentRefFor(
      "Talmud Eser HaSefirot, Section I, List of Questions on Terminology",
      { depth: 1, sectionNames: ["Paragraph"] },
      5,
    );
    expect(ref).toBe(
      "Talmud Eser HaSefirot, Section I, List of Questions on Terminology 5",
    );
  });

  it("builds Ohr Penimi chapter/item refs", () => {
    const chapterRef = ohrPenimiChapterRef(
      "Ohr Penimi on Talmud Eser HaSefirot",
      1,
      1,
    );
    expect(chapterRef).toBe("Ohr Penimi on Talmud Eser HaSefirot 1:1");
    expect(ohrPenimiItemRef(chapterRef, 3)).toBe(
      "Ohr Penimi on Talmud Eser HaSefirot 1:1:3",
    );
  });
});

describe("heading: extractLeadingHeading", () => {
  it("peels a chained <b><big>…</big></b> + <small>…</small> leading gloss", () => {
    const html =
      "<b><big>Topic line</big></b><br><br><small>Short gloss</small><br>Body text follows.";
    expect(extractLeadingHeading(html)).toEqual({
      heading: "Topic line — Short gloss",
      rest: "Body text follows.",
    });
  });

  it("peels a single leading <small> gloss", () => {
    const html = "<small>Just a gloss.</small><br>Body text.";
    expect(extractLeadingHeading(html)).toEqual({
      heading: "Just a gloss.",
      rest: "Body text.",
    });
  });

  it('leaves text with no leading <b>/<small> untouched ("don\'t force it")', () => {
    const html = "1. <b>Not a leading position</b> because text precedes it.";
    expect(extractLeadingHeading(html)).toEqual({ rest: html });
  });
});

describe("chapter-units: buildChapterUnits (against the real depth-2 main-text fixture)", () => {
  const section = findSectionNode(index, "Talmud Eser HaSefirot, Section I")!;
  const mainNode = findMainTextNode(section)!;
  const units = buildChapterUnits(
    "part-01",
    "chapter",
    mainNode,
    "Talmud Eser HaSefirot, Section I",
    versionText(mainText, "he"),
    versionText(mainText, "en"),
  );

  it("resolves exactly as many chapters as the fetched text has (2), never probed/guessed", () => {
    expect(units).toHaveLength(2);
  });

  it("builds stable chapterId/chapterRef per unit", () => {
    expect(units[0]).toMatchObject({
      chapterId: "part-01/chapter-01",
      chapterRef: "Talmud Eser HaSefirot, Section I 1",
    });
    expect(units[1]).toMatchObject({
      chapterId: "part-01/chapter-02",
      chapterRef: "Talmud Eser HaSefirot, Section I 2",
    });
  });

  it('pads English with "" where the translation array is shorter (outer chapter truncation + inner item gaps)', () => {
    expect(units[0]?.enItems).toEqual([
      "1. <b>Explaining the concept of the initial contraction.</b> Before the contraction, there was the Infinite.",
      "",
    ]);
    expect(units[1]?.enItems).toEqual([""]);
  });

  it("chapterSlug is zero-padded and kind-prefixed", () => {
    expect(chapterSlug("chapter", 1)).toBe("chapter-01");
    expect(chapterSlug("inner-observation", 3)).toBe("inner-observation-03");
  });
});

describe("chapter-units: sibling node shapes", () => {
  it("a depth-1 Paragraph sibling node (Questions list) resolves to exactly one chapter unit", () => {
    const node = { depth: 1, sectionNames: ["Paragraph"] };
    const units = buildChapterUnits(
      "part-01",
      "questions-terminology",
      node,
      "Talmud Eser HaSefirot, Section I, List of Questions on Terminology",
      ["q1", "q2", "q3"],
      undefined,
    );
    expect(units).toHaveLength(1);
    expect(units[0]).toMatchObject({
      number: 1,
      chapterId: "part-01/questions-terminology-01",
      chapterRef:
        "Talmud Eser HaSefirot, Section I, List of Questions on Terminology",
      heItems: ["q1", "q2", "q3"],
      enItems: [],
    });
  });

  it("a depth-2 sibling node (Histaklut Penimit / Answers) resolves to one chapter unit per outer index", () => {
    const node = { depth: 2, sectionNames: ["Chapter", "Paragraph"] };
    const units = buildChapterUnits(
      "part-01",
      "inner-observation",
      node,
      "Talmud Eser HaSefirot, Section I, Histaklut Penimit",
      [["a", "b"], ["c"]],
      undefined,
    );
    expect(units.map((u) => u.chapterId)).toEqual([
      "part-01/inner-observation-01",
      "part-01/inner-observation-02",
    ]);
    expect(units[0]?.chapterRef).toBe(
      "Talmud Eser HaSefirot, Section I, Histaklut Penimit 1",
    );
  });
});

describe("transform: buildSourceSegments", () => {
  const section = findSectionNode(index, "Talmud Eser HaSefirot, Section I")!;
  const mainNode = findMainTextNode(section)!;

  it("extracts a chained heading, converts anchors and a footnote, in one pass (chapter 1 seif 1, Hebrew)", () => {
    const { segments, droppedAnchors } = buildSourceSegments(
      mainNode,
      "Talmud Eser HaSefirot, Section I 1",
      versionText(mainText, "he")[0] as string[],
      true,
    );

    expect(droppedAnchors).toEqual([]);
    expect(segments[0]).toEqual({
      n: 1,
      sefariaRef: "Talmud Eser HaSefirot, Section I 1:1",
      heading: "מבאר ענין הצמצום — לפני הצמצום היה אין סוף",
      html: '<span class="tes-footnote" title="עץ חיים שער א׳.">*</span>דע כי <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a>טרם שנאצלו הנאצלים, היה אור <a class="tes-anchor" href="#op-2" data-anchor="op-2">ב</a>עליון פשוט.',
      anchors: ["op-1", "op-2"],
    });
  });

  it("extracts a single-<small> heading on a later seif (chapter 1 seif 2)", () => {
    const { segments } = buildSourceSegments(
      mainNode,
      "Talmud Eser HaSefirot, Section I 1",
      versionText(mainText, "he")[0] as string[],
      true,
    );

    expect(segments[1]).toMatchObject({
      n: 2,
      heading: "סיבת הבריאה היתה כדי לגלות שמותיו.",
      anchors: ["op-3"],
    });
  });

  it("drops a non-Ohr-Penimi inline marker from anchors[] and neutralizes it to bare label text in html (chapter 2 seif 1)", () => {
    const { segments, droppedAnchors } = buildSourceSegments(
      mainNode,
      "Talmud Eser HaSefirot, Section I 2",
      versionText(mainText, "he")[1] as string[],
      true,
    );

    expect(segments[0]?.anchors).toEqual(["op-1"]);
    expect(segments[0]?.html).toBe(
      'והנה אחר הצמצום, <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a>אשר אז נשאר מקום החלל, ו1ציון נוסף.',
    );
    expect(droppedAnchors).toEqual([
      {
        sefariaRef: "Talmud Eser HaSefirot, Section I 2:1",
        commentator: "Histaklut Pnimit",
        order: 99,
      },
    ]);
  });

  it('skips "" positions (no text in this language) rather than emitting an empty segment', () => {
    const { segments } = buildSourceSegments(
      mainNode,
      "Talmud Eser HaSefirot, Section I 1",
      ["only seif one", ""],
      true,
    );
    expect(segments).toHaveLength(1);
    expect(segments[0]?.n).toBe(1);
  });

  it("does not extract a heading when extractHeadings is false (sibling-node scoping)", () => {
    const { segments } = buildSourceSegments(
      { depth: 1, sectionNames: ["Paragraph"] },
      "ref base",
      ["<small>looks like a heading</small><br>body"],
      false,
    );
    expect(segments[0]?.heading).toBeUndefined();
    expect(segments[0]?.html).toContain("<small>looks like a heading</small>");
  });
});

describe("transform: parseCommentaryLinks", () => {
  const { byChapter, warnings } = parseCommentaryLinks(
    links,
    "Ohr Penimi on Talmud Eser HaSefirot",
  );

  it("groups Ohr Penimi commentary links by the chapter parsed from anchorRef, ignoring other categories/indices", () => {
    expect(byChapter.get(1)).toEqual([
      { order: 1, targetSeif: 1, heLabel: "א" },
      { order: 2, targetSeif: 1, heLabel: "ב" },
      { order: 3, targetSeif: 2, heLabel: "ג" },
    ]);
    expect(byChapter.get(2)).toEqual([
      { order: 1, targetSeif: 1, heLabel: "א" },
    ]);
  });

  it("warns (rather than throwing) on a commentary link missing inline_reference", () => {
    expect(warnings).toEqual([
      'commentary link "Ohr Penimi on Talmud Eser HaSefirot 1:1:4" is missing inline_reference data-order/data-label — skipped',
    ]);
  });
});

describe("transform: buildCommentaryItems", () => {
  const heChapters = normalizeToChapterItemLists(
    { depth: 2 },
    versionText(ohrPenimiText, "he"),
  );
  const enChapters = alignJaggedArrays(
    heChapters,
    normalizeToChapterItemLists({ depth: 2 }, versionText(ohrPenimiText, "en")),
  );
  const chapterRef = ohrPenimiChapterRef(
    "Ohr Penimi on Talmud Eser HaSefirot",
    1,
    1,
  );
  const chapterLinks = [
    { order: 1, targetSeif: 1, heLabel: "א" },
    { order: 2, targetSeif: 1, heLabel: "ב" },
    { order: 3, targetSeif: 2, heLabel: "ג" },
  ];

  it("builds Hebrew commentary items with bilingual labels (en label = order number)", () => {
    const { items, warnings } = buildCommentaryItems(
      chapterRef,
      heChapters[0] as string[],
      chapterLinks,
      "he",
    );
    expect(warnings).toEqual([]);
    expect(items[0]).toEqual({
      anchorId: "op-1",
      order: 1,
      label: { he: "א", en: "1" },
      sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:1",
      targetSeif: 1,
      section: "ohr-pnimi",
      html: "אור פשוט - פירושו שאין בו שום שינוי צורה.",
    });
  });

  it('strips the leading "N." from English text and cross-checks it against data-order, warning on mismatch but trusting the ref', () => {
    const { items, warnings } = buildCommentaryItems(
      chapterRef,
      enChapters[0] as string[],
      chapterLinks,
      "en",
    );

    expect(items).toHaveLength(2); // order 3's en text is "" — skipped
    expect(items[0]).toMatchObject({
      anchorId: "op-1",
      order: 1,
      html: "Simple light - meaning it has no change of form.",
    });
    expect(items[1]).toMatchObject({
      anchorId: "op-2",
      order: 2,
      html: "Wrong leading number on purpose, to test the mismatch-warning path.",
    });
    expect(warnings).toEqual([
      'Ohr Penimi on Talmud Eser HaSefirot 1:1: commentary item order 2 en text leading number "5." does not match data-order 2 — trusting data-order',
    ]);
  });

  it("skips an item that has text but no matching links entry (no targetSeif available)", () => {
    const { items, warnings } = buildCommentaryItems(
      chapterRef,
      ["orphan text, no link for this order"],
      [],
      "he",
    );
    expect(items).toEqual([]);
    expect(warnings).toEqual([
      `${chapterRef}: commentary item order 1 (he) has text but no links entry for it — skipped`,
    ]);
  });
});

describe("toc-builder", () => {
  it("mainChapterTitle formats an English ordinal and a Hebrew numeral", () => {
    expect(mainChapterTitle(3)).toEqual({ en: "Chapter 3", he: "פרק ג׳" });
  });

  it("siblingChapterTitle uses the node title verbatim when it is the only instance", () => {
    const title = siblingChapterTitle(
      {
        title: "List of Questions on Terminology",
        heTitle: "לוח השאלות לפירוש המלות",
      },
      1,
      1,
    );
    expect(title).toEqual({
      en: "List of Questions on Terminology",
      he: "לוח השאלות לפירוש המלות",
    });
  });

  it("siblingChapterTitle numbers the node title when there are several instances", () => {
    const title = siblingChapterTitle(
      { title: "Histaklut Penimit", heTitle: "הסתכלות פנימית" },
      3,
      10,
    );
    expect(title).toEqual({
      en: "Histaklut Penimit 3",
      he: "הסתכלות פנימית ג׳",
    });
  });

  it("buildTocChapter derives availableLayers/availableVersions from files on disk", () => {
    const chapter = buildTocChapter(
      "part-01/chapter-01",
      "chapter",
      1,
      { en: "Chapter 1", he: "פרק א" },
      {
        summary: ["en-curated"],
        source: ["he-jerusalem-1956", "en-sefaria-community"],
        commentary: [],
      },
    );
    expect(chapter.availableLayers).toEqual(["summary", "source"]);
    expect(chapter.availableVersions).toEqual({
      summary: ["en-curated"],
      source: ["en-sefaria-community", "he-jerusalem-1956"],
      commentary: [],
    });
  });

  it("sortTocChapters orders by kind (chapter first) then by number", () => {
    const chapters = [
      buildTocChapter(
        "part-01/questions-terminology-01",
        "questions-terminology",
        1,
        { en: "Q" },
        { summary: [], source: ["he"], commentary: [] },
      ),
      buildTocChapter(
        "part-01/chapter-02",
        "chapter",
        2,
        { en: "Chapter 2" },
        { summary: [], source: ["he"], commentary: [] },
      ),
      buildTocChapter(
        "part-01/chapter-01",
        "chapter",
        1,
        { en: "Chapter 1" },
        { summary: [], source: ["he"], commentary: [] },
      ),
    ];
    expect(sortTocChapters(chapters).map((c) => c.id)).toEqual([
      "part-01/chapter-01",
      "part-01/chapter-02",
      "part-01/questions-terminology-01",
    ]);
  });
});

describe("coverage-report: buildCoverageMarkdown", () => {
  it("renders a table per part, an empty-chapter note, and warnings — with no time-varying content (byte-stable across runs)", () => {
    const markdown = buildCoverageMarkdown([
      {
        partId: "part-01",
        partTitle: "Section I",
        stats: [
          {
            layer: "source",
            versionId: "he-jerusalem-1956",
            chaptersTotal: 2,
            chaptersWithText: 2,
            segments: 10,
            emptyChapterIds: [],
          },
          {
            layer: "source",
            versionId: "en-sefaria-community",
            chaptersTotal: 2,
            chaptersWithText: 1,
            segments: 5,
            emptyChapterIds: ["part-01/chapter-02"],
          },
        ],
        warnings: [
          'section "Talmud Eser HaSefirot, Section I": unknown sibling node "Foo" — no ChapterKind mapping, skipped entirely',
        ],
      },
    ]);

    expect(markdown).toContain("## Section I (`part-01`)");
    expect(markdown).toContain("| source | he-jerusalem-1956 | 2 | 2 | 10 |");
    expect(markdown).toContain("| source | en-sefaria-community | 1 | 2 | 5 |");
    expect(markdown).toContain("no text for 1 chapter(s) — part-01/chapter-02");
    expect(markdown).toContain('unknown sibling node "Foo"');
    expect(markdown).not.toMatch(/\d{4}-\d{2}-\d{2}T/); // no ISO timestamp anywhere
  });

  it("is a pure function of its input (calling it twice with the same input is byte-identical)", () => {
    const input = [
      { partId: "part-01", partTitle: "Section I", stats: [], warnings: [] },
    ];
    expect(buildCoverageMarkdown(input)).toBe(buildCoverageMarkdown(input));
  });
});
