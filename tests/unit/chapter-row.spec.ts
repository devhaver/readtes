import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ChapterRow from "~/components/library/ChapterRow.vue";
import type { ChapterGroupEntry } from "~/utils/chapterGrouping";
import type { ContentVersion, TocChapter } from "~~/shared/types/content";

const versions: ContentVersion[] = [
  {
    id: "he-jerusalem-1956",
    language: "he",
    direction: "rtl",
    title: "ירושלים",
    license: "Public Domain",
    source: "sefaria",
  },
  {
    id: "en-ai",
    language: "en",
    direction: "ltr",
    title: "English (AI translation)",
    license: "CC0",
    source: "ai",
    translatedFrom: "he-jerusalem-1956",
  },
];

const aiTranslatedChapter: TocChapter = {
  id: "part-01/inner-observation-01",
  kind: "inner-observation",
  number: 1,
  title: { en: "Histaklut Penimit 1", he: "הסתכלות פנימית א׳" },
  availableLayers: ["source"],
  availableVersions: {
    summary: [],
    source: ["he-jerusalem-1956", "en-ai"],
    commentary: [],
  },
};

const hebrewOnlyChapter: TocChapter = {
  id: "part-01/answers-terminology-01",
  kind: "answers-terminology",
  number: 1,
  title: { en: "List of Answers on Terminology 1", he: "לוח התשובות א׳" },
  availableLayers: ["source"],
  availableVersions: {
    summary: [],
    source: ["he-jerusalem-1956"],
    commentary: [],
  },
};

describe("ChapterRow", () => {
  it("badges an AI-translated chapter", async () => {
    const entry: ChapterGroupEntry = {
      type: "chapter",
      chapter: aiTranslatedChapter,
    };
    const wrapper = await mountSuspended(ChapterRow, {
      props: { entry, versions },
      global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
    });

    expect(wrapper.text().toLowerCase()).toContain("ai translated");
  });

  it("marks a Hebrew-only chapter without the AI badge", async () => {
    const entry: ChapterGroupEntry = {
      type: "chapter",
      chapter: hebrewOnlyChapter,
    };
    const wrapper = await mountSuspended(ChapterRow, {
      props: { entry, versions },
      global: { stubs: { NuxtLink: { template: "<a><slot /></a>" } } },
    });

    expect(wrapper.text().toLowerCase()).not.toContain("ai translated");
    expect(wrapper.text().toLowerCase()).toContain("hebrew only");
  });

  it("renders a cluster entry with its count and links to the first chapter", async () => {
    const entry: ChapterGroupEntry = {
      type: "cluster",
      kind: "answers-terminology",
      count: 54,
      firstChapter: hebrewOnlyChapter,
    };
    const wrapper = await mountSuspended(ChapterRow, {
      props: { entry, versions },
    });

    expect(wrapper.text()).toContain("54");
    expect(wrapper.find("a").attributes("href")).toContain(
      "/read/part-01/answers-terminology-01",
    );
  });
});
