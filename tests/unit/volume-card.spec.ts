import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import VolumeCard from "~/components/library/VolumeCard.vue";
import type { ContentVersion, TocVolume } from "~~/shared/types/content";

const versions: ContentVersion[] = [
  {
    id: "he-jerusalem-1956",
    language: "he",
    direction: "rtl",
    title: "ירושלים",
    license: "Public Domain",
    source: "sefaria",
  },
];

const activeVolume: TocVolume = {
  id: "volume-01",
  number: 1,
  title: { en: "Volume 1", he: "כרך 1" },
  parts: [
    {
      id: "part-01",
      number: 1,
      sefariaNode: "Talmud Eser HaSefirot, Section I",
      title: { en: "Part 1", he: "חלק 1" },
      chapters: [
        {
          id: "part-01/chapter-01",
          kind: "chapter",
          number: 1,
          title: { en: "Chapter 1", he: "פרק א׳" },
          availableLayers: ["source"],
          availableVersions: {
            summary: [],
            source: ["he-jerusalem-1956"],
            commentary: [],
          },
        },
      ],
    },
  ],
};

const emptyVolume: TocVolume = {
  id: "volume-02",
  number: 2,
  title: { en: "Volume 2", he: "כרך 2" },
  parts: [
    {
      id: "part-02",
      number: 2,
      sefariaNode: "Talmud Eser HaSefirot, Section II",
      title: { en: "Part 2", he: "חלק 2" },
      chapters: [],
    },
  ],
};

describe("VolumeCard", () => {
  it("renders an active volume's title as a link to its contents page", async () => {
    const wrapper = await mountSuspended(VolumeCard, {
      props: { volume: activeVolume, versions },
    });

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("Volume 1");
    expect(link.attributes("href")).toContain("/volumes/volume-1");
  });

  it("renders an unavailable volume disabled, with no link and a 'coming soon' label", async () => {
    const wrapper = await mountSuspended(VolumeCard, {
      props: { volume: emptyVolume, versions },
    });

    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toContain("Volume 2");
    expect(wrapper.text().toLowerCase()).toContain("coming soon");
  });
});
