import { describe, expect, it } from "vitest";
import { hebrewGematriaValue } from "../../scripts/lib/hebrew-numerals.ts";
import { convertAnchorMarkers } from "../../scripts/lib/km-anchor-markers.ts";
import {
  groupKmChapterBlocks,
  matchLeadingNumber,
} from "../../scripts/lib/km-chapter-parser.ts";
import {
  buildKmCoverageSection,
  mergeMarkdownSection,
  type KmLanguageOutcome,
} from "../../scripts/lib/km-coverage.ts";
import {
  isBlankBlock,
  normalizeBlockWhitespace,
  parseDocBlocks,
} from "../../scripts/lib/km-doc-blocks.ts";
import { buildKmChapterGroundTruth } from "../../scripts/lib/km-ground-truth.ts";
import {
  bcp47ForKmLanguage,
  kmVersionId,
  kmVersionTitle,
} from "../../scripts/lib/km-language.ts";
import {
  buildKmCommentaryItems,
  buildKmSourceSegments,
} from "../../scripts/lib/km-transform.ts";
import type {
  CommentaryItem,
  SourceSegment,
} from "../../shared/types/content.ts";

// ---------------------------------------------------------------------------
// hebrewGematriaValue
// ---------------------------------------------------------------------------

describe("hebrewGematriaValue", () => {
  it.each([
    ["א", 1],
    ["ט", 9],
    ["י", 10],
    ["כ", 20],
    ["ל", 30],
    ["ק", 100],
    ["ר", 200],
    ["ת", 400],
  ])("decodes %s to %i", (letter, expected) => {
    expect(hebrewGematriaValue(letter)).toBe(expected);
  });

  it("sums multi-letter labels", () => {
    expect(hebrewGematriaValue("יא")).toBe(11);
  });

  it("ignores geresh/gershayim punctuation", () => {
    expect(hebrewGematriaValue("כ״א")).toBe(21);
  });

  it("throws for a label with no recognized Hebrew letter", () => {
    expect(() => hebrewGematriaValue("12")).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// km-doc-blocks: parseDocBlocks / normalizeBlockWhitespace / isBlankBlock
// ---------------------------------------------------------------------------

describe("normalizeBlockWhitespace", () => {
  it("collapses the hard-wrapped one-word-per-line shape doc2html emits", () => {
    const raw = "\n  Know\n  that\n  before\n  (1)\n  the\n  light.\n";
    expect(normalizeBlockWhitespace(raw)).toBe(
      "Know that before (1) the light.",
    );
  });

  it("leaves inline tags and their attributes intact", () => {
    const raw = "\n  It\n  did\n  not<sub>\n  (8)</sub>,\n  say\n  I.\n";
    expect(normalizeBlockWhitespace(raw)).toBe(
      "It did not<sub> (8)</sub>, say I.",
    );
  });
});

describe("isBlankBlock", () => {
  it("is true for a spacer paragraph containing only &nbsp;", () => {
    expect(isBlankBlock({ tag: "p", html: "&nbsp;" })).toBe(true);
  });

  it("is false for a block with real text", () => {
    expect(isBlankBlock({ tag: "p", html: "1. Know that." })).toBe(false);
  });
});

describe("parseDocBlocks", () => {
  it("tokenizes a flat sequence of block elements and normalizes each one, dropping blanks", () => {
    const html = [
      '<h3 id="x">\n  Chapter\n  topic\n</h3>',
      "<p>\n  &nbsp;\n</p>",
      '<h5 id="y">\n  1.\n  Know\n  that\n  (1)\n  the\n  light.\n</h5>',
      '<h6 id="z">\n  Inner\n  Light\n</h6>',
      "<p>\n  1.\n  <strong>\n  Term:</strong>\n  Explanation.\n</p>",
    ].join("\n");

    expect(parseDocBlocks(html)).toEqual([
      { tag: "h3", html: "Chapter topic" },
      { tag: "h5", html: "1. Know that (1) the light." },
      { tag: "h6", html: "Inner Light" },
      { tag: "p", html: "1. <strong> Term:</strong> Explanation." },
    ]);
  });
});

// ---------------------------------------------------------------------------
// km-chapter-parser: matchLeadingNumber / groupKmChapterBlocks
// ---------------------------------------------------------------------------

describe("matchLeadingNumber", () => {
  it("detects a single-digit leading number", () => {
    expect(matchLeadingNumber("1. Know that.")).toEqual({
      number: 1,
      rest: "Know that.",
    });
  });

  it("detects a multi-digit leading number", () => {
    expect(matchLeadingNumber("123. Some item text.")).toEqual({
      number: 123,
      rest: "Some item text.",
    });
  });

  it("returns undefined when there is no leading number", () => {
    expect(matchLeadingNumber("It did not have a quality.")).toBeUndefined();
  });
});

describe("groupKmChapterBlocks", () => {
  const englishShapedBlocks = parseDocBlocks(
    [
      "<h3>Chapter topic overview</h3>",
      "<h4>Sub-heading for item one</h4>",
      "<h5>1. Know that before (1) the light of Ein Sof (20).</h5>",
      "<h5>It did not have a quality, called (30).</h5>",
      "<h6>Inner Light</h6>",
      "<p>1. <strong>Know that:</strong> Explanation of item one.</p>",
      "<p>20. <strong>Ein Sof:</strong> Explanation of the twentieth marker.</p>",
      "<h4>Sub-heading for item two</h4>",
      "<h5>2. When it arose in His will (30).</h5>",
      "<h6>Inner Light</h6>",
      "<p>30. <strong>Arose:</strong> Explanation.</p>",
    ].join("\n"),
  );

  it("groups h5 items (including a no-number continuation) by leading number", () => {
    const { items } = groupKmChapterBlocks(englishShapedBlocks);
    expect(items).toEqual([
      {
        n: 1,
        html: "Know that before (1) the light of Ein Sof (20). It did not have a quality, called (30).",
      },
      { n: 2, html: "When it arose in His will (30)." },
    ]);
  });

  it("groups commentary paragraphs under the item they follow, by printed numeral (not sequential order)", () => {
    const { commentaryParagraphs } = groupKmChapterBlocks(englishShapedBlocks);
    expect(commentaryParagraphs).toEqual([
      {
        numeral: 1,
        html: "<strong>Know that:</strong> Explanation of item one.",
        targetSeif: 1,
      },
      {
        numeral: 20,
        html: "<strong>Ein Sof:</strong> Explanation of the twentieth marker.",
        targetSeif: 1,
      },
      {
        numeral: 30,
        html: "<strong>Arose:</strong> Explanation.",
        targetSeif: 2,
      },
    ]);
  });

  it("skips h1-h4 headings and appends unnumbered commentary paragraphs to the previous one", () => {
    const blocks = parseDocBlocks(
      [
        "<h5>1. First item.</h5>",
        "<h6>Inner Light</h6>",
        "<p>1. First commentary paragraph.</p>",
        "<p>continued without a leading number.</p>",
      ].join("\n"),
    );
    const { commentaryParagraphs } = groupKmChapterBlocks(blocks);
    expect(commentaryParagraphs).toEqual([
      {
        numeral: 1,
        html: "First commentary paragraph. continued without a leading number.",
        targetSeif: 1,
      },
    ]);
  });

  it("is language-agnostic: the same structural rules apply to a Cyrillic (Russian-shaped) document", () => {
    const blocks = parseDocBlocks(
      [
        "<h3>Обзор темы главы</h3>",
        "<h5>1. Знай, что прежде (1) простой свет (20).</h5>",
        "<h6>Внутренний свет</h6>",
        "<p>1. <strong>Знай:</strong> Объяснение первого пункта.</p>",
        "<p>20. <strong>Бесконечность:</strong> Объяснение двадцатого маркера.</p>",
      ].join("\n"),
    );
    const { items, commentaryParagraphs } = groupKmChapterBlocks(blocks);

    expect(items).toEqual([
      { n: 1, html: "Знай, что прежде (1) простой свет (20)." },
    ]);
    expect(commentaryParagraphs).toEqual([
      {
        numeral: 1,
        html: "<strong>Знай:</strong> Объяснение первого пункта.",
        targetSeif: 1,
      },
      {
        numeral: 20,
        html: "<strong>Бесконечность:</strong> Объяснение двадцатого маркера.",
        targetSeif: 1,
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// km-anchor-markers: convertAnchorMarkers
// ---------------------------------------------------------------------------

describe("convertAnchorMarkers", () => {
  const gematriaToAnchorId = new Map<number, string>([
    [1, "op-1"],
    [20, "op-11"],
    [30, "op-12"],
  ]);

  it("converts a matched numeral into a tes-anchor link, keeping the printed numeral as the label", () => {
    const result = convertAnchorMarkers(
      "light of Ein Sof (20).",
      gematriaToAnchorId,
    );
    expect(result.html).toBe(
      'light of Ein Sof <a class="tes-anchor" href="#op-11" data-anchor="op-11">20</a>.',
    );
    expect(result.converted).toEqual(["op-11"]);
    expect(result.unmatchedNumerals).toEqual([]);
  });

  it("converts adjacent markers with no text between them", () => {
    const result = convertAnchorMarkers(
      "touches it(1)(20) directly.",
      gematriaToAnchorId,
    );
    expect(result.html).toBe(
      'touches it<a class="tes-anchor" href="#op-1" data-anchor="op-1">1</a><a class="tes-anchor" href="#op-11" data-anchor="op-11">20</a> directly.',
    );
    expect(result.converted).toEqual(["op-1", "op-11"]);
  });

  it("converts a marker nested inside bold/sub markup, leaving the wrapping tag untouched", () => {
    const result = convertAnchorMarkers(
      "<strong>Sof<sub>(30)</sub>, or Rosh</strong>",
      gematriaToAnchorId,
    );
    expect(result.html).toBe(
      '<strong>Sof<sub><a class="tes-anchor" href="#op-12" data-anchor="op-12">30</a></sub>, or Rosh</strong>',
    );
    expect(result.converted).toEqual(["op-12"]);
  });

  it("leaves an unmatched numeral as plain text and reports it", () => {
    const result = convertAnchorMarkers(
      "a stray marker (999) here.",
      gematriaToAnchorId,
    );
    expect(result.html).toBe("a stray marker (999) here.");
    expect(result.converted).toEqual([]);
    expect(result.unmatchedNumerals).toEqual([999]);
  });

  it("does not touch a parenthesized reference that isn't a bare numeral", () => {
    const result = convertAnchorMarkers(
      "as explained above (Item 6) and (see item 30).",
      gematriaToAnchorId,
    );
    expect(result.html).toBe("as explained above (Item 6) and (see item 30).");
    expect(result.unmatchedNumerals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// km-ground-truth: buildKmChapterGroundTruth
// ---------------------------------------------------------------------------

const heCommentaryFixture: CommentaryItem[] = [
  {
    anchorId: "op-1",
    order: 1,
    label: { he: "א", en: "1" },
    sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:1",
    targetSeif: 1,
    section: "ohr-pnimi",
    html: "he commentary 1",
  },
  {
    anchorId: "op-11",
    order: 11,
    label: { he: "כ", en: "11" },
    sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:11",
    targetSeif: 1,
    section: "ohr-pnimi",
    html: "he commentary 11",
  },
  {
    anchorId: "op-12",
    order: 12,
    label: { he: "ל", en: "12" },
    sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:12",
    targetSeif: 2,
    section: "ohr-pnimi",
    html: "he commentary 12",
  },
];

describe("buildKmChapterGroundTruth", () => {
  it("maps each item's gematria value to its anchor id and order, keyed both ways", () => {
    const groundTruth = buildKmChapterGroundTruth(heCommentaryFixture);
    expect(groundTruth.gematriaToAnchorId.get(20)).toBe("op-11");
    expect(groundTruth.gematriaToOrder.get(20)).toBe(11);
    expect(groundTruth.byOrder.get(11)?.targetSeif).toBe(1);
    expect(groundTruth.byOrder.get(12)?.targetSeif).toBe(2);
  });

  it("throws when two items in the same chapter collide on gematria value with different anchors", () => {
    const colliding: CommentaryItem[] = [
      ...heCommentaryFixture,
      {
        anchorId: "op-99",
        order: 99,
        label: { he: "כ", en: "99" }, // same gematria (20) as op-11, different anchor
        sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:99",
        targetSeif: 1,
        section: "ohr-pnimi",
        html: "colliding",
      },
    ];
    expect(() => buildKmChapterGroundTruth(colliding)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// km-transform: buildKmSourceSegments / buildKmCommentaryItems
// ---------------------------------------------------------------------------

const heSourceFixture: SourceSegment[] = [
  {
    n: 1,
    sefariaRef: "Talmud Eser HaSefirot, Section I 1:1",
    html: "he source 1",
    anchors: ["op-1", "op-11"],
  },
  {
    n: 2,
    sefariaRef: "Talmud Eser HaSefirot, Section I 1:2",
    html: "he source 2",
    anchors: ["op-12"],
  },
];

describe("buildKmSourceSegments", () => {
  const groundTruth = buildKmChapterGroundTruth(heCommentaryFixture);

  it("builds a segment per matched item, converting its markers and copying sefariaRef from ground truth", () => {
    const { segments, warnings } = buildKmSourceSegments(
      [{ n: 1, html: "Know that before (1) the light of Ein Sof (20)." }],
      heSourceFixture,
      groundTruth,
    );

    expect(segments).toEqual([
      {
        n: 1,
        sefariaRef: "Talmud Eser HaSefirot, Section I 1:1",
        html: 'Know that before <a class="tes-anchor" href="#op-1" data-anchor="op-1">1</a> the light of Ein Sof <a class="tes-anchor" href="#op-11" data-anchor="op-11">20</a>.',
        anchors: ["op-1", "op-11"],
      },
    ]);
    expect(warnings).toEqual([
      "source: Hebrew ground-truth segment n=2 has no matching KabbalahMedia item — skipped",
    ]);
  });

  it("reports (and skips) a KM item whose n has no Hebrew ground-truth counterpart, never inventing one", () => {
    const { segments, warnings } = buildKmSourceSegments(
      [{ n: 99, html: "An orphan item." }],
      heSourceFixture,
      groundTruth,
    );

    expect(segments).toEqual([]);
    expect(
      warnings.some((w) => w.includes("n=99 not found in he source")),
    ).toBe(true);
  });

  it("reports an unmatched marker numeral and still emits the segment with the marker left as text", () => {
    const { segments, warnings } = buildKmSourceSegments(
      [{ n: 1, html: "Text with a stray marker (999)." }],
      heSourceFixture,
      groundTruth,
    );

    expect(segments[0]?.html).toBe("Text with a stray marker (999).");
    expect(segments[0]?.anchors).toEqual([]);
    expect(warnings.some((w) => w.includes('marker "(999)"'))).toBe(true);
  });
});

describe("buildKmCommentaryItems", () => {
  const groundTruth = buildKmChapterGroundTruth(heCommentaryFixture);

  it("builds a CommentaryItem per matched paragraph, copying label/sefariaRef/targetSeif from ground truth", () => {
    const { items, warnings } = buildKmCommentaryItems(
      [
        { numeral: 1, html: "Explanation one.", targetSeif: 1 },
        { numeral: 20, html: "Explanation twenty.", targetSeif: 1 },
      ],
      groundTruth,
    );

    expect(items).toEqual([
      {
        anchorId: "op-1",
        order: 1,
        label: { he: "א", en: "1" },
        sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:1",
        targetSeif: 1,
        section: "ohr-pnimi",
        html: "Explanation one.",
      },
      {
        anchorId: "op-11",
        order: 11,
        label: { he: "כ", en: "11" },
        sefariaRef: "Ohr Penimi on Talmud Eser HaSefirot 1:1:11",
        targetSeif: 1,
        section: "ohr-pnimi",
        html: "Explanation twenty.",
      },
    ]);
    expect(
      warnings.some((w) => w.includes("op-12") && w.includes("skipped")),
    ).toBe(true);
  });

  it("reports (and skips) a KM paragraph whose numeral has no Hebrew ground-truth match", () => {
    const { items, warnings } = buildKmCommentaryItems(
      [{ numeral: 999, html: "An orphan paragraph.", targetSeif: 1 }],
      groundTruth,
    );

    expect(items).toEqual([]);
    expect(warnings.some((w) => w.includes('"(999)"'))).toBe(true);
  });

  it("trusts the Hebrew ground truth's targetSeif over KM's placement, but still reports the mismatch", () => {
    const { items, warnings } = buildKmCommentaryItems(
      [{ numeral: 1, html: "Explanation one.", targetSeif: 5 }],
      groundTruth,
    );

    expect(items[0]?.targetSeif).toBe(1);
    expect(
      warnings.some((w) => w.includes("trusting the Hebrew ground truth")),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// km-language
// ---------------------------------------------------------------------------

describe("km-language", () => {
  it("maps KabbalahMedia's 'ua' code to the BCP-47 'uk'", () => {
    expect(bcp47ForKmLanguage("ua")).toBe("uk");
  });

  it("passes other codes through unchanged", () => {
    expect(bcp47ForKmLanguage("ru")).toBe("ru");
    expect(bcp47ForKmLanguage("en")).toBe("en");
  });

  it("builds versionIds as <bcp47>-bb", () => {
    expect(kmVersionId("en")).toBe("en-bb");
    expect(kmVersionId("ua")).toBe("uk-bb");
  });

  it("titles English without a language suffix, and other languages with their native name", () => {
    expect(kmVersionTitle("en")).toBe("Bnei Baruch (KabbalahMedia)");
    expect(kmVersionTitle("ru")).toBe("Bnei Baruch (KabbalahMedia) — Русский");
  });
});

// ---------------------------------------------------------------------------
// km-coverage
// ---------------------------------------------------------------------------

describe("buildKmCoverageSection", () => {
  it("renders a table row per language with imported chapter counts", () => {
    const languages: KmLanguageOutcome[] = [
      {
        versionId: "en-bb",
        kmLanguage: "en",
        title: "Bnei Baruch (KabbalahMedia)",
        chapters: [
          {
            chapterId: "part-01/chapter-01",
            status: "imported",
            sourceSegments: 5,
            commentaryItems: 22,
            sourceItemsSkipped: 0,
            commentaryParagraphsSkipped: 0,
            unmatchedNumerals: 0,
          },
        ],
        warnings: [],
      },
    ];

    const section = buildKmCoverageSection(languages);
    expect(section).toContain("en-bb");
    expect(section).toContain("1/1");
    expect(section).toContain("5");
    expect(section).toContain("22");
  });
});

describe("mergeMarkdownSection", () => {
  const heading = "## KabbalahMedia import (`kabbalahmedia`)";

  it("appends the section when the heading isn't present yet", () => {
    const existing =
      "# Import coverage\n\n## Section I (`part-01`)\n\nsomething\n";
    const merged = mergeMarkdownSection(existing, heading, "new body");
    expect(merged).toBe(
      "# Import coverage\n\n## Section I (`part-01`)\n\nsomething\n\n## KabbalahMedia import (`kabbalahmedia`)\n\nnew body\n",
    );
  });

  it("replaces only its own section, leaving earlier and later sections untouched", () => {
    const existing = [
      "# Import coverage",
      "",
      "## Section I (`part-01`)",
      "",
      "sefaria stuff",
      "",
      heading,
      "",
      "old km body",
      "",
      "## Something Else",
      "",
      "other stuff",
      "",
    ].join("\n");

    const merged = mergeMarkdownSection(existing, heading, "new km body");

    expect(merged).toContain("sefaria stuff");
    expect(merged).toContain("new km body");
    expect(merged).not.toContain("old km body");
    expect(merged).toContain("other stuff");
  });

  it("is idempotent: merging the same body twice produces the same result", () => {
    const existing = "# Import coverage\n";
    const once = mergeMarkdownSection(existing, heading, "body");
    const twice = mergeMarkdownSection(once, heading, "body");
    expect(twice).toBe(once);
  });
});
