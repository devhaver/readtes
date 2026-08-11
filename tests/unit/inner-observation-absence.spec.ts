/**
 * The two ways Inner Observation can be missing must never read the same:
 *
 * - parts 5, 11, 14, 15 and 16 (2,193 chapters) have none because Baal
 *   HaSulam wrote none — Sefaria's index and Bnei Baruch's published
 *   contents listing both say so, and his own Hebrew cross-references
 *   corroborate it (see `content/COVERAGE.md` for the evidence and its
 *   limits);
 * - every other part has one, and an edition that carries no text for it yet
 *   is an ordinary coverage gap.
 *
 * On those five parts the Inner Light footnote ("not digitized in any
 * edition yet") renders directly above the Inner Observation one, so the two
 * sentences are asserted here to stay coherent side by side rather than
 * having one deny what the other says.
 *
 * The last case is a guardrail, not a unit test: it pins the derivation (the
 * page reads the part's own `kind: "inner-observation"` chapter count) to the
 * evidence, so a future import that drops or adds Inner Observation chapters
 * fails here rather than silently telling readers what the author did or
 * didn't write.
 */
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import LayerAbsenceNote from "~/components/reader/LayerAbsenceNote.vue";
import type { Toc } from "~~/shared/types/content";

interface ReaderCatalog {
  reader: {
    innerLightAbsent: string;
    innerObservationEmpty: string;
    innerObservationNeverWritten: string;
    pane: { innerLight: string; innerObservation: string };
  };
}

// Read from disk rather than `import … from "~~/i18n/locales/en.json"`: under
// the Nuxt test environment a locale import is precompiled to vue-i18n
// message ASTs, so the raw sentences these assertions compare against would
// come back as objects.
const readCatalog = (locale: "en" | "he"): ReaderCatalog =>
  JSON.parse(
    readFileSync(join(process.cwd(), `i18n/locales/${locale}.json`), "utf-8"),
  ) as ReaderCatalog;

const en = readCatalog("en");
const he = readCatalog("he");

const PARTS_WITHOUT_INNER_OBSERVATION = [
  "part-05",
  "part-11",
  "part-14",
  "part-15",
  "part-16",
];

describe("Inner Observation absence copy", () => {
  it("states the two absences with different sentences", () => {
    expect(en.reader.innerObservationNeverWritten).not.toBe(
      en.reader.innerObservationEmpty,
    );
    expect(he.reader.innerObservationNeverWritten).not.toBe(
      he.reader.innerObservationEmpty,
    );
  });

  it("never promises text that was not written, in either locale", () => {
    expect(en.reader.innerObservationEmpty).toMatch(/\byet\b/i);
    expect(en.reader.innerObservationNeverWritten).not.toMatch(/\byet\b/i);

    expect(he.reader.innerObservationEmpty).toContain("עדיין");
    expect(he.reader.innerObservationNeverWritten).not.toContain("עדיין");
    expect(he.reader.innerObservationNeverWritten).toContain("הסתכלות פנימית");
  });

  it("does not contradict the Inner Light footnote it renders beside", () => {
    // Inner Light is an undigitized text; Inner Observation, where there is
    // none, is not. The never-written sentence therefore has to rule out a
    // digitization gap rather than make a claim about the edition at large,
    // which would deny the note directly above it on parts 5/11/14/15/16.
    expect(en.reader.innerLightAbsent).toMatch(/digitized/i);
    expect(en.reader.innerObservationNeverWritten).toMatch(
      /not a digitization gap/i,
    );
    expect(he.reader.innerLightAbsent).toContain("דיגיטציה");
    expect(he.reader.innerObservationNeverWritten).toContain(
      "אין זה פער דיגיטציה",
    );
  });

  it("states the never-written case in the Source pane footnote, distinct from the Inner Light one", async () => {
    const innerObservation = await mountSuspended(LayerAbsenceNote, {
      props: { layer: "inner-observation" as const },
    });
    const innerLight = await mountSuspended(LayerAbsenceNote);

    expect(innerObservation.text()).toContain(
      en.reader.innerObservationNeverWritten,
    );
    expect(innerObservation.text()).toContain(en.reader.pane.innerObservation);
    expect(innerLight.text()).toContain(en.reader.innerLightAbsent);
    expect(innerLight.text()).not.toContain(
      en.reader.innerObservationNeverWritten,
    );
  });
});

describe("Inner Observation absence — committed corpus", () => {
  it("has no Inner Observation chapters in exactly parts 5, 11, 14, 15 and 16", () => {
    const toc = JSON.parse(
      readFileSync(join(process.cwd(), "content/toc.json"), "utf-8"),
    ) as Toc;

    const partsWithoutInnerObservation = toc.volumes
      .flatMap((volume) => volume.parts)
      .filter(
        (part) =>
          !part.chapters.some(
            (chapter) => chapter.kind === "inner-observation",
          ),
      )
      .map((part) => part.id);

    expect(partsWithoutInnerObservation).toEqual(
      PARTS_WITHOUT_INNER_OBSERVATION,
    );
  });
});
