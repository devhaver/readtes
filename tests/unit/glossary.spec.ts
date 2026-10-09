import { describe, expect, it } from "vitest";
import {
  filteredGlossaryEntries,
  GLOSSARY_LAYER_LABEL_KEYS,
  GLOSSARY_STRATEGIES,
  glossaryAttestationTicks,
  glossaryCitationHash,
  glossaryCitationTarget,
  glossaryEditionId,
  glossaryExampleHebrew,
  glossaryStrategyCounts,
  glossaryVariantShares,
  normalizedGlossaryText,
  partNumberFromId,
} from "~/utils/glossary";
import glossaryIndex from "~~/content/glossary/tes-en.index.json";
import de from "~~/i18n/locales/de.json";
import en from "~~/i18n/locales/en.json";
import es from "~~/i18n/locales/es.json";
import fr from "~~/i18n/locales/fr.json";
import he from "~~/i18n/locales/he.json";
import pt from "~~/i18n/locales/pt.json";
import ru from "~~/i18n/locales/ru.json";
import tr from "~~/i18n/locales/tr.json";
import uk from "~~/i18n/locales/uk.json";
import type { GlossaryIndexEntry } from "~~/shared/types/content";

type GlossaryCopy = {
  glossary: {
    conventionCopy: Record<string, { topic: string; rule: string }>;
    editionNames: Record<string, string>;
    noteCopy: Record<string, string>;
  };
};

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

  it("strips the typographic quotes a reader gets from pasting out of a PDF", () => {
    expect(normalizedGlossaryText("“upper light”")).toBe("upper light");
    expect(normalizedGlossaryText("‘Ohr’")).toBe("ohr");
    // The real U+05F3/U+05F4 punctuation, not the ASCII stand-ins above.
    expect(normalizedGlossaryText("ז״א")).toBe("זא");
    expect(normalizedGlossaryText("ב׳")).toBe("ב");
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

describe("glossaryCitationHash", () => {
  it("links a citation item to the reader's stable seif anchor", () => {
    expect(glossaryCitationHash("item 13")).toBe("#seif-13");
    expect(glossaryCitationHash("not numbered")).toBe("");
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

describe("GLOSSARY_LAYER_LABEL_KEYS", () => {
  /**
   * Guardrail against a third copy of "The Ari's Text" / "Inner Light": the
   * glossary borrows the reader's pane labels instead of carrying its own
   * `glossary.layer.*` block.
   */
  it("borrows the reader's own pane labels rather than duplicating them", () => {
    expect(GLOSSARY_LAYER_LABEL_KEYS.source).toBe("reader.pane.source");
    expect(GLOSSARY_LAYER_LABEL_KEYS.commentary).toBe("reader.pane.innerLight");
  });

  it("resolves to a real string in both locales, for every layer", () => {
    for (const layer of ["source", "commentary", "summary"] as const) {
      const path = GLOSSARY_LAYER_LABEL_KEYS[layer].split(".");
      expect(en).toHaveProperty(path);
      expect(he).toHaveProperty(path);
    }
  });

  it("leaves no glossary-owned copy of the layer names behind", () => {
    expect(en.glossary).not.toHaveProperty("layer");
    expect(he.glossary).not.toHaveProperty("layer");
  });
});

describe("glossaryEditionId", () => {
  it("takes the edition id off the front of the artifact's own description", () => {
    expect(
      glossaryEditionId("en-bb (Bnei Baruch / KabbalahMedia official English)"),
    ).toBe("en-bb");
    expect(glossaryEditionId("he-jerusalem-1956")).toBe("he-jerusalem-1956");
  });
});

describe("glossaryExampleHebrew", () => {
  it("strips the pipeline's own anchor annotation from a convention example", () => {
    expect(
      glossaryExampleHebrew("וכאשר לעלה ברצונו הפשוט (marker ל on op-12)"),
    ).toBe("וכאשר לעלה ברצונו הפשוט");
    expect(glossaryExampleHebrew("אור עליון")).toBe("אור עליון");
  });
});

describe("glossary reader-facing copy", () => {
  const locales = {
    en: en as GlossaryCopy,
    he: he as GlossaryCopy,
    ru: ru as GlossaryCopy,
    uk: uk as GlossaryCopy,
    es: es as GlossaryCopy,
    fr: fr as GlossaryCopy,
    de: de as GlossaryCopy,
    pt: pt as GlossaryCopy,
    tr: tr as GlossaryCopy,
  };

  it("writes every house rule's topic and rule in all nine languages", () => {
    for (const [code, catalog] of Object.entries(locales)) {
      for (const convention of glossaryIndex.conventions) {
        const copy = catalog.glossary.conventionCopy[convention.id];
        expect(copy?.topic, `${code}: ${convention.id} topic`).toBeTruthy();
        expect(copy?.rule, `${code}: ${convention.id} rule`).toBeTruthy();
      }
    }
  });

  it("names the two editions the artifact cites, in all nine languages", () => {
    for (const [code, catalog] of Object.entries(locales)) {
      for (const raw of [
        glossaryIndex.meta.sourceVersion,
        glossaryIndex.meta.referenceVersion,
      ]) {
        const id = glossaryEditionId(raw);
        expect(
          catalog.glossary.editionNames[id],
          `${code}: ${id}`,
        ).toBeTruthy();
      }
    }
  });

  it("translates every reader-facing term note in all nine languages", () => {
    const notedEntries = glossaryIndex.entries.filter((entry) => entry.note);
    expect(notedEntries).toHaveLength(33);

    for (const [code, catalog] of Object.entries(locales)) {
      for (const entry of notedEntries) {
        expect(
          catalog.glossary.noteCopy[entry.id],
          `${code}: ${entry.id}`,
        ).toBeTruthy();
      }
    }
  });
});
