import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildChapterUnits } from "../../scripts/lib/chapter-units.ts";
import { hebrewNumeral } from "../../scripts/lib/hebrew-numerals.ts";
import {
  consolidateAnswerSegments,
  CONSOLIDATED_QA_KINDS,
  isConsolidatedQaKind,
} from "../../scripts/lib/qa-consolidation.ts";
import { buildSourceSegments } from "../../scripts/lib/transform.ts";
import { migrateConsolidateQa } from "../../scripts/migrate-consolidate-qa.ts";
import { validateContent } from "../../scripts/validate-content.ts";
import { tocSchema } from "../../shared/types/content.ts";

const fixtureDir = join(process.cwd(), "tests/fixtures/qa-consolidation");

const copyFixture = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "qa-consolidation-"));
  cpSync(fixtureDir, dir, { recursive: true });
  return dir;
};

const readAllFiles = (dir: string): Record<string, string> => {
  const files: Record<string, string> = {};
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relPath = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(current, entry.name), `${relPath}/`);
      } else {
        files[relPath] = readFileSync(join(current, entry.name), "utf-8");
      }
    }
  };
  walk(dir, "");
  return files;
};

describe("qa-consolidation: CONSOLIDATED_QA_KINDS / isConsolidatedQaKind", () => {
  it("names every answer kind, so none is written one chapter per answer", () => {
    // Issue #91 consolidated the two that existed then; issue #86's
    // `answers-cause-effect` had to join them or its 34 answers would have
    // come in as 34 chapters, reintroducing exactly the shape #91 removed.
    expect(CONSOLIDATED_QA_KINDS).toEqual([
      "answers-terminology",
      "answers-topics",
      "answers-cause-effect",
    ]);
    expect(isConsolidatedQaKind("answers-terminology")).toBe(true);
    expect(isConsolidatedQaKind("answers-topics")).toBe(true);
    expect(isConsolidatedQaKind("answers-cause-effect")).toBe(true);
    expect(isConsolidatedQaKind("questions-terminology")).toBe(false);
    expect(isConsolidatedQaKind("questions-cause-effect")).toBe(false);
    expect(isConsolidatedQaKind("chapter")).toBe(false);
  });
});

describe("qa-consolidation: consolidateAnswerSegments", () => {
  it("resets every item's n to its originating answer's own number, ordered by answer number", () => {
    const merged = consolidateAnswerSegments([
      { number: 2, segments: [{ n: 1, html: "b", anchors: [] }] },
      { number: 1, segments: [{ n: 1, html: "a", anchors: [] }] },
    ]);

    expect(merged).toEqual([
      { n: 1, html: "a", anchors: [] },
      { n: 2, html: "b", anchors: [] },
    ]);
  });

  it("preserves within-answer order when one answer has several segments — they share the resulting n", () => {
    const merged = consolidateAnswerSegments([
      {
        number: 5,
        segments: [
          { n: 1, html: "part one", anchors: [] },
          { n: 2, html: "part two", anchors: [] },
        ],
      },
    ]);

    expect(merged).toEqual([
      { n: 5, html: "part one", anchors: [] },
      { n: 5, html: "part two", anchors: [] },
    ]);
  });

  it("carries sefariaRef/heading/anchors through untouched", () => {
    const merged = consolidateAnswerSegments([
      {
        number: 3,
        segments: [
          {
            n: 1,
            sefariaRef: "ref 3:1",
            heading: "h",
            html: "x",
            anchors: ["op-1"],
          },
        ],
      },
    ]);

    expect(merged).toEqual([
      {
        n: 3,
        sefariaRef: "ref 3:1",
        heading: "h",
        html: "x",
        anchors: ["op-1"],
      },
    ]);
  });

  it("skips answers a given version simply doesn't have, without renumbering the survivors", () => {
    // e.g. en-bb covered answers 1 and 3 but not 2 — n stays 1 and 3, not
    // renumbered to 1 and 2.
    const merged = consolidateAnswerSegments([
      { number: 1, segments: [{ n: 1, html: "a", anchors: [] }] },
      { number: 3, segments: [{ n: 1, html: "c", anchors: [] }] },
    ]);

    expect(merged.map((item) => item.n)).toEqual([1, 3]);
  });
});

