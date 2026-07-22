import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import VolumeCard from "~/components/library/VolumeCard.vue";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

const activeVolume: TocVolumeSkeleton = {
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
};

const emptyVolume: TocVolumeSkeleton = {
  id: "volume-02",
  number: 2,
  title: { en: "Volume 2", he: "כרך 2" },
  parts: [
    {
      id: "part-02",
      number: 2,
      title: { en: "Part 2", he: "חלק 2" },
      sefariaNode: "Talmud Eser HaSefirot, Section II",
      chapterCount: 0,
      kindsPresent: [],
      firstChapterId: null,
      lastChapterId: null,
      firstChapterTitle: null,
      lastChapterTitle: null,
      availableSummary: { he: "none", en: "none" },
    },
  ],
};

describe("VolumeCard", () => {
  it("renders an active volume's title as a link to its contents page", async () => {
    const wrapper = await mountSuspended(VolumeCard, {
      props: { volume: activeVolume },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("Volume 1");
    expect(link.attributes("href")).toContain("/volumes/volume-1");
  });

  it("renders an unavailable volume disabled, with no link and a 'coming soon' label", async () => {
    const wrapper = await mountSuspended(VolumeCard, {
      props: { volume: emptyVolume },
    });

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toContain("Volume 2");
    expect(wrapper.text().toLowerCase()).toContain("coming soon");
  });

  it("renders the precomputed availableSummary language chip", async () => {
    const wrapper = await mountSuspended(VolumeCard, {
      props: { volume: activeVolume },
    });

    expect(wrapper.text()).toContain("עברית");
  });
});
