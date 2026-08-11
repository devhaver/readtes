/**
 * The two ways Inner Observation can be missing must never read the same:
 *
 * - parts 5, 11, 14, 15 and 16 (2,193 chapters) have none because Baal
 *   HaSulam wrote none — Sefaria's index, his own 262 Hebrew cross-references
 *   and Bnei Baruch's published contents listing all agree;
 * - every other part has one, and an edition that carries no text for it yet
 *   is an ordinary coverage gap.
 *
 * The last case in this file is a guardrail, not a unit test: it pins the
 * derivation (`resolveInnerObservationAbsence` reads the part's own
 * `kind: "inner-observation"` chapter count) to the evidence, so a future
 * import that drops or adds Inner Observation chapters fails here rather
 * than silently telling readers what the author did or didn't write.
 */
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import InnerObservationPane from "~/components/reader/InnerObservationPane.vue";
import LayerAbsenceNote from "~/components/reader/LayerAbsenceNote.vue";
import {
  INNER_OBSERVATION_ABSENCE_MESSAGE_KEYS,
  resolveInnerObservationAbsence,
} from "~/utils/readerPanes";
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

describe("resolveInnerObservationAbsence", () => {
  it("reports a part with no Inner Observation chapters as never written", () => {
    expect(resolveInnerObservationAbsence(0)).toBe("never-written");
  });

  it("reports a part that has Inner Observation chapters as an edition gap", () => {
    expect(resolveInnerObservationAbsence(1)).toBe("not-in-this-edition");
    expect(resolveInnerObservationAbsence(15)).toBe("not-in-this-edition");
  });
});

describe("Inner Observation absence copy", () => {
  it("states the two absences with different sentences", () => {
    const neverWritten =
      INNER_OBSERVATION_ABSENCE_MESSAGE_KEYS["never-written"];
    const notInThisEdition =
      INNER_OBSERVATION_ABSENCE_MESSAGE_KEYS["not-in-this-edition"];

    expect(neverWritten).not.toBe(notInThisEdition);
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

  it("gives the pane's empty state different copy per absence", async () => {
    const neverWritten = await mountSuspended(InnerObservationPane, {
      props: { sections: [], absence: "never-written" as const },
    });
    const notInThisEdition = await mountSuspended(InnerObservationPane, {
      props: { sections: [], absence: "not-in-this-edition" as const },
    });

    expect(neverWritten.text()).not.toBe(notInThisEdition.text());
    expect(neverWritten.text()).toContain(
      en.reader.innerObservationNeverWritten,
    );
    expect(notInThisEdition.text()).toContain(en.reader.innerObservationEmpty);
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
