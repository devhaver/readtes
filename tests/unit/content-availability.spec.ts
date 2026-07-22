import { describe, expect, it } from "vitest";
import type {
  ContentVersion,
  TocChapter,
  TocPart,
} from "~~/shared/types/content";

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
    id: "en-sefaria-community",
    language: "en",
    direction: "ltr",
    title: "Sefaria Community Translation",
    license: "CC0",
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

const chapter = (overrides: {
  source?: string[];
  summary?: string[];
  commentary?: string[];
}): TocChapter => ({
  id: "part-01/chapter-01",
  kind: "chapter",
  number: 1,
  title: { en: "Chapter 1", he: "פרק א׳" },
  availableLayers: [],
  availableVersions: {
    summary: overrides.summary ?? [],
    source: overrides.source ?? [],
    commentary: overrides.commentary ?? [],
  },
});

describe("chapterLanguages", () => {
  it("reports he/en presence across every layer", () => {
    const result = chapterLanguages(
      chapter({
        source: ["he-jerusalem-1956"],
        commentary: ["en-sefaria-community"],
      }),
      versions,
    );

    expect(result).toEqual({ he: true, en: true, aiTranslated: false });
  });

  it("reports aiTranslated when the source layer includes en-ai", () => {
    const result = chapterLanguages(
      chapter({ source: ["he-jerusalem-1956", "en-ai"] }),
      versions,
    );

    expect(result).toEqual({ he: true, en: true, aiTranslated: true });
  });

  it("does not flag aiTranslated when en-ai is absent, even if other en versions exist", () => {
    const result = chapterLanguages(
      chapter({
        source: ["he-jerusalem-1956"],
        commentary: ["en-sefaria-community"],
      }),
      versions,
    );

    expect(result.aiTranslated).toBe(false);
  });

  it("reports false for a language with no version present at all", () => {
    const result = chapterLanguages(
      chapter({ source: ["he-jerusalem-1956"] }),
      versions,
    );

    expect(result.en).toBe(false);
  });
});

describe("partLanguageAvailability", () => {
  const partWith = (chapters: TocChapter[]): TocPart => ({
    id: "part-01",
    number: 1,
    sefariaNode: "Talmud Eser HaSefirot, Section I",
    title: { en: "Part 1", he: "חלק 1" },
    chapters,
  });

  it("is 'none' for a part with no chapters yet", () => {
    expect(partLanguageAvailability(partWith([]), versions)).toEqual({
      he: "none",
      en: "none",
    });
  });

  it("is 'full' when every chapter has that language", () => {
    const chapters = [
      chapter({ source: ["he-jerusalem-1956", "en-sefaria-community"] }),
      chapter({ source: ["he-jerusalem-1956", "en-sefaria-community"] }),
    ];

    expect(partLanguageAvailability(partWith(chapters), versions)).toEqual({
      he: "full",
      en: "full",
    });
  });

  it("is 'partial' when only some chapters have that language", () => {
    const chapters = [
      chapter({ source: ["he-jerusalem-1956", "en-ai"] }),
      chapter({ source: ["he-jerusalem-1956"] }),
    ];

    expect(partLanguageAvailability(partWith(chapters), versions)).toEqual({
      he: "full",
      en: "partial",
    });
  });

  it("is 'none' for a language absent from every chapter", () => {
    const chapters = [chapter({ source: ["he-jerusalem-1956"] })];

    expect(partLanguageAvailability(partWith(chapters), versions).en).toBe(
      "none",
    );
  });
});
