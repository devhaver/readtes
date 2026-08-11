import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ReaderToolbar from "~/components/reader/ReaderToolbar.vue";
import type { ChapterLink } from "~/utils/toc";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

const chapterLink = (id: string, title: string): ChapterLink => ({
  id,
  title: { en: title, he: title },
});

const breadcrumbItems = [
  { label: "Six volumes", to: "/volumes" },
  { label: "Volume 1", to: "/volumes/volume-1" },
  { label: "Part 1 · Chapter 1" },
];

const volumes: TocVolumeSkeleton[] = [
  {
    id: "volume-01",
    number: 1,
    title: { en: "Volume 1", he: "כרך 1" },
    parts: [
      {
        id: "part-01",
        number: 1,
        title: { en: "Part 1", he: "חלק 1" },
        sefariaNode: "Talmud Eser HaSefirot, Section I",
        chapterCount: 1,
        kindsPresent: ["chapter"],
        firstChapterId: "part-01/chapter-01",
        lastChapterId: "part-01/chapter-01",
        firstChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        lastChapterTitle: { en: "Chapter 1", he: "פרק א׳" },
        availableSummary: { he: "full", en: "none" },
      },
    ],
  },
];

const baseProps = {
  breadcrumbItems,
  volumes,
  currentVolumeId: "volume-01",
  currentPartId: "part-01",
};

describe("ReaderToolbar", () => {
  it("renders the breadcrumb chain", async () => {
    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev: null,
        next: null,
      },
    });

    expect(wrapper.text()).toContain("Six volumes");
    expect(wrapper.text()).toContain("Volume 1");
    expect(wrapper.text()).toContain("Part 1 · Chapter 1");
  });

  it("renders a Contents button with an accessible name", async () => {
    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev: null,
        next: null,
      },
    });

    const contentsButton = wrapper
      .findAll("button")
      .find((button) => button.attributes("aria-label") === "Contents");
    expect(contentsButton).toBeTruthy();
  });

  it("renders exactly one <h1> containing the chapter title", async () => {
    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev: null,
        next: null,
      },
    });

    const headings = wrapper.findAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe("Part 1 · Chapter 1");
  });

  it("links to the previous and next chapters when they exist", async () => {
    const prev = chapterLink("part-01/chapter-01", "Chapter 1");
    const next = chapterLink("part-01/chapter-02", "Chapter 2");

    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev,
        next,
      },
    });

    const links = wrapper.findAll("a");
    expect(
      links.some((link) =>
        link.attributes("href")?.includes("/read/part-01/chapter-01"),
      ),
    ).toBe(true);
    expect(
      links.some((link) =>
        link.attributes("href")?.includes("/read/part-01/chapter-02"),
      ),
    ).toBe(true);
    expect(wrapper.text()).toContain("Chapter 1");
    expect(wrapper.text()).toContain("Chapter 2");
  });

  it("disables prev/next at the corpus edges without rendering a link", async () => {
    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev: null,
        next: null,
      },
    });

    const readLinks = wrapper
      .findAll("a")
      .filter((link) => link.attributes("href")?.includes("/read/"));
    expect(readLinks).toHaveLength(0);

    const disabled = wrapper.findAll("[aria-disabled='true']");
    expect(disabled.length).toBe(2);
  });

  it("renders a study/panes mode toggle, reflecting the current mode via aria-pressed", async () => {
    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev: null,
        next: null,
      },
    });

    const studyButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Study");
    const panesButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Panes");
    expect(studyButton).toBeTruthy();
    expect(panesButton).toBeTruthy();
  });

  it("switches the toggle's pressed state when clicked", async () => {
    const wrapper = await mountSuspended(ReaderToolbar, {
      props: {
        chapterTitle: "Part 1 · Chapter 1",
        ...baseProps,
        prev: null,
        next: null,
      },
    });

    const studyButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Study");
    const panesButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Panes");

    await studyButton?.trigger("click");
    expect(studyButton?.attributes("aria-pressed")).toBe("true");
    expect(panesButton?.attributes("aria-pressed")).toBe("false");

    await panesButton?.trigger("click");
    expect(panesButton?.attributes("aria-pressed")).toBe("true");
    expect(studyButton?.attributes("aria-pressed")).toBe("false");
  });
});