describe("migrate-consolidate-qa: fixture-based migration", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("merges the per-answer chapters into one consolidated chapter per version, n reset, ordered by n", () => {
    dir = copyFixture();
    const plan = migrateConsolidateQa(dir, { dryRun: false });

    expect(plan.merges).toHaveLength(1);
    expect(plan.alreadyConsolidated).toEqual([]);

    const he = JSON.parse(
      readFileSync(
        join(
          dir,
          "parts/part-01/chapters/answers-terminology-01/source.he-jerusalem-1956.json",
        ),
        "utf-8",
      ),
    );
    expect(he.items.map((item: { n: number }) => item.n)).toEqual([1, 2, 3, 3]);
    expect(he.sefariaRef).toBe(
      "Talmud Eser HaSefirot, Section I, List of Answers on Terminology",
    );
  });

  it("preserves a subset version's coverage exactly — a missing answer is simply absent, not padded", () => {
    dir = copyFixture();
    migrateConsolidateQa(dir, { dryRun: false });

    const enBb = JSON.parse(
      readFileSync(
        join(
          dir,
          "parts/part-01/chapters/answers-terminology-01/source.en-bb.json",
        ),
        "utf-8",
      ),
    );
    // en-bb never had answer 2 (no per-answer file for it) — n stays [1, 3, 3].
    expect(enBb.items.map((item: { n: number }) => item.n)).toEqual([1, 3, 3]);
  });

  it("keeps html byte-identical to the original per-answer files", () => {
    const originalSegmentTwo = JSON.parse(
      readFileSync(
        join(
          fixtureDir,
          "parts/part-01/chapters/answers-terminology-03/source.he-jerusalem-1956.json",
        ),
        "utf-8",
      ),
    ).items[1].html;

    dir = copyFixture();
    migrateConsolidateQa(dir, { dryRun: false });

    const merged = JSON.parse(
      readFileSync(
        join(
          dir,
          "parts/part-01/chapters/answers-terminology-01/source.he-jerusalem-1956.json",
        ),
        "utf-8",
      ),
    );
    expect(merged.items[3].html).toBe(originalSegmentTwo);
  });

  it("deletes the old per-answer chapter directories, leaving only the consolidated one (and untouched ordinary chapters)", () => {
    dir = copyFixture();
    migrateConsolidateQa(dir, { dryRun: false });

    const chapterDirs = readdirSync(join(dir, "parts/part-01/chapters")).sort();
    expect(chapterDirs).toEqual(["answers-terminology-01", "chapter-01"]);
  });

  it("rebuilds toc.json: one chapter, title stripped of its per-answer suffix, split ToC regenerated", () => {
    dir = copyFixture();
    migrateConsolidateQa(dir, { dryRun: false });

    const toc = tocSchema.parse(
      JSON.parse(readFileSync(join(dir, "toc.json"), "utf-8")),
    );
    const part = toc.volumes[0]!.parts[0]!;
    const answerChapters = part.chapters.filter(
      (c) => c.kind === "answers-terminology",
    );

    expect(answerChapters).toHaveLength(1);
    expect(answerChapters[0]).toMatchObject({
      id: "part-01/answers-terminology-01",
      number: 1,
      title: {
        en: "List of Answers on Terminology",
        he: "לוח התשובות לפירוש המלות",
      },
      availableVersions: {
        source: ["en-ai", "en-bb", "he-jerusalem-1956"],
      },
    });

    const volumesFile = JSON.parse(
      readFileSync(join(dir, "toc.volumes.json"), "utf-8"),
    );
    // chapter-01 (untouched) + the one consolidated answers-terminology chapter.
    expect(volumesFile.volumes[0].parts[0].chapterCount).toBe(2);
  });

  it("does not touch a chapter kind outside the scope of issue #91", () => {
    dir = copyFixture();
    const before = readFileSync(
      join(
        dir,
        "parts/part-01/chapters/chapter-01/source.he-jerusalem-1956.json",
      ),
      "utf-8",
    );

    migrateConsolidateQa(dir, { dryRun: false });

    const after = readFileSync(
      join(
        dir,
        "parts/part-01/chapters/chapter-01/source.he-jerusalem-1956.json",
      ),
      "utf-8",
    );
    expect(after).toBe(before);
  });

  it("--dry-run writes nothing", () => {
    dir = copyFixture();
    const before = readAllFiles(dir);

    migrateConsolidateQa(dir, { dryRun: true });

    expect(readAllFiles(dir)).toEqual(before);
  });

  it("is idempotent: a second run recognizes the already-consolidated chapter and is a true no-op", () => {
    dir = copyFixture();
    migrateConsolidateQa(dir, { dryRun: false });
    const afterFirstRun = readAllFiles(dir);

    const plan = migrateConsolidateQa(dir, { dryRun: false });

    expect(plan.merges).toEqual([]);
    expect(plan.alreadyConsolidated).toEqual(["part-01|answers-terminology"]);
    expect(readAllFiles(dir)).toEqual(afterFirstRun);
  });

  it("leaves a fully valid content tree behind (pnpm validate:content-equivalent)", () => {
    dir = copyFixture();
    migrateConsolidateQa(dir, { dryRun: false });

    const { errors } = validateContent(dir);
    expect(errors).toEqual([]);
  });
});

