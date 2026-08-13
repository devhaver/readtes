import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readOffsetNodes } from "../../scripts/lib/sefaria-offset-nodes.ts";
import {
  checkTranslatedVersionIntegrity,
  validateContent,
  type LoadedChapterFile,
} from "../../scripts/validate-content.ts";
import type { ContentVersion } from "../../shared/types/content.ts";

const contentDir = join(process.cwd(), "content");
const fixturesDir = join(process.cwd(), "tests/fixtures/content-integrity");

describe("content integrity", () => {
  it("validates every committed content file with no errors", () => {
    const { errors } = validateContent(contentDir);

    expect(errors).toEqual([]);
  });

  // `validateContent` treats an absent offset map as "no node is known to
  // start anywhere but 1" — true for a synthetic fixture, and silently
  // false for this corpus, where deleting the file would disable the only
  // check standing between us and issue #103's 404ing refs. Nothing else
  // notices its absence, so this does.
  it("keeps the committed Sefaria index-offset map, which the ref check reads", () => {
    const offsets = readOffsetNodes(contentDir);

    expect(offsets).not.toBeNull();
    expect(Object.keys(offsets?.nodes ?? {}).length).toBeGreaterThan(0);
  });
});

describe("content integrity — negative fixtures", () => {
  it("fires when a source anchor has no matching commentary anchorId", () => {
    const { errors } = validateContent(
      join(fixturesDir, "anchor-commentary-mismatch"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/source.v1.json: anchor "op-2" (seif 1) has no matching anchored CommentaryItem.anchorId in any commentary version of chapter "part-01/chapter-01"',
    );
  });

  it("fires when a commentary targetSeif has no matching source segment", () => {
    const { errors } = validateContent(
      join(fixturesDir, "target-seif-mismatch"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/commentary.v1.json: anchor "op-1" targets seif 99, which does not exist in any source version of chapter "part-01/chapter-01"',
    );
  });

  it("fires when toc.json declares an availableVersions entry with no file on disk", () => {
    const { errors } = validateContent(join(fixturesDir, "toc-missing-file"));

    expect(errors).toContain(
      'toc.json: chapter "part-01/chapter-01" declares availableVersions.source "v1" but no file content/parts/part-01/chapters/chapter-01/source.v1.json exists',
    );
  });

  it("fires when a file on disk is not declared in toc.json availableVersions", () => {
    const { errors } = validateContent(join(fixturesDir, "toc-orphan-file"));

    expect(errors).toContain(
      'content/parts/part-01/chapters/chapter-01/source.v1.json: exists on disk but is not listed in toc.json\'s availableVersions.source for chapter "part-01/chapter-01"',
    );
  });
});

// These fixtures don't carry `toc.volumes.json` / `toc.parts/*.json` /
// `glossary/tes-en.json` — irrelevant to what's under test here — so ignore
// the boilerplate "missing, run the emit script" errors those produce and
// assert on the commentary/anchor checks specifically.
const nonBoilerplateErrors = (errors: string[]): string[] =>
  errors.filter(
    (error) =>
      !error.startsWith("content/toc.volumes.json:") &&
      !error.startsWith("content/toc.parts/") &&
      !error.startsWith("content/glossary/"),
  );

describe("content integrity — unanchored commentary items", () => {
  it("accepts a chapter whose only commentary item is unanchored (no targetSeif)", () => {
    const { errors } = validateContent(
      join(fixturesDir, "unanchored-item-valid"),
    );

    expect(nonBoilerplateErrors(errors)).toEqual([]);
  });

  it("accepts a chapter mixing an anchored item and an unanchored item", () => {
    const { errors } = validateContent(
      join(fixturesDir, "mixed-chapter-valid"),
    );

    expect(nonBoilerplateErrors(errors)).toEqual([]);
  });

  it("fires when a label bears no relation to the marker its own source prints (issue #96)", () => {
    // The English import paths used to label a note with its running order
    // ("12") while the source text printed the letter's gematria value
    // ("30"), so clicking a marker landed on a differently-numbered note.
    const { errors } = validateContent(
      join(fixturesDir, "label-marker-mismatch"),
    );

    expect(nonBoilerplateErrors(errors)).toEqual([
      'parts/part-01/chapters/chapter-01/commentary.v1.json: anchor "op-1" is labelled "1" (en) but its own source version prints "a" — run `pnpm migrate:commentary-labels`',
    ]);
  });

  it("accepts a label that names its marker among several (a note covering two printed letters)", () => {
    // `part-02/chapter-01` op-20 is labelled "ר וש" against a source that
    // prints only "ר" — richer data, not drift, so it must not fire.
    expect(labelNamesMarker("ר וש", "ר")).toBe(true);
  });

  it("fires when two unanchored items in the same file duplicate an order", () => {
    const { errors } = validateContent(
      join(fixturesDir, "unanchored-duplicate-order"),
    );

    expect(errors).toContain(
      "parts/part-01/chapters/chapter-01/commentary.v1.json: order 1 is used by 2 commentary items — order must be unique per file",
    );
  });

  it("fires when a commentary item's anchorId breaks the op-<order> grammar", () => {
    // anchorId is bound as DOM id and Vue :key in the reader; for an
    // unanchored item no round-trip check can ever catch a malformed or
    // wrong-order id, so the grammar itself is enforced.
    const { errors } = validateContent(
      join(fixturesDir, "anchor-id-grammar-mismatch"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/commentary.v1.json: commentary item anchorId "banana" does not match its order — expected "op-1"',
    );
    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/commentary.v1.json: commentary item anchorId "op-99" does not match its order — expected "op-2"',
    );
  });

  it("fires when a source anchor names an unanchored item's anchorId", () => {
    const { errors } = validateContent(
      join(fixturesDir, "source-anchor-targets-unanchored"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/source.v1.json: anchor "op-2" (seif 1) has no matching anchored CommentaryItem.anchorId in any commentary version of chapter "part-01/chapter-01"',
    );
  });

  it("fires when a commentary item's html is empty", () => {
    const { errors } = validateContent(
      join(fixturesDir, "commentary-empty-html"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/commentary.v1.json: commentary item "op-1" (order 1) has empty html',
    );
  });
});

describe("content integrity — toc.volumes.json / toc.parts equivalence", () => {
  const { errors } = validateContent(join(fixturesDir, "toc-split-drift"));

  it("fires when a committed toc.volumes.json doesn't match what toc.json derives", () => {
    expect(
      errors.some((e) =>
        e.startsWith(
          "content/toc.volumes.json: does not match the file derivable from content/toc.json",
        ),
      ),
    ).toBe(true);
  });

  it("fires when a toc.json part has no matching content/toc.parts/<id>.json", () => {
    expect(
      errors.some((e) =>
        e.startsWith("content/toc.parts/part-01.json: missing"),
      ),
    ).toBe(true);
  });

  it("fires when a content/toc.parts/<id>.json has no matching part in toc.json", () => {
    expect(
      errors.some((e) =>
        e.startsWith("content/toc.parts/part-99.json: exists on disk but"),
      ),
    ).toBe(true);
  });
});

describe("content integrity — translated versions", () => {
  const versions: ContentVersion[] = [
    {
      id: "he-source",
      language: "he",
      direction: "rtl",
      title: "Hebrew",
      license: "Public Domain",
      source: "sefaria",
    },
    {
      id: "en-translation",
      language: "en",
      direction: "ltr",
      title: "English",
      license: "CC0",
      source: "ai",
      translatedFrom: "he-source",
    },
  ];
  const sourceFile = (
    versionId: string,
    overrides: Partial<{
      n: number;
      sefariaRef: string;
      anchors: string[];
    }> = {},
  ): LoadedChapterFile => ({
    relativePath: `parts/part-01/chapters/chapter-01/source.${versionId}.json`,
    chapterDirId: "part-01/chapter-01",
    file: {
      chapterId: "part-01/chapter-01",
      layer: "source",
      versionId,
      items: [
        {
          n: overrides.n ?? 1,
          sefariaRef: overrides.sefariaRef ?? "TES 1:1",
          html: "<p>Text</p>",
          anchors: overrides.anchors ?? ["op-1"],
        },
      ],
    },
  });

  it("accepts a structurally aligned translation", () => {
    const errors: string[] = [];

    checkTranslatedVersionIntegrity(
      versions,
      [sourceFile("he-source"), sourceFile("en-translation")],
      errors,
    );

    expect(errors).toEqual([]);
  });

  it("rejects an unknown translatedFrom version", () => {
    const errors: string[] = [];

    checkTranslatedVersionIntegrity(
      [{ ...versions[1]!, translatedFrom: "missing-source" }],
      [sourceFile("en-translation")],
      errors,
    );

    expect(errors).toContain(
      'versions.json: translated version "en-translation" references unknown translatedFrom version "missing-source"',
    );
  });

  it("rejects a missing same-layer source counterpart", () => {
    const errors: string[] = [];

    checkTranslatedVersionIntegrity(
      versions,
      [sourceFile("en-translation")],
      errors,
    );

    expect(errors[0]).toContain('has no same-layer "he-source" counterpart');
  });

  it.each([
    ["n", { n: 2 }],
    ["sefariaRef", { sefariaRef: "TES 1:2" }],
    ["anchors", { anchors: ["op-2"] }],
  ])("rejects changed source %s identity", (_label, overrides) => {
    const errors: string[] = [];

    checkTranslatedVersionIntegrity(
      versions,
      [sourceFile("he-source"), sourceFile("en-translation", overrides)],
      errors,
    );

    expect(errors[0]).toContain(
      'does not preserve "he-source" n, sefariaRef, and anchors',
    );
  });

  it("still applies the strict index-aligned check to a chapter not passed in consolidatedQaChapterIds, even with a subset translation", () => {
    const errors: string[] = [];
    const sourceTwoItems: LoadedChapterFile = {
      relativePath: "parts/part-01/chapters/chapter-01/source.he-source.json",
      chapterDirId: "part-01/chapter-01",
      file: {
        chapterId: "part-01/chapter-01",
        layer: "source",
        versionId: "he-source",
        items: [
          { n: 1, sefariaRef: "TES 1:1", html: "<p>1</p>", anchors: [] },
          { n: 2, sefariaRef: "TES 1:2", html: "<p>2</p>", anchors: [] },
        ],
      },
    };

    checkTranslatedVersionIntegrity(
      versions,
      [sourceTwoItems, sourceFile("en-translation")], // only 1 item — legal for a Q&A chapter, not for an ordinary one
      errors,
      new Set(), // empty: this chapter is not in the consolidated-QA scope
    );

    expect(errors[0]).toContain(
      'translated source has 1 item(s), but "he-source" has 2',
    );
  });
});

describe("content integrity — Q&A subset translations (issue #91)", () => {
  it("accepts a translation covering only some answers, matched by n", () => {
    const { errors } = validateContent(join(fixturesDir, "qa-subset-valid"));

    expect(nonBoilerplateErrors(errors)).toEqual([]);
  });

  it("fires when a translated item's n has no counterpart in the source", () => {
    const { errors } = validateContent(join(fixturesDir, "qa-subset-orphan"));

    expect(errors).toContain(
      'parts/part-01/chapters/answers-terminology-01/source.v2.json: translated source item n=99 (Fixture 99:1) has no counterpart in "v1"',
    );
  });

  it("fires when a translated item's n matches but sefariaRef disagrees", () => {
    const { errors } = validateContent(
      join(fixturesDir, "qa-subset-identity-mismatch"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/answers-terminology-01/source.v2.json: translated source item n=1 does not preserve "v1" sefariaRef and anchors',
    );
  });

  it("does not relax the check for an ordinary chapter kind, even when it happens to be a subset", () => {
    const { errors } = validateContent(
      join(fixturesDir, "qa-subset-scoping-ordinary-chapter"),
    );

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/source.v2.json: translated source has 1 item(s), but "v1" has 2',
    );
  });

  it("disambiguates several same-n items (an answer broken into several segments) by sefariaRef", () => {
    const errors: string[] = [];
    const versions: ContentVersion[] = [
      {
        id: "he-source",
        language: "he",
        direction: "rtl",
        title: "Hebrew",
        license: "Public Domain",
        source: "sefaria",
      },
      {
        id: "en-translation",
        language: "en",
        direction: "ltr",
        title: "English",
        license: "CC0",
        source: "ai",
        translatedFrom: "he-source",
      },
    ];
    const source: LoadedChapterFile = {
      relativePath:
        "parts/part-01/chapters/answers-terminology-01/source.he-source.json",
      chapterDirId: "part-01/answers-terminology-01",
      file: {
        chapterId: "part-01/answers-terminology-01",
        layer: "source",
        versionId: "he-source",
        items: [
          { n: 5, sefariaRef: "TES 5:1", html: "<p>part 1</p>", anchors: [] },
          { n: 5, sefariaRef: "TES 5:2", html: "<p>part 2</p>", anchors: [] },
        ],
      },
    };
    const translated: LoadedChapterFile = {
      relativePath:
        "parts/part-01/chapters/answers-terminology-01/source.en-translation.json",
      chapterDirId: "part-01/answers-terminology-01",
      file: {
        chapterId: "part-01/answers-terminology-01",
        layer: "source",
        versionId: "en-translation",
        items: [
          {
            n: 5,
            sefariaRef: "TES 5:2",
            html: "<p>translated part 2</p>",
            anchors: [],
          },
        ],
      },
    };

    checkTranslatedVersionIntegrity(
      versions,
      [source, translated],
      errors,
      new Set(["part-01/answers-terminology-01"]),
    );

    expect(errors).toEqual([]);
  });
});
