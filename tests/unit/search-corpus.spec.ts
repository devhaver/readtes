import { describe, expect, it } from "vitest";

import { buildSearchDocuments } from "~~/server/utils/searchCorpus";
import { isSearchContentKey } from "~~/server/utils/searchIndex";
import type {
  ParsedChapterLayerFile,
  Toc,
  VersionsFile,
} from "~~/shared/types/content";

const toc = {
  volumes: [
    {
      id: "volume-1",
      number: 1,
      title: { en: "Volume 1", he: "כרך א" },
      parts: [
        {
          id: "part-01",
          number: 1,
          sefariaNode: "Section I",
          title: { en: "Part 1", he: "חלק א" },
          chapters: [
            {
              id: "part-01/chapter-01",
              kind: "chapter",
              number: 1,
              title: { en: "Chapter 1", he: "פרק א" },
              availableLayers: ["source", "commentary"],
              availableVersions: {
                summary: [],
                source: ["he-test"],
                commentary: ["en-test"],
              },
            },
          ],
        },
      ],
    },
  ],
} satisfies Toc;

const versions = [
  {
    id: "he-test",
    language: "he",
    direction: "rtl",
    title: "Hebrew test",
    license: "Public Domain",
    source: "curated",
  },
  {
    id: "en-test",
    language: "en",
    direction: "ltr",
    title: "English test",
    license: "CC0",
    source: "curated",
  },
] satisfies VersionsFile;

const files: ParsedChapterLayerFile[] = [
  {
    chapterId: "part-01/chapter-01",
    layer: "source",
    versionId: "he-test",
    items: [
      {
        n: 1,
        heading: "פתיחה",
        html: "<b>אור</b> וכלי",
        anchors: [],
      },
    ],
  },
  {
    chapterId: "part-01/chapter-01",
    layer: "commentary",
    versionId: "en-test",
    items: [
      {
        anchorId: "op-1",
        order: 1,
        label: { en: "1", he: "א" },
        targetSeif: 1,
        section: "ohr-pnimi",
        html: "The <i>Inner Light</i> explains the vessel.",
      },
    ],
  },
];

describe("server/utils/searchCorpus", () => {
  it("recognizes both Nitro and filesystem content-asset keys", () => {
    expect(
      isSearchContentKey("part-01:chapters:chapter-01:source.en-ai.json"),
    ).toBe(true);
    expect(
      isSearchContentKey(
        "part-01/chapters/chapter-01/commentary.he-jerusalem-1956.json",
      ),
    ).toBe(true);
    expect(
      isSearchContentKey("part-01:chapters:chapter-01:metadata.json"),
    ).toBe(false);
  });

  it("builds localized source and commentary search documents", () => {
    expect(buildSearchDocuments(files, toc, versions)).toEqual([
      expect.objectContaining({
        id: "part-01/chapter-01:commentary:en-test:op-1",
        chapterId: "part-01/chapter-01",
        layer: "commentary",
        versionId: "en-test",
        versionTitle: "English test",
        language: "en",
        chapterTitle: "Chapter 1",
        partTitle: "Part 1",
        itemId: "op-1",
        text: "The Inner Light explains the vessel.",
      }),
      expect.objectContaining({
        id: "part-01/chapter-01:source:he-test:seif-1",
        language: "he",
        chapterTitle: "פרק א",
        partTitle: "חלק א",
        itemId: "seif-1",
        heading: "פתיחה",
        text: "פתיחה אור וכלי",
      }),
    ]);
  });

  it("skips files whose chapter or version is not registered", () => {
    const unknown = {
      ...files[0],
      chapterId: "part-99/chapter-01",
    } as ParsedChapterLayerFile;

    expect(buildSearchDocuments([unknown], toc, versions)).toEqual([]);
  });
});
