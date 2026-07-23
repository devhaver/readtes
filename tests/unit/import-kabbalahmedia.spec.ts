import { describe, expect, it } from "vitest";
import { hebrewGematriaValue } from "../../scripts/lib/hebrew-numerals.ts";
import { convertAnchorMarkers } from "../../scripts/lib/km-anchor-markers.ts";
import {
  dedupeKmDocumentCandidates,
  resolveKmDocumentCandidate,
} from "../../scripts/lib/km-candidates.ts";
import {
  groupKmChapterBlocks,
  hasNumberedKmItems,
  isSupportedKmStructure,
  matchLeadingNumber,
} from "../../scripts/lib/km-chapter-parser.ts";
import { parseKmArgs } from "../../scripts/lib/km-cli.ts";
import {
  buildKmCoverageSection,
  buildKmPartLanguageMatrix,
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
  KM_EXPECTED_LANGUAGES,
  kmVersionId,
  kmVersionTitle,
  missingKmLanguages,
} from "../../scripts/lib/km-language.ts";
import {
  buildOrderAlignedGroundSegments,
  splitOrderAlignedSegments,
  validateNumberedOrderAlignment,
} from "../../scripts/lib/km-order-align.ts";
import {
  isSupportedKmQaStructure,
  parseKmQaPairs,
  validateKmQaPairs,
} from "../../scripts/lib/km-qa-blocks.ts";
import { removeKmVersionAvailability } from "../../scripts/lib/km-reconcile.ts";
import {
  buildKmCommentaryItems,
  buildKmSourceSegments,
} from "../../scripts/lib/km-transform.ts";
import {
  classifyKmArticle,
  extractKmTesTree,
  findKmNodeById,
  indexKmTreePartsByNumber,
  KM_TES_COLLECTION_UID,
  parseKmChapterLeafNumber,
  parseKmPartNumber,
  type KmSqData,
} from "../../scripts/lib/km-tree.ts";
import type {
  CommentaryItem,
  SourceSegment,
  TocChapter,
} from "../../shared/types/content.ts";

// ---------------------------------------------------------------------------
// import-kabbalahmedia CLI
// ---------------------------------------------------------------------------

describe("parseKmArgs", () => {
  it("accepts one part and an optional dry run", () => {
    expect(parseKmArgs(["--part", "3", "--dry-run"])).toEqual({
      parts: [3],
      dryRun: true,
    });
  });

  it("expands --all to every supported part", () => {
    expect(parseKmArgs(["--all"])).toEqual({
      parts: Array.from({ length: 16 }, (_, i) => i + 1),
      dryRun: false,
    });
  });

  it.each([
    [["--wat"], "Unknown argument: --wat"],
    [["chapter-01"], "Unknown argument: chapter-01"],
    [["--part"], "--part requires a value"],
    [["--part", "--dry-run"], "--part requires a value"],
    [["--part", "1", "--all"], "Usage:"],
    [["--part", "1", "--part", "2"], "--part may only be specified once"],
    [["--all", "--all"], "--all may only be specified once"],
    [
      ["--dry-run", "--dry-run", "--all"],
      "--dry-run may only be specified once",
    ],
    [["--part", "1.5"], "--part must be an integer"],
    [["--part", "0"], "--part must be between 1 and 16"],
    [["--part", "17"], "--part must be between 1 and 16"],
    [["--dry-run"], "Usage:"],
  ])("rejects invalid input %j", (argv, message) => {
    expect(() => parseKmArgs(argv)).toThrow(message);
  });
});

