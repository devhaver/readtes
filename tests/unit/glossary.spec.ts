import { describe, expect, it } from "vitest";
import {
  filteredGlossaryEntries,
  GLOSSARY_STRATEGIES,
  glossaryAttestationTicks,
  glossaryCitationTarget,
  glossaryStrategyCounts,
  glossaryVariantShares,
  normalizedGlossaryText,
  partNumberFromId,
} from "~/utils/glossary";
import type { GlossaryIndexEntry } from "~~/shared/types/content";

const entry = (
  overrides: Partial<GlossaryIndexEntry> & Pick<GlossaryIndexEntry, "id">,
): GlossaryIndexEntry => ({
  he: "אור",
  canonicalEn: "light",
  strategy: "translate",
  citationCount: 3,
  ...overrides,
});

const entries: GlossaryIndexEntry[] = [
  entry({
    id: "or",
    he: "אור",
    canonicalEn: "light",
    strategy: "translate",
    attestedInParts: ["part-01", "part-03"],
    variants: [
      { en: "light", occurrences: 1250 },
      { en: "Light (title case, in section names)", occurrences: 7 },
    ],
    note: "Never transliterated as Ohr.",
  }),
  entry({
    id: "malchut",
    he: "מלכות",
    canonicalEn: "Malchut",
    strategy: "transliterate",
    attestedInParts: ["part-03"],
  }),
  entry({
    id: "za",
    he: 'ז"א',
    canonicalEn: "ZA",
    strategy: "acronym",
    attestedInParts: [],
  }),
  entry({
    id: "keter",
    he: "כתר",
    canonicalEn: "Keter",
    strategy: "transliterate-with-gloss",
  }),
];

describe("normalizedGlossaryText", () => {
  it("strips gershayim so an acronym can be typed without them", () => {
    expect(normalizedGlossaryText('ז"א')).toBe("זא");
    expect(normalizedGlossaryText("או״ח")).toBe("אוח");
  });

  it("lowercases and collapses whitespace", () => {
    expect(normalizedGlossaryText("  Upper   LIGHT ")).toBe("upper light");
  });
});

describe("filteredGlossaryEntries", () => {
  const all = { query: "", strategy: null } as const;

  it("returns every entry, in file order, with no filters", () => {
    expect(filteredGlossaryEntries(entries, all).map((e) => e.id)).toEqual([
      "or",
      "malchut",
      "za",
      "keter",
    ]);
  });

  it("matches on the Hebrew term", () => {
    expect(
      filteredGlossaryEntries(entries, { ...all, query: "מלכות" }).map(
        (e) => e.id,
      ),
    ).toEqual(["malchut"]);
  });

  it("matches an acronym typed without its gershayim", () => {
    expect(
      filteredGlossaryEntries(entries, { ...all, query: "זא" }).map(
        (e) => e.id,
      ),
    ).toEqual(["za"]);
  });

  it("matches the canonical English case-insensitively", () => {
    expect(
      filteredGlossaryEntries(entries, { ...all, query: "malchut" }).map(
        (e) => e.id,
      ),
    ).toEqual(["malchut"]);
  });

  it("matches a variant the edition used but the canonical rendering does not contain", () => {
    expect(
      filteredGlossaryEntries(entries, { ...all, query: "title case" }).map(
        (e) => e.id,
      ),
    ).toEqual(["or"]);
  });

  it("matches the note text", () => {
    expect(
      filteredGlossaryEntries(entries, { ...all, query: "ohr" }).map(
        (e) => e.id,
      ),
    ).toEqual(["or"]);
  });

  it("filters by strategy", () => {
    expect(
      filteredGlossaryEntries(entries, {
        ...all,
        strategy: "transliterate",
      }).map((e) => e.id),
    ).toEqual(["malchut"]);
  });

  it("applies strategy and query together", () => {
    expect(
      filteredGlossaryEntries(entries, {
        query: "כתר",
        strategy: "transliterate",
      }),
    ).toEqual([]);
  });

  it("returns nothing for a query that matches no entry", () => {
    expect(filteredGlossaryEntries(entries, { ...all, query: "zzz" })).toEqual(
      [],
    );
  });
});

describe("glossaryStrategyCounts", () => {
  it("counts every strategy, including the ones with no entries", () => {
    expect(glossaryStrategyCounts(entries)).toEqual({
      translate: 1,
      transliterate: 1,
      "transliterate-with-gloss": 1,
      acronym: 1,
    });
  });

  it("has a key for every strategy the filter chips render", () => {
    const counts = glossaryStrategyCounts([]);

    for (const strategy of GLOSSARY_STRATEGIES) {
      expect(counts[strategy]).toBe(0);
    }
  });
});

describe("partNumberFromId", () => {
  it("reads the number out of a part id", () => {
    expect(partNumberFromId("part-03")).toBe(3);
    expect(partNumberFromId("part-16")).toBe(16);
  });

  it("returns null for anything that is not a part id", () => {
    expect(partNumberFromId("part-01/chapter-01")).toBeNull();
    expect(partNumberFromId("volume-01")).toBeNull();
  });
});

describe("glossaryAttestationTicks", () => {
  const partsCovered = ["part-01", "part-02", "part-03"];

  it("lights only the parts the entry is attested in", () => {
    expect(glossaryAttestationTicks(entries[0]!, partsCovered)).toEqual([
      { partId: "part-01", partNumber: 1, attested: true },
      { partId: "part-02", partNumber: 2, attested: false },
      { partId: "part-03", partNumber: 3, attested: true },
    ]);
  });

  it("lights nothing for an entry with no attestedInParts at all", () => {
    const ticks = glossaryAttestationTicks(entries[3]!, partsCovered);

    expect(ticks).toHaveLength(3);
    expect(ticks.every((tick) => !tick.attested)).toBe(true);
  });

  it("drops axis entries that are not part ids", () => {
    expect(glossaryAttestationTicks(entries[0]!, ["nonsense"])).toEqual([]);
  });
});

describe("glossaryCitationTarget", () => {
  it("splits a chapter id into part, kind and chapter number", () => {
    expect(glossaryCitationTarget("part-03/answers-terminology-13")).toEqual({
      partNumber: 3,
      kind: "answers-terminology",
      chapterNumber: 13,
    });
  });

  it("handles a plain chapter id", () => {
    expect(glossaryCitationTarget("part-01/chapter-01")).toEqual({
      partNumber: 1,
      kind: "chapter",
      chapterNumber: 1,
    });
  });

  it("returns null for an unknown kind rather than half a label", () => {
    expect(glossaryCitationTarget("part-01/appendix-01")).toBeNull();
  });

  it("returns null for an id that does not parse", () => {
    expect(glossaryCitationTarget("part-01")).toBeNull();
    expect(glossaryCitationTarget("")).toBeNull();
  });
});

describe("glossaryVariantShares", () => {
  it("scales every bar against the entry's most-used variant", () => {
    expect(
      glossaryVariantShares([
        { en: "light", occurrences: 1000 },
        { en: "Light", occurrences: 250 },
      ]),
    ).toEqual([
      { variant: { en: "light", occurrences: 1000 }, sharePct: 100 },
      { variant: { en: "Light", occurrences: 250 }, sharePct: 25 },
    ]);
  });

  it("does not divide by zero when nothing was counted", () => {
    expect(glossaryVariantShares([{ en: "clashes", occurrences: 0 }])).toEqual([
      { variant: { en: "clashes", occurrences: 0 }, sharePct: 0 },
    ]);
  });

  it("returns an empty list for an entry with no variants", () => {
    expect(glossaryVariantShares([])).toEqual([]);
  });
});
