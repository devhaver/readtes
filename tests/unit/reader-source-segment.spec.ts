import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import type { Router } from "vue-router";
import ReaderSourceSegment from "~/components/reader/ReaderSourceSegment.vue";
import type {
  ChapterKind,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";
import CrossRefChapterPage from "./fixtures/CrossRefChapterPage.vue";

const SEFARIA_ORIGIN = "https://www.sefaria.org";

const crossRefLink = (ref: string, label: string) =>
  `<small>(<a href="${SEFARIA_ORIGIN}/${ref}" target="_blank" rel="noopener noreferrer">${label}</a>)</small>`;

const segment = (html: string): SourceSegment => ({
  n: 1,
  sefariaRef: "Talmud Eser HaSefirot, Section I, List of Questions on Topics 1",
  html,
  anchors: [],
});

/** A stand-in reader chapter — `itemCount` only matters for `answers-*` kinds (issue #91). */
interface StubChapter {
  id: string;
  itemCount?: number;
}

const chapter = ({ id, itemCount }: StubChapter): TocChapter => ({
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
  itemCount,
});

const segmentSlot = (html: string) => ({
  default: () => h(ReaderSourceSegment, { segment: segment(html) }),
});

const mountSegment = async (html: string, chapters: StubChapter[]) =>
  mountSuspended(CrossRefChapterPage, {
    props: { chapters: chapters.map(chapter) },
    slots: segmentSlot(html),
  });

/**
 * Stubs the app's own router — the one `useLinkedCrossRefs` pushes to — so
 * a click's navigation is observable without actually navigating. Reset
 * explicitly: every mount in this file shares one router instance, so
 * `spyOn` hands back the spy an earlier test already installed on it.
 */
const stubPush = (wrapper: { vm: unknown }) =>
  vi
    .spyOn((wrapper.vm as { $router: Router }).$router, "push")
    .mockReset()
    .mockResolvedValue(undefined);

const clickLink = (
  wrapper: { get: (selector: string) => { element: Element } },
  init: MouseEventInit = {},
): MouseEvent => {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  wrapper.get("a").element.dispatchEvent(event);
  return event;
};

describe("ReaderSourceSegment — Sefaria Q&A cross-references", () => {
  it("links an answer at its own seif, in the consolidated answers chapter", async () => {
    // Issue #91: answers are `#seif-N` items of `answers-<subject>-01` now,
    // same shape as questions — `itemCount` is what confirms item 1 exists.
    const wrapper = await mountSegment(
      `מהו אור. ${crossRefLink("Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1", "לתשובה")}`,
      [{ id: "part-01/answers-terminology-01", itemCount: 1 }],
    );
    const link = wrapper.get("a");

    expect(link.attributes("href")).toBe(
      "/read/part-01/answers-terminology-01#seif-1",
    );
    expect(link.attributes("data-cross-ref")).toBe("");
    expect(link.attributes("target")).toBeUndefined();
    expect(link.attributes("rel")).toBeUndefined();
  });

  it("links an answer's 'to the question' at the questions chapter's seif", async () => {
    const wrapper = await mountSegment(
      `${crossRefLink("Talmud_Eser_HaSefirot,_Section_I,_List_of_Questions_on_Terminology_12", "לשאלה")} אור`,
      [
        { id: "part-01/questions-terminology-01" },
        { id: "part-01/answers-terminology-01", itemCount: 12 },
      ],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/questions-terminology-01#seif-12",
    );
  });

  it("offsets a topics ref by the part's own terminology answer count", async () => {
    // A three-answer terminology apparatus: Sefaria numbers its topics
    // answers from 4, this site's items from 1. The offset comes straight
    // off `answers-terminology-01`'s own `itemCount`, not a chapter count.
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_5",
        "לתשובה",
      ),
      [
        { id: "part-01/answers-terminology-01", itemCount: 3 },
        { id: "part-01/answers-topics-01", itemCount: 2 },
      ],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/answers-topics-01#seif-2",
    );
  });

  it("falls back to a zero offset when the terminology chapter has no itemCount", async () => {
    // No source version to read `itemCount` from (see `itemCountFor` in
    // `scripts/lib/toc-splits.ts`) means the offset can't be trusted, so it
    // defaults to zero rather than silently mis-numbering every topics ref.
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_2",
        "לתשובה",
      ),
      [
        { id: "part-01/answers-terminology-01" },
        { id: "part-01/answers-topics-01", itemCount: 5 },
      ],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/answers-topics-01#seif-2",
    );
  });

  it("links a still-site-relative ref rather than sending it to sefaria.org", async () => {
    // Content committed before `sanitizeHtml` normalized these still holds
    // Sefaria's own site-relative href — the legacy pass runs first, so
    // this must survive it and end up internal all the same.
    const wrapper = await mountSegment(
      '<small>(<a href="/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_2">לתשובה</a>)</small>',
      [{ id: "part-01/answers-topics-01", itemCount: 2 }],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      "/read/part-01/answers-topics-01#seif-2",
    );
  });

  it("keeps the external new-tab link when no such chapter exists here", async () => {
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1",
        "לתשובה",
      ),
      [],
    );
    const link = wrapper.get("a");

    expect(link.attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1`,
    );
    expect(link.attributes("data-cross-ref")).toBeUndefined();
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });

  it("keeps the external link when the answer number is out of range", async () => {
    // Part 1's terminology answers run 1-54 (`itemCount: 54`) — answer 55
    // is out of range, so the chapter existing isn't enough.
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_55",
        "לתשובה",
      ),
      [{ id: "part-01/answers-terminology-01", itemCount: 54 }],
    );
    const link = wrapper.get("a");

    expect(link.attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_55`,
    );
    expect(link.attributes("data-cross-ref")).toBeUndefined();
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });

  it("keeps a question ref external when its answer item is out of range", async () => {
    // The questions chapter is right there, but nothing here says the
    // answers chapter runs as far as item 55 — and Part 1's missing 55th
    // answer is the corpus saying it may not. Linking would give a
    // fragment that scrolls nowhere; the external link still answers the
    // reader.
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Questions_on_Terminology_55",
        "לשאלה",
      ),
      [
        { id: "part-01/questions-terminology-01" },
        { id: "part-01/answers-terminology-01", itemCount: 54 },
      ],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_I,_List_of_Questions_on_Terminology_55`,
    );
  });

  it("keeps a ref that names another part external", async () => {
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_V,_List_of_Answers_on_Terminology_1",
        "לתשובה",
      ),
      [{ id: "part-01/answers-terminology-01", itemCount: 1 }],
    );

    expect(wrapper.get("a").attributes("href")).toBe(
      `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_V,_List_of_Answers_on_Terminology_1`,
    );
  });

  it("keeps a Hebrew reader in the Hebrew locale", async () => {
    const wrapper = await mountSuspended(CrossRefChapterPage, {
      props: {
        chapters: [
          chapter({ id: "part-01/answers-terminology-01", itemCount: 1 }),
        ],
      },
      route: "/he/read/part-01/questions-terminology-01",
      slots: segmentSlot(
        crossRefLink(
          "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1",
          "לתשובה",
        ),
      ),
    });

    expect(wrapper.get("a").attributes("href")).toBe(
      "/he/read/part-01/answers-terminology-01#seif-1",
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

describe("ReaderSourceSegment — cross-reference clicks", () => {
  const answerRefHtml = crossRefLink(
    "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_1",
    "לתשובה",
  );

  it("routes an internal cross-reference instead of reloading the document", async () => {
    // These links are raw `<a href>` inside `v-html`, so nothing makes them
    // SPA navigations except this handler: left alone, every one of them
    // tears the reader down and rebuilds it from the network.
    const wrapper = await mountSegment(answerRefHtml, [
      { id: "part-01/answers-terminology-01", itemCount: 1 },
    ]);
    const push = stubPush(wrapper);

    const event = clickLink(wrapper);

    expect(event.defaultPrevented).toBe(true);
    expect(push).toHaveBeenCalledWith(
      "/read/part-01/answers-terminology-01#seif-1",
    );
  });

  it("carries the seif fragment into the routed navigation", async () => {
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Questions_on_Terminology_12",
        "לשאלה",
      ),
      [
        { id: "part-01/questions-terminology-01" },
        { id: "part-01/answers-terminology-01", itemCount: 12 },
      ],
    );
    const push = stubPush(wrapper);

    clickLink(wrapper);

    expect(push).toHaveBeenCalledWith(
      "/read/part-01/questions-terminology-01#seif-12",
    );
  });

  it.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle-button", { button: 1 }],
  ])("leaves a %s click to the browser", async (_label, init) => {
    const wrapper = await mountSegment(answerRefHtml, [
      { id: "part-01/answers-terminology-01", itemCount: 1 },
    ]);
    const push = stubPush(wrapper);

    const event = clickLink(wrapper, init);

    expect(event.defaultPrevented).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("never intercepts a link that stayed external", async () => {
    const wrapper = await mountSegment(
      crossRefLink(
        "Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Terminology_55",
        "לתשובה",
      ),
      [{ id: "part-01/answers-terminology-01", itemCount: 54 }],
    );
    const push = stubPush(wrapper);

    const event = clickLink(wrapper);

    expect(event.defaultPrevented).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });
});

describe("ReaderSourceSegment paragraph splitting (Inner Observation)", () => {
  const mountProse = async (html: string, splitParagraphs: boolean) =>
    mountSuspended(CrossRefChapterPage, {
      props: { chapters: [] },
      slots: {
        default: () =>
          h(ReaderSourceSegment, { segment: segment(html), splitParagraphs }),
      },
    });

  it("renders one paragraph per <br>-separated passage when opted in", async () => {
    const wrapper = await mountProse("First passage.<br>Second passage.", true);

    const paragraphs = wrapper.findAll("p.tes-prose-paragraph");
    expect(paragraphs.map((p) => p.text())).toEqual([
      "First passage.",
      "Second passage.",
    ]);
  });

  it("leaves a chapter seif as one continuous run by default", async () => {
    const wrapper = await mountProse(
      "First passage.<br>Second passage.",
      false,
    );

    expect(wrapper.find("p.tes-prose-paragraph").exists()).toBe(false);
    expect(wrapper.find("br").exists()).toBe(true);
  });

  it("keeps the print's bold opening word inside its own paragraph", async () => {
    const wrapper = await mountProse("<b>ראשית</b> כל<br>ובזה תנוח", true);

    const first = wrapper.findAll("p.tes-prose-paragraph")[0];
    expect(first?.find("b").text()).toBe("ראשית");
  });

  it("still shows the seif chip alongside the split paragraphs", async () => {
    const wrapper = await mountProse("One.<br>Two.", true);

    expect(wrapper.find(".tes-seif-chip").text()).toBe("1");
  });
});
