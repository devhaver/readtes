// The third pane resolves its edition PER SECTION: part 3's Inner
// Observation has Bnei Baruch's English for sections 4, 6 and 8 but only the
// AI translation for 5 and 7, and a single tab-wide pick used to drop every
// section it did not cover (4 -> 6 -> 8, sections 5 and 7 missing).
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import InnerObservationPane from "~/components/reader/InnerObservationPane.vue";
import type { PartScopedSection } from "~/composables/usePartScopedSections";
import { resolveSectionViews } from "~/composables/useThirdPaneTabContent";
import { buildVersionsById } from "~/utils/readerVersions";
import type {
  ChapterLayerFile,
  ContentVersion,
  SourceSegment,
} from "~~/shared/types/content";

const version = (
  id: string,
  language: string,
  source: ContentVersion["source"],
): ContentVersion => ({
  id,
  language,
  direction: language === "he" ? "rtl" : "ltr",
  title: id,
  license: "CC0",
  source,
});

const versionsById = buildVersionsById([
  version("he-jerusalem-1956", "he", "sefaria"),
  version("en-bb", "en", "kabbalahmedia"),
  version("en-ai", "en", "ai"),
]);

const file = (text: string): ChapterLayerFile<SourceSegment> =>
  ({
    items: [{ n: 1, sefariaRef: "x", html: text, anchors: [] }],
  }) as unknown as ChapterLayerFile<SourceSegment>;

const section = (
  n: number,
  byVersion: Record<string, string>,
): PartScopedSection => ({
  chapterId: `part-03/inner-observation-0${n}`,
  title: { en: `Section ${n}`, he: `סעיף ${n}` },
  itemsByVersion: Object.fromEntries(
    Object.entries(byVersion).map(([id, text]) => [id, file(text)]),
  ),
});

const sections = [
  section(4, { "en-bb": "four", "en-ai": "four (ai)" }),
  section(5, { "en-ai": "five (ai)" }),
  section(6, { "en-bb": "six" }),
  section(7, { "en-ai": "seven (ai)" }),
  section(8, { "en-bb": "eight", "he-jerusalem-1956": "שמונה" }),
];

describe("resolveSectionViews", () => {
  it("keeps every section in English, each on its own best edition", () => {
    const views = resolveSectionViews(sections, "en", versionsById);

    expect(views.map((view) => view.chapterId)).toEqual(
      sections.map((entry) => entry.chapterId),
    );
    expect(views.map((view) => view.meta?.id)).toEqual([
      "en-bb",
      "en-ai",
      "en-bb",
      "en-ai",
      "en-bb",
    ]);
    expect(views[1]?.items[0]?.html).toBe("five (ai)");
  });

  it("omits only the sections with no text at all in the chosen language", () => {
    const views = resolveSectionViews(sections, "he", versionsById);

    expect(views.map((view) => view.chapterId)).toEqual([
      "part-03/inner-observation-08",
    ]);
  });

  it("returns nothing before a language is chosen", () => {
    expect(resolveSectionViews(sections, null, versionsById)).toEqual([]);
  });
});

describe("InnerObservationPane per-section provenance", () => {
  it("badges AI translated on the AI sections only", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections: resolveSectionViews(sections, "en", versionsById) },
    });

    const summaries = wrapper.findAll("summary");
    expect(summaries).toHaveLength(5);
    const badged = summaries.map((summary) =>
      summary.text().includes("AI translated"),
    );
    expect(badged).toEqual([false, true, false, true, false]);
  });
});