describe("qa-consolidation: the importer-shape builder and the migration script agree", () => {
  it("merges 2 freshly-fetched per-answer Sefaria units the same way the migration script merges the equivalent already-committed per-answer files", () => {
    const node = { depth: 2, sectionNames: ["Siman", "Paragraph"] };
    const refBase =
      "Talmud Eser HaSefirot, Section I, List of Answers on Terminology";

    // "Importer shape": buildChapterUnits resolves 2 per-answer units
    // straight from freshly-fetched jagged text, exactly as
    // import-sefaria.ts's sibling-node loop does; each unit's segments are
    // built by the same buildSourceSegments call the (pre-#91) per-answer
    // importer used to write to N separate files.
    const perAnswerUnits = buildChapterUnits(
      "part-01",
      "answers-terminology",
      node,
      refBase,
      [
        ["Answer one Hebrew."],
        ["Answer two Hebrew, part A.", "Answer two Hebrew, part B."],
      ],
      undefined,
    );
    const perAnswerSegments = perAnswerUnits.map((unit) => ({
      unit,
      segments: buildSourceSegments(node, unit.chapterRef, unit.heItems, false)
        .segments,
    }));

    const importerMerged = consolidateAnswerSegments(
      perAnswerSegments.map(({ unit, segments }) => ({
        number: unit.number,
        segments,
      })),
    );

    // "Migration shape": the very same per-unit segments, persisted as the
    // already-committed per-answer chapter files the migration script reads
    // and merges via its own (separate) code path.
    const dir = mkdtempSync(join(tmpdir(), "qa-consolidation-equiv-"));
    try {
      const versions = [
        {
          id: "v1",
          language: "he",
          direction: "rtl",
          title: "Fixture",
          license: "Public Domain",
          source: "sefaria",
        },
      ];
      writeFileSync(
        join(dir, "versions.json"),
        `${JSON.stringify(versions, null, 2)}\n`,
      );

      const chapters = perAnswerSegments.map(({ unit }) => ({
        id: unit.chapterId,
        kind: "answers-terminology",
        number: unit.number,
        title: {
          en: `List of Answers on Terminology ${unit.number}`,
          he: `לוח התשובות לפירוש המלות ${hebrewNumeral(unit.number)}`,
        },
        availableLayers: ["source"],
        availableVersions: { summary: [], source: ["v1"], commentary: [] },
      }));
      const toc = {
        volumes: [
          {
            id: "volume-1",
            number: 1,
            title: { en: "Volume 1" },
            parts: [
              {
                id: "part-01",
                number: 1,
                sefariaNode: "Fixture Node",
                title: { en: "Part 1" },
                chapters,
              },
            ],
          },
        ],
      };
      writeFileSync(join(dir, "toc.json"), `${JSON.stringify(toc, null, 2)}\n`);

      for (const { unit, segments } of perAnswerSegments) {
        const slug = unit.chapterId.split("/")[1] as string;
        const chapterDir = join(dir, "parts/part-01/chapters", slug);
        mkdirSync(chapterDir, { recursive: true });
        writeFileSync(
          join(chapterDir, "source.v1.json"),
          `${JSON.stringify(
            {
              chapterId: unit.chapterId,
              layer: "source",
              versionId: "v1",
              sefariaRef: unit.chapterRef,
              items: segments,
            },
            null,
            2,
          )}\n`,
        );
      }

      // dry-run: this equivalence test only needs the returned plan (which
      // already carries the merged items), not a fully written + validated
      // tree — the fixture-based describe block above already covers that.
      const plan = migrateConsolidateQa(dir, { dryRun: true });
      const migrationMerged = plan.merges[0]!.perVersion.get("v1")!.items;

      expect(migrationMerged).toEqual(importerMerged);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