describe("KabbalahMedia document candidates", () => {
  const candidate = (uid: string, id: string) => ({
    uid,
    file: { id },
  });

  it("deduplicates repeated file ids while preserving priority", () => {
    expect(
      dedupeKmDocumentCandidates([
        candidate("leaf", "same"),
        candidate("part", "same"),
        candidate("part", "other"),
      ]),
    ).toEqual([candidate("leaf", "same"), candidate("part", "other")]);
  });

  it("falls back after unsupported and misaligned candidates, then short-circuits", async () => {
    const loaded: string[] = [];
    const candidates = [
      candidate("first", "unsupported"),
      candidate("second", "misaligned"),
      candidate("third", "valid"),
      candidate("fourth", "unused"),
    ];
    const result = await resolveKmDocumentCandidate(
      candidates,
      async (entry) => {
        loaded.push(entry.file.id);
        return [];
      },
      (_blocks, entry) => {
        if (entry.file.id === "unsupported") {
          return {
            ok: false,
            kind: "structure-unsupported",
            reason: "wrong shape",
          };
        }
        if (entry.file.id === "misaligned") {
          return { ok: false, kind: "unmatched", reason: "wrong count" };
        }
        return { ok: true, value: entry.file.id };
      },
    );

    expect(result.selected?.file.id).toBe("valid");
    expect(result.value).toBe("valid");
    expect(result.rejections.map((entry) => entry.kind)).toEqual([
      "structure-unsupported",
      "unmatched",
    ]);
    expect(loaded).toEqual(["unsupported", "misaligned", "valid"]);
  });

  it("uses unmatched as the terminal failure when any candidate had a valid shape", async () => {
    const result = await resolveKmDocumentCandidate(
      [candidate("first", "unsupported"), candidate("second", "misaligned")],
      async () => [],
      (_blocks, entry) =>
        entry.file.id === "unsupported"
          ? {
              ok: false,
              kind: "structure-unsupported",
              reason: "wrong shape",
            }
          : { ok: false, kind: "unmatched", reason: "wrong count" },
    );

    expect(result.selected).toBeUndefined();
    expect(result.failureKind).toBe("unmatched");
  });
});

