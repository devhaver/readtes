import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ReaderBreadcrumb from "~/components/reader/ReaderBreadcrumb.vue";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

const part = (
  id: string,
  number: number,
  firstChapterId: string | null,
): TocVolumeSkeleton["parts"][number] => ({
  id,
  number,
  title: { en: `Part ${number}`, he: `חלק ${number}` },
  sefariaNode: `Talmud Eser HaSefirot, Section ${number}`,
  chapterCount: firstChapterId ? 1 : 0,
  kindsPresent: firstChapterId ? ["chapter"] : [],
  firstChapterId,
  lastChapterId: firstChapterId,
  firstChapterTitle: firstChapterId ? { en: "Chapter 1", he: "פרק א׳" } : null,
  lastChapterTitle: firstChapterId ? { en: "Chapter 1", he: "פרק א׳" } : null,
  availableSummary: { he: "full", en: "none" },
});

const volumes: TocVolumeSkeleton[] = [
  {
    id: "volume-01",
    number: 1,
    title: { en: "Volume 1", he: "כרך 1" },
    parts: [
      part("part-01", 1, "part-01/chapter-01"),
      part("part-02", 2, "part-02/chapter-01"),
    ],
  },
  {
    id: "volume-02",
    number: 2,
    title: { en: "Volume 2", he: "כרך 2" },
    parts: [part("part-03", 3, null)],
  },
];

const breadcrumbItems = [
  { label: "Six volumes", to: "/volumes" },
  { label: "Volume 1", to: "/volumes/volume-1" },
  { label: "Part 1 · Chapter 1" },
];

describe("ReaderBreadcrumb", () => {
  it("lists every volume under the 'Six volumes' menu, marking the current one", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumb, {
      props: {
        items: breadcrumbItems,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[0]?.trigger("click");

    expect(wrapper.text()).toContain("Volume 1");
    expect(wrapper.text()).toContain("Volume 2");
    const links = wrapper.findAll("a");
    const currentVolumeLink = links.find(
      (link) => link.attributes("href") === "/volumes/volume-1",
    );
    expect(currentVolumeLink?.attributes("aria-current")).toBe("true");
  });

  it("lists the current volume's parts, marking the current part and linking to its first chapter", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumb, {
      props: {
        items: breadcrumbItems,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[1]?.trigger("click");

    const links = wrapper.findAll("a");
    const part1Link = links.find(
      (link) => link.attributes("href") === "/read/part-01/chapter-01",
    );
    expect(part1Link?.attributes("aria-current")).toBe("true");

    const part2Link = links.find(
      (link) => link.attributes("href") === "/read/part-02/chapter-01",
    );
    expect(part2Link).toBeTruthy();
    expect(part2Link?.attributes("aria-current")).toBeUndefined();
  });

  it("links the part menu's footer item to the volume's contents page", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumb, {
      props: {
        items: breadcrumbItems,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    const buttons = wrapper.findAll("button");
    await buttons[1]?.trigger("click");

    const links = wrapper.findAll("a");
    const contentsLink = links.find(
      (link) => link.attributes("href") === "/volumes/volume-1",
    );
    expect(contentsLink).toBeTruthy();
  });

  it("renders the trailing chapter segment as plain, non-linked text", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumb, {
      props: {
        items: breadcrumbItems,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    expect(wrapper.text()).toContain("Part 1 · Chapter 1");
    const current = wrapper.find("[aria-current='page']");
    expect(current.exists()).toBe(true);
    expect(current.text()).toBe("Part 1 · Chapter 1");
  });
});
