import { describe, expect, it } from "vitest";
import {
  glossaryCitationsFileSchema,
  glossaryIndexFileSchema,
  type GlossaryFile,
} from "~~/shared/types/content";
import {
  deriveGlossaryCitationsFile,
  deriveGlossaryIndexFile,
} from "../../scripts/lib/glossary-splits.ts";

const fixture: GlossaryFile = {
  $schema: "internal",
  generatedFrom: {
    sourceVersion: "en-bb",
    referenceVersion: "he-jerusalem-1956",
    repoPath: "content/parts/<partId>/…",
    generatedOn: "2026-07-27",
    method: "Aligned positionally, then confirmed by reading real pairs.",
    alignedFilePairs: 741,
    alignedChapters: 737,
    alignedItemPairs: 1448,
    unalignedFallbackChapters: 9,
    itemLevelFailureRatePct: 2.62,
    fileLevelFailureRatePct: 1.21,
    hebrewCharsAligned: 243623,
    englishCharsAligned: 374357,
    partsCovered: ["part-01", "part-03"],
    partsNotCovered: ["part-02"],
  },
  alignedChapterCount: 737,
  usage: "Inject entries and conventions verbatim into every prompt.",
  entryCount: 2,
  entries: [
    {
      id: "or",
      he: "אור",
      canonicalEn: "light",
      strategy: "translate",
      heItemCount: 449,
      alignedItemCount: 441,
      coveragePct: 98,
      attestedInParts: ["part-01", "part-03"],
      variants: [{ en: "light", occurrences: 1250 }],
      note: "Never transliterated as Ohr.",
      citations: [
        {
          chapterId: "part-01/chapter-01",
          layer: "source",
          item: "item 1",
          he: "אור עליון",
          en: "upper light",
        },
      ],
    },
    {
      id: "bitushim-plural",
      he: "בטישות",
      canonicalEn: "clashes",
      strategy: "translate",
      attestation: "DERIVED — zero aligned occurrences in en-bb",
      citations: [],
    },
  ],
  conventions: [
    {
      id: "gloss-brackets",
      topic: "Transliteration glosses",
      rule: "A transliteration is glossed in parentheses on first use.",
      evidence: "12/12 first uses carry a gloss.",
      examples: [
        {
          chapterId: "part-01/chapter-01",
          layer: "source",
          he: "כתר",
          en: "Keter (crown)",
        },
      ],
    },
  ],
  inconsistencies: [
    {
      id: "nekudot",
      topic: "נקודות — 'dots' vs 'Nekudot'",
      split: [{ form: "Nekudot", occurrences: 40, whereMostly: "part-03" }],
      diagnosis: "House-style drift between volumes.",
      recommendation: "Lock 'Nekudot'.",
      affects: [],
    },
  ],
  knownGaps: ["en-bb covers 737 of the 5,148 Hebrew source chapters."],
  revisions: [
    {
      version: "v2",
      date: "2026-07-27",
      reason: "Gaps found.",
      added: ['או"ח'],
    },
  ],
};

describe("deriveGlossaryIndexFile", () => {
  const index = deriveGlossaryIndexFile(fixture);

  it("produces a file the app-facing schema accepts", () => {
    expect(glossaryIndexFileSchema.safeParse(index).success).toBe(true);
  });

  it("drops the citations and keeps only their count", () => {
    expect(index.entries[0]).not.toHaveProperty("citations");
    expect(index.entries[0]?.citationCount).toBe(1);
    expect(index.entries[1]?.citationCount).toBe(0);
  });

  it("keeps every other entry field, including the optional ones", () => {
    expect(index.entries[0]).toMatchObject({
      id: "or",
      he: "אור",
      canonicalEn: "light",
      strategy: "translate",
      coveragePct: 98,
      attestedInParts: ["part-01", "part-03"],
      note: "Never transliterated as Ohr.",
    });
    expect(index.entries[1]?.attestation).toBe(
      "DERIVED — zero aligned occurrences in en-bb",
    );
  });

  it("carries the conventions and known gaps a reader benefits from", () => {
    expect(index.conventions).toEqual(fixture.conventions);
    expect(index.knownGaps).toEqual(fixture.knownGaps);
  });

  it("leaves the translation-run apparatus behind", () => {
    expect(index).not.toHaveProperty("inconsistencies");
    expect(index).not.toHaveProperty("usage");
    expect(index).not.toHaveProperty("revisions");
  });

  it("flattens the provenance the page actually shows", () => {
    expect(index.meta).toEqual({
      sourceVersion: "en-bb",
      referenceVersion: "he-jerusalem-1956",
      generatedOn: "2026-07-27",
      method: "Aligned positionally, then confirmed by reading real pairs.",
      alignedChapters: 737,
      alignedItemPairs: 1448,
      entryCount: 2,
      partsCovered: ["part-01", "part-03"],
      partsNotCovered: ["part-02"],
    });
  });
});

describe("deriveGlossaryCitationsFile", () => {
  const citations = deriveGlossaryCitationsFile(fixture);

  it("produces a file the app-facing schema accepts", () => {
    expect(glossaryCitationsFileSchema.safeParse(citations).success).toBe(true);
  });

  it("keys every entry's citations by entry id", () => {
    expect(citations.citations["or"]).toEqual(fixture.entries[0]?.citations);
  });

  it("omits entries with no citations rather than storing empty arrays", () => {
    expect(citations.citations).not.toHaveProperty("bitushim-plural");
  });
});

describe("glossary split derivation", () => {
  it("is idempotent", () => {
    expect(deriveGlossaryIndexFile(fixture)).toEqual(
      deriveGlossaryIndexFile(fixture),
    );
    expect(deriveGlossaryCitationsFile(fixture)).toEqual(
      deriveGlossaryCitationsFile(fixture),
    );
  });
});