describe("removeKmVersionAvailability", () => {
  const chapter = (): TocChapter => ({
    id: "part-01/chapter-01",
    number: 1,
    kind: "chapter",
    title: { he: "א", en: "One" },
    availableLayers: ["source", "commentary"],
    availableVersions: {
      summary: [],
      source: ["en-bb", "he-jerusalem-1956"],
      commentary: ["en-bb"],
    },
  });

  it("removes only the selected version and preserves a layer with other versions", () => {
    const value = chapter();
    expect(removeKmVersionAvailability(value, "source", "en-bb")).toBe(true);
    expect(value.availableVersions.source).toEqual(["he-jerusalem-1956"]);
    expect(value.availableLayers).toContain("source");
  });

  it("removes an empty layer and is idempotent when the version is absent", () => {
    const value = chapter();
    expect(removeKmVersionAvailability(value, "commentary", "en-bb")).toBe(
      true,
    );
    expect(value.availableVersions.commentary).toEqual([]);
    expect(value.availableLayers).not.toContain("commentary");
    expect(removeKmVersionAvailability(value, "commentary", "en-bb")).toBe(
      false,
    );
  });
});

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
      {
        kind: "orphan-he-source-segment",
        message:
          "source: Hebrew ground-truth segment n=2 has no matching KabbalahMedia item — skipped",
      },
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
      warnings.some(
        (w) =>
          w.kind === "orphan-km-source-item" &&
          w.message.includes("n=99 not found in he source"),
      ),
    ).toBe(true);
  });

  it("reports an unmatched marker numeral (kind: unmatched-marker) and still emits the segment with the marker left as text", () => {
    const { segments, warnings } = buildKmSourceSegments(
      [{ n: 1, html: "Text with a stray marker (999)." }],
      heSourceFixture,
      groundTruth,
    );

    expect(segments[0]?.html).toBe("Text with a stray marker (999).");
    expect(segments[0]?.anchors).toEqual([]);
    expect(
      warnings.some(
        (w) =>
          w.kind === "unmatched-marker" && w.message.includes('marker "(999)"'),
      ),
    ).toBe(true);
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
      warnings.some(
        (w) =>
          w.kind === "orphan-he-commentary-item" &&
          w.message.includes("op-12") &&
          w.message.includes("skipped"),
      ),
    ).toBe(true);
  });

  it("reports (and skips) a KM paragraph whose numeral has no Hebrew ground-truth match (kind: orphan-km-commentary-paragraph)", () => {
    const { items, warnings } = buildKmCommentaryItems(
      [{ numeral: 999, html: "An orphan paragraph.", targetSeif: 1 }],
      groundTruth,
    );

    expect(items).toEqual([]);
    expect(
      warnings.some(
        (w) =>
          w.kind === "orphan-km-commentary-paragraph" &&
          w.message.includes('"(999)"'),
      ),
    ).toBe(true);
  });

  it("trusts the Hebrew ground truth's targetSeif over KM's placement, but still reports the mismatch (kind: target-seif-mismatch)", () => {
    const { items, warnings } = buildKmCommentaryItems(
      [{ numeral: 1, html: "Explanation one.", targetSeif: 5 }],
      groundTruth,
    );

    expect(items[0]?.targetSeif).toBe(1);
    expect(
      warnings.some(
        (w) =>
          w.kind === "target-seif-mismatch" &&
          w.message.includes("trusting the Hebrew ground truth"),
      ),
    ).toBe(true);
  });

  it("distinguishes an unmatched-marker warning from an orphan-paragraph warning (regression: no substring conflation)", () => {
    const { warnings } = buildKmCommentaryItems(
      [
        // Matches ground truth (order 1), but its own text has an unrelated stray marker.
        {
          numeral: 1,
          html: "Explanation with a stray marker (999).",
          targetSeif: 1,
        },
        // Does not match any ground truth at all — an orphan paragraph, not a marker issue.
        { numeral: 999, html: "An orphan paragraph.", targetSeif: 1 },
      ],
      groundTruth,
    );

    const unmatchedMarkerWarnings = warnings.filter(
      (w) => w.kind === "unmatched-marker",
    );
    const orphanParagraphWarnings = warnings.filter(
      (w) => w.kind === "orphan-km-commentary-paragraph",
    );

    expect(unmatchedMarkerWarnings).toHaveLength(1);
    expect(orphanParagraphWarnings).toHaveLength(1);
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

describe("missingKmLanguages", () => {
  it("returns the expected languages absent from what's present, in expected order", () => {
    expect(
      missingKmLanguages(
        ["en", "ru", "tr", "de", "es", "ua", "pt"],
        ["en", "ru", "de", "es", "ua"],
      ),
    ).toEqual(["tr", "pt"]);
  });

  it("returns an empty array when nothing expected is missing", () => {
    expect(missingKmLanguages(["en", "ru"], ["ru", "en"])).toEqual([]);
  });

  it("reconciles KM_EXPECTED_LANGUAGES against a real content_units file list — pt and fr are genuinely absent", () => {
    // Shape verified against the live KabbalahMedia API for both chapter 1
    // and chapter 2's content_units: 6 non-Hebrew docx languages, no `pt`/`fr`.
    const presentFileLanguages = ["tr", "ru", "de", "es", "ua", "en"];

    expect(
      missingKmLanguages(KM_EXPECTED_LANGUAGES, presentFileLanguages),
    ).toEqual(["pt", "fr"]);
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

  it("aggregates checked-and-absent chapters by version, part, and status", () => {
    const languages: KmLanguageOutcome[] = [
      {
        versionId: "pt-bb",
        kmLanguage: "pt",
        title: "Bnei Baruch (KabbalahMedia) — Português",
        chapters: [
          {
            chapterId: "part-01/chapter-01",
            status: "no-file-for-language",
            sourceSegments: 0,
            commentaryItems: 0,
            sourceItemsSkipped: 0,
            commentaryParagraphsSkipped: 0,
            unmatchedNumerals: 0,
          },
          {
            chapterId: "part-01/chapter-02",
            status: "no-file-for-language",
            sourceSegments: 0,
            commentaryItems: 0,
            sourceItemsSkipped: 0,
            commentaryParagraphsSkipped: 0,
            unmatchedNumerals: 0,
          },
        ],
        warnings: [],
      },
    ];

    const section = buildKmCoverageSection(languages);
    expect(section).toContain("pt-bb");
    expect(section).toContain("0/2");
    expect(section).toContain(
      "| pt-bb | part-01 | no-file-for-language | 2 | no docx file for this language |",
    );
    expect(section).not.toContain("document structure not yet supported");
  });

  it("keeps a full-corpus skipped report bounded and deterministic", () => {
    const chapters = Array.from({ length: 5_000 }, (_, index) => ({
      chapterId: `part-${index < 2_500 ? "09" : "10"}/chapter-${String(index + 1).padStart(4, "0")}`,
      status: "no-file-for-language" as const,
      ...{
        sourceSegments: 0,
        commentaryItems: 0,
        sourceItemsSkipped: 0,
        commentaryParagraphsSkipped: 0,
        unmatchedNumerals: 0,
      },
    })).reverse();
    const languages: KmLanguageOutcome[] = [
      {
        versionId: "ru-bb",
        kmLanguage: "ru",
        title: "Russian",
        chapters,
        warnings: [],
      },
      {
        versionId: "en-bb",
        kmLanguage: "en",
        title: "English",
        chapters: chapters.slice(0, 3),
        warnings: [],
      },
    ];

    const section = buildKmCoverageSection(languages);

    expect(section).toContain("| en-bb | part-10 | no-file-for-language | 3 |");
    expect(section).toContain(
      "| ru-bb | part-09 | no-file-for-language | 2500 |",
    );
    expect(section).toContain(
      "| ru-bb | part-10 | no-file-for-language | 2500 |",
    );
    expect(section).not.toContain("part-09/chapter-0001");
    expect(section).toBe(buildKmCoverageSection([...languages].reverse()));
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

// ---------------------------------------------------------------------------
// km-coverage: buildKmPartLanguageMatrix
// ---------------------------------------------------------------------------

describe("buildKmPartLanguageMatrix", () => {
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
        {
          chapterId: "part-01/chapter-02",
          status: "structure-unsupported",
          sourceSegments: 0,
          commentaryItems: 0,
          sourceItemsSkipped: 0,
          commentaryParagraphsSkipped: 0,
          unmatchedNumerals: 0,
        },
        {
          chapterId: "part-09/chapter-01",
          status: "no-file-for-language",
          sourceSegments: 0,
          commentaryItems: 0,
          sourceItemsSkipped: 0,
          commentaryParagraphsSkipped: 0,
          unmatchedNumerals: 0,
        },
      ],
      warnings: [],
    },
  ];

  it("shows imported/checked per part, and a dash for a part never checked this run", () => {
    const table = buildKmPartLanguageMatrix(languages);
    expect(table).toContain("| part-01 | 1/2 |");
    expect(table).toContain("| part-09 | 0/1 |");
    expect(table).not.toContain("part-02");
  });

  it("reports 'no parts checked' rather than an empty table for a run with nothing to check", () => {
    expect(buildKmPartLanguageMatrix([])).toBe(
      "_No parts were checked this run._",
    );
  });
});

// ---------------------------------------------------------------------------
// km-tree: sqdata tree extraction + name classification
// ---------------------------------------------------------------------------

describe("findKmNodeById / extractKmTesTree", () => {
  const sqdata: KmSqData = {
    sources: [
      {
        id: "bs",
        name: "Baal HaSulam",
        children: [
          {
            id: KM_TES_COLLECTION_UID,
            parent_id: "bs",
            type: "COLLECTION",
            name: "Study of the Ten Sefirot",
            children: [
              {
                id: "vol1",
                parent_id: KM_TES_COLLECTION_UID,
                type: "VOLUME",
                name: "Vol. 1",
                children: [
                  {
                    id: "part1",
                    parent_id: "vol1",
                    type: "PART",
                    name: "Part 1",
                    children: [
                      {
                        id: "ch1",
                        parent_id: "part1",
                        type: "ARTICLE",
                        name: "Chapter 1",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it("finds a node anywhere in the tree by id, including nested children", () => {
    expect(findKmNodeById(sqdata.sources, "ch1")?.name).toBe("Chapter 1");
    expect(findKmNodeById(sqdata.sources, "nope")).toBeUndefined();
  });

  it("walks the collection into volumes -> parts -> articles", () => {
    const tree = extractKmTesTree(sqdata);
    expect(tree).toEqual([
      {
        id: "vol1",
        name: "Vol. 1",
        parts: [
          {
            id: "part1",
            name: "Part 1",
            articles: [{ id: "ch1", name: "Chapter 1" }],
          },
        ],
      },
    ]);
  });

  it("throws when the collection uid isn't present — a structural precondition, not a per-part absence", () => {
    expect(() => extractKmTesTree({ sources: [] })).toThrow(
      KM_TES_COLLECTION_UID,
    );
  });
});

describe("parseKmPartNumber / parseKmChapterLeafNumber", () => {
  it("parses a part name into its number", () => {
    expect(parseKmPartNumber("Part 5")).toBe(5);
    expect(parseKmPartNumber("Part 16")).toBe(16);
  });

  it("returns undefined for a non-matching part name", () => {
    expect(parseKmPartNumber("Volume 1")).toBeUndefined();
  });

  it("parses a chapter leaf name into its number", () => {
    expect(parseKmChapterLeafNumber("Chapter 12")).toBe(12);
  });

  it("returns undefined for a non-matching leaf name", () => {
    expect(parseKmChapterLeafNumber("Inner Observation")).toBeUndefined();
  });
});

describe("indexKmTreePartsByNumber", () => {
  it("indexes uniquely numbered parts and rejects ambiguous duplicates", () => {
    const part = { id: "part-a", name: "Part 1", articles: [] };
    expect(
      indexKmTreePartsByNumber([
        { id: "volume", name: "Volume", parts: [part] },
      ]).get(1),
    ).toBe(part);

    expect(() =>
      indexKmTreePartsByNumber([
        { id: "v1", name: "Volume 1", parts: [part] },
        {
          id: "v2",
          name: "Volume 2",
          parts: [{ id: "part-b", name: "Part 1", articles: [] }],
        },
      ]),
    ).toThrow('duplicate Part 1 nodes: "part-a" and "part-b"');
  });
});

describe("classifyKmArticle", () => {
  it("classifies a numbered chapter leaf", () => {
    expect(classifyKmArticle("Chapter 3", "Part 3")).toBe("chapter");
  });

  it("classifies a leaf named identically to its own part as the whole-part doc", () => {
    expect(classifyKmArticle("Part 5", "Part 5")).toBe("whole-part");
  });

  it("classifies Inner Observation distinctly (recognized, not yet processed)", () => {
    expect(classifyKmArticle("Inner Observation", "Part 2")).toBe(
      "inner-observation",
    );
  });

  it.each([
    [
      "Table of Questions for the Meaning of the Words",
      "questions-terminology",
    ],
    ["Table of Questions for Topics", "questions-topics"],
    ["Table of Answers for the Meaning of the Words", "answers-terminology"],
    ["Table of Answers for Topics", "answers-topics"],
  ] as const)("classifies %s as %s", (name, role) => {
    expect(classifyKmArticle(name, "Part 1")).toBe(role);
  });

  it("classifies an unrecognized leaf name as unmapped, never guessed", () => {
    expect(classifyKmArticle("Cause and Consequence", "Part 6")).toBe(
      "unmapped",
    );
  });
});

// ---------------------------------------------------------------------------
// km-qa-blocks: parseKmQaPairs / isSupportedKmQaStructure
// ---------------------------------------------------------------------------

describe("parseKmQaPairs", () => {
  it("pairs each h6 question with its following answer paragraph(s), numbered by document position", () => {
    const blocks = parseDocBlocks(
      [
        "<h2>Questions and Answers on the Meaning of Words</h2>",
        "<p>Note: read the table below.</p>",
        '<h6 id="q1">1. What is "light"</h6>',
        "<p>Everything that exists as existence from existence.</p>",
        '<h6 id="q2">2. What is "vessel"</h6>',
        "<p>The will to receive.</p>",
        "<p>Continuation of the same answer.</p>",
      ].join("\n"),
    );

    expect(parseKmQaPairs(blocks)).toEqual([
      {
        position: 1,
        questionHtml: 'What is "light"',
        answerHtml: "Everything that exists as existence from existence.",
      },
      {
        position: 2,
        questionHtml: 'What is "vessel"',
        answerHtml: "The will to receive. Continuation of the same answer.",
      },
    ]);
  });

  it("numbers pairs by document position, not the printed heading number (which may not start at 1)", () => {
    const blocks = parseDocBlocks(
      [
        "<h2>Questions and Answers on Topics</h2>",
        '<h6 id="q55">55. What terms are absent?</h6>',
        "<p>None.</p>",
        '<h6 id="q56">56. What is the usual language?</h6>',
        "<p>The language of branches.</p>",
      ].join("\n"),
    );

    const pairs = parseKmQaPairs(blocks);
    expect(pairs.map((p) => p.position)).toEqual([1, 2]);
    expect(pairs[0]?.questionHtml).toBe("What terms are absent?");
  });
});

describe("isSupportedKmQaStructure", () => {
  it("is true when the document has at least one h6", () => {
    expect(
      isSupportedKmQaStructure(parseDocBlocks("<h6>1. Q</h6><p>A</p>")),
    ).toBe(true);
  });

  it("is false for a document with no h6 at all", () => {
    expect(isSupportedKmQaStructure(parseDocBlocks("<h1>Title</h1>"))).toBe(
      false,
    );
  });
});

describe("validateKmQaPairs", () => {
  const pairs = [
    { position: 1, questionHtml: "Q1", answerHtml: "A1" },
    { position: 2, questionHtml: "Q2", answerHtml: "A2" },
  ];

  it("accepts only an exact questions/answers count match", () => {
    expect(validateKmQaPairs(pairs, 2, 2)).toBeUndefined();
    expect(validateKmQaPairs(pairs, 3, 2)).toContain(
      "does not match Hebrew questions",
    );
  });

  it("rejects an empty side of a pair", () => {
    expect(
      validateKmQaPairs(
        [{ position: 1, questionHtml: "Q", answerHtml: "" }],
        1,
        1,
      ),
    ).toBe("at least one answer is empty");
  });
});

// ---------------------------------------------------------------------------
// km-order-align: buildOrderAlignedGroundSegments / splitOrderAlignedSegments
// ---------------------------------------------------------------------------

describe("buildOrderAlignedGroundSegments", () => {
  it("synthesizes one pseudo he segment per target chapter, keyed by chapter number", () => {
    expect(
      buildOrderAlignedGroundSegments([
        { number: 1, sefariaRef: "Section V 1" },
        { number: 2, sefariaRef: "Section V 2" },
      ]),
    ).toEqual([
      { n: 1, sefariaRef: "Section V 1", html: "", anchors: [] },
      { n: 2, sefariaRef: "Section V 2", html: "", anchors: [] },
    ]);
  });
});

describe("splitOrderAlignedSegments", () => {
  it("re-keys matched segments by chapter number, resetting each item's own n to 1", () => {
    const result = splitOrderAlignedSegments([
      { n: 1, sefariaRef: "Section V 1", html: "First.", anchors: [] },
      {
        n: 37,
        sefariaRef: "Section V 37",
        html: "Thirty-seventh.",
        anchors: [],
      },
    ]);

    expect(result.get(1)).toEqual({
      n: 1,
      sefariaRef: "Section V 1",
      html: "First.",
      anchors: [],
    });
    expect(result.get(37)).toEqual({
      n: 1,
      sefariaRef: "Section V 37",
      html: "Thirty-seventh.",
      anchors: [],
    });
    expect(result.get(2)).toBeUndefined();
  });
});

describe("validateNumberedOrderAlignment", () => {
  const chapters = [
    { number: 1, sefariaRef: "Section V 1" },
    { number: 2, sefariaRef: "Section V 2" },
  ];

  it("accepts an exact numbered sequence", () => {
    expect(
      validateNumberedOrderAlignment(
        [
          { n: 1, html: "First" },
          { n: 2, html: "Second" },
        ],
        chapters,
      ),
    ).toBeUndefined();
  });

  it("rejects count and sequence mismatches before positional alignment", () => {
    expect(
      validateNumberedOrderAlignment([{ n: 1, html: "First" }], chapters),
    ).toContain("item count");
    expect(
      validateNumberedOrderAlignment(
        [
          { n: 1, html: "First" },
          { n: 3, html: "Third" },
        ],
        chapters,
      ),
    ).toContain("expected 2");
  });
});

// ---------------------------------------------------------------------------
// km-chapter-parser: hasNumberedKmItems / isSupportedKmStructure
// ---------------------------------------------------------------------------

describe("hasNumberedKmItems", () => {
  it("is true for a document with at least one numbered h5, even without an h6", () => {
    expect(hasNumberedKmItems(parseDocBlocks("<h5>1. Know that.</h5>"))).toBe(
      true,
    );
  });

  it("is false when h5s exist but none has a leading number", () => {
    expect(
      hasNumberedKmItems(parseDocBlocks("<h5>Untitled heading.</h5>")),
    ).toBe(false);
  });
});

describe("isSupportedKmStructure", () => {
  it("requires both a numbered h5 and an h6", () => {
    expect(
      isSupportedKmStructure(
        parseDocBlocks("<h5>1. Know that.</h5><h6>Inner Light</h6>"),
      ),
    ).toBe(true);
  });

  it("is false when there is no h6 at all (the whole-part source-only dialect's gate is hasNumberedKmItems instead)", () => {
    expect(
      isSupportedKmStructure(parseDocBlocks("<h5>1. Know that.</h5>")),
    ).toBe(false);
  });
});
