import { describe, expect, it } from "vitest";
import type { ContentVersion } from "~~/shared/types/content";

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
  {
    id: "en-curated",
    language: "en",
    direction: "ltr",
    title: "Read TES Curated Summary",
    license: "CC-BY",
    source: "curated",
  },
];

const versionsById = buildVersionsById(versions);

describe("resolveDefaultVersion", () => {
  it("picks Hebrew for a Hebrew UI locale when a Hebrew version is available", () => {
    expect(
      resolveDefaultVersion(
        ["en-sefaria-community", "he-jerusalem-1956"],
        "he",
        versionsById,
      ),
    ).toBe("he-jerusalem-1956");
  });

  it("picks en-sefaria-community over en-ai for an English UI locale", () => {
    expect(
      resolveDefaultVersion(
        ["he-jerusalem-1956", "en-sefaria-community", "en-ai"],
        "en",
        versionsById,
      ),
    ).toBe("en-sefaria-community");
  });

  it("falls back to en-ai when en-sefaria-community isn't available", () => {
    expect(
      resolveDefaultVersion(["he-jerusalem-1956", "en-ai"], "en", versionsById),
    ).toBe("en-ai");
  });

  it("falls back to Hebrew for an English UI locale with no English version at all", () => {
    expect(
      resolveDefaultVersion(["he-jerusalem-1956"], "en", versionsById),
    ).toBe("he-jerusalem-1956");
  });

  it("falls back to the best English version for a Hebrew UI locale with no Hebrew version", () => {
    expect(
      resolveDefaultVersion(
        ["en-ai", "en-sefaria-community"],
        "he",
        versionsById,
      ),
    ).toBe("en-sefaria-community");
  });

  it("falls back to any other English version (en-curated) when neither priority id is present", () => {
    expect(resolveDefaultVersion(["en-curated"], "en", versionsById)).toBe(
      "en-curated",
    );
    expect(resolveDefaultVersion(["en-curated"], "he", versionsById)).toBe(
      "en-curated",
    );
  });

  it("returns null for an empty list", () => {
    expect(resolveDefaultVersion([], "en", versionsById)).toBeNull();
  });
});
