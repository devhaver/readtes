import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import ReaderSourceSegment from "~/components/reader/ReaderSourceSegment.vue";
import type {
  ChapterKind,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";

const SEFARIA_ORIGIN = "https://www.sefaria.org";

const crossRefLink = (ref: string, label: string) =>
  `<small>(<a href="${SEFARIA_ORIGIN}/${ref}" target="_blank" rel="noopener noreferrer">${label}</a>)</small>`;

const segment = (html: string): SourceSegment => ({
  n: 1,
  sefariaRef: "Talmud Eser HaSefirot, Section I, List of Questions on Topics 1",
  html,
  anchors: [],
});

const chapter = (id: string): TocChapter => ({
  id,
  kind: (id.split("/")[1] as string).replace(/-\d+$/, "") as ChapterKind,
  number: Number.parseInt(id.slice(-2), 10),
  title: { en: "Chapter", he: "פרק" },
  availableLayers: ["source"],
  availableVersions: {
    summary: [],
    source: ["he-jerusalem-1956"],
    commentary: [],
  },
});

/**
 * Stands in for the reader page: all `ReaderSourceSegment` needs from it is
 * the chapter list of the part currently open.
 */
const PartChaptersProvider = (chapterIds: string[]) =>
  defineComponent({
    setup(_, { slots }) {
      provideCrossRefChapters(chapterIds.map(chapter));
      return () => h("div", slots.default?.());
    },
  });

const mountSegment = async (html: string, chapterIds: string[]) =>
  mountSuspended(PartChaptersProvider(chapterIds), {
    slots: {
      default: () => h(ReaderSourceSegment, { segment: segment(html) }),
    },
  });

describe("ReaderSourceSegment — Sefaria Q&A cross-references", () => {
  it("links a question's 'to the answer' at that answer's own chapter", async () => {
    const wrapper = await mountSegment(
      `מהו אור. ${crossRefLink("Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1", "לתשובה")}`,
      ["part-01/answers-terminology-01"],
    );
    const link = wrapper.get("a");

    expect(link.attributes("href")).toBe(
      "/read/part-01/answers-terminology-01",
    );
    expect(link.attributes("target")).toBeUndefined();
    expect(link.attributes("rel")).toBeUndefined();
  });

  it("links an answer's 'to the question' at the questions chapter's seif", async () => {
    const wrapper = await mountSegment(
      `${crossRefLink("Talmud_Eser_HaSefirot,_Section_I,_List_of_Questions_on_Terminology_12", "לשאלה")} אור`,
      ["part-01/questions-terminology-01"],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/questions-terminology-01#seif-12",
    );
  });

  it("offsets a topics ref by the part's own terminology answer count", async () => {
    // A three-terminology-answer part: Sefaria numbers its topics answers
    // from 4, this site's chapters from 1. Nothing here is hardcoded — the
    // offset is counted off the provided chapter list.
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_5",
        "לתשובה",
      ),
      [
        "part-01/answers-terminology-01",
        "part-01/answers-terminology-02",
        "part-01/answers-terminology-03",
        "part-01/answers-topics-01",
        "part-01/answers-topics-02",
        "part-01/answers-topics-05",
      ],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/answers-topics-02",
    );
  });

  it("links a still-site-relative ref rather than sending it to sefaria.org", async () => {
    // Content committed before `sanitizeHtml` normalized these still holds
    // Sefaria's own site-relative href — the legacy pass runs first, so
    // this must survive it and end up internal all the same.
    const wrapper = await mountSegment(
      '<small>(<a href="/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_2">לתשובה</a>)</small>',
      ["part-01/answers-topics-02"],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/answers-topics-02",
    );
  });

  it("keeps the external new-tab link when no such chapter exists here", async () => {
    // Part 1's terminology questions run to 55; its answer chapters stop at
    // 54. An internal href here would prerender as a 404.
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_55",
        "לתשובה",
      ),
      ["part-01/answers-terminology-54"],
    );
    const link = wrapper.get("a");

    expect(link.attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_55`,
    );
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });

  it("keeps a ref that names another part external", async () => {
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_V,_List_of_Answers_on_Terminology_1",
        "לתשובה",
      ),
      ["part-01/answers-terminology-01"],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_V,_List_of_Answers_on_Terminology_1`,
    );
  });

  it("keeps a Hebrew reader in the Hebrew locale", async () => {
    const wrapper = await mountSuspended(
      PartChaptersProvider(["part-01/answers-terminology-01"]),
      {
        route: "/he/read/part-01/questions-terminology-01",
        slots: {
          default: () =>
            h(ReaderSourceSegment, {
              segment: segment(
                crossRefLink(
                  "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1",
                  "לתשובה",
                ),
              ),
            }),
        },
      },
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/he/read/part-01/answers-terminology-01",
    );
  });

  it("leaves every link external without a providing reader page", async () => {
    const html = crossRefLink(
      "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1",
      "לתשובה",
    );
    const wrapper = await mountSuspended(ReaderSourceSegment, {
      props: { segment: segment(html) },
    });

    expect(wrapper.get("a").attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1`,
    );
  });
});
