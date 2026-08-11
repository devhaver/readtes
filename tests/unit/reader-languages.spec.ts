import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick } from "vue";
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
    id: "he-bb",
    language: "he",
    direction: "rtl",
    title: "Bnei Baruch — עברית",
    license: "Used with permission",
    source: "kabbalahmedia",
  },
  {
    id: "en-bb",
    language: "en",
    direction: "ltr",
    title: "Bnei Baruch (KabbalahMedia)",
    license: "Used with permission",
    source: "kabbalahmedia",
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
  {
    id: "ru-bb",
    language: "ru",
    direction: "ltr",
    title: "Bnei Baruch — Русский",
    license: "Used with permission",
    source: "kabbalahmedia",
  },
  {
    id: "ru-ai",
    language: "ru",
    direction: "ltr",
    title: "Русский (AI)",
    license: "CC0",
    source: "ai",
  },
];

const versionsById = buildVersionsById(versions);

describe("resolveVersionForLanguage", () => {
  it("prefers the Jerusalem edition for Hebrew, even when he-bb exists", () => {
    expect(
      resolveVersionForLanguage(
        ["he-bb", "he-jerusalem-1956"],
        "he",
        versionsById,
      ),
    ).toBe("he-jerusalem-1956");
  });

  it("falls through to he-bb when the Jerusalem edition is absent", () => {
    expect(resolveVersionForLanguage(["he-bb"], "he", versionsById)).toBe(
      "he-bb",
    );
  });

  it("prefers en-bb over en-sefaria-community and en-ai", () => {
    expect(
      resolveVersionForLanguage(
        ["en-ai", "en-sefaria-community", "en-bb"],
        "en",
        versionsById,
      ),
    ).toBe("en-bb");
  });

  it("prefers en-sefaria-community over en-ai when en-bb is absent", () => {
    expect(
      resolveVersionForLanguage(
        ["en-ai", "en-sefaria-community"],
        "en",
        versionsById,
      ),
    ).toBe("en-sefaria-community");
  });

  it("falls through to en-ai when it is the only English edition", () => {
    expect(resolveVersionForLanguage(["en-ai"], "en", versionsById)).toBe(
      "en-ai",
    );
  });

  it("uses the generic <lang>-bb then <lang>-ai chain for other languages", () => {
    expect(
      resolveVersionForLanguage(["ru-ai", "ru-bb"], "ru", versionsById),
    ).toBe("ru-bb");
    expect(resolveVersionForLanguage(["ru-ai"], "ru", versionsById)).toBe(
      "ru-ai",
    );
  });

  it("falls back to any version in that language when no chain id matches", () => {
    expect(resolveVersionForLanguage(["en-curated"], "en", versionsById)).toBe(
      "en-curated",
    );
  });

  it("returns null when the language has no version available", () => {
    expect(
      resolveVersionForLanguage(["he-jerusalem-1956"], "en", versionsById),
    ).toBeNull();
    expect(resolveVersionForLanguage([], "en", versionsById)).toBeNull();
  });
});

describe("languagesAvailable", () => {
  it("lists distinct languages with Hebrew first, then English, then the rest alphabetically", () => {
    expect(
      languagesAvailable(
        ["ru-ai", "en-ai", "he-jerusalem-1956", "en-bb"],
        versionsById,
      ),
    ).toEqual(["he", "en", "ru"]);
  });

  it("is stable regardless of the order version ids arrive in", () => {
    expect(languagesAvailable(["en-bb", "he-bb"], versionsById)).toEqual([
      "he",
      "en",
    ]);
    expect(languagesAvailable(["he-bb", "en-bb"], versionsById)).toEqual([
      "he",
      "en",
    ]);
  });

  it("ignores ids with no registry entry", () => {
    expect(languagesAvailable(["nonexistent-id"], versionsById)).toEqual([]);
  });

  it("returns an empty list for no available versions", () => {
    expect(languagesAvailable([], versionsById)).toEqual([]);
  });
});

describe("resolveDefaultLanguage", () => {
  it("picks the UI locale's language when it is available", () => {
    expect(
      resolveDefaultLanguage(
        ["he-jerusalem-1956", "en-bb"],
        "he",
        versionsById,
      ),
    ).toBe("he");
    expect(
      resolveDefaultLanguage(
        ["he-jerusalem-1956", "en-bb"],
        "en",
        versionsById,
      ),
    ).toBe("en");
  });

  it("falls back to English when the UI locale has no version", () => {
    expect(resolveDefaultLanguage(["en-ai"], "he", versionsById)).toBe("en");
  });

  it("falls back to Hebrew when neither the UI locale nor English is available", () => {
    expect(
      resolveDefaultLanguage(["he-jerusalem-1956"], "ru", versionsById),
    ).toBe("he");
  });

  it("falls back to the first available language otherwise", () => {
    expect(resolveDefaultLanguage(["ru-bb"], "de", versionsById)).toBe("ru");
  });

  it("returns null when nothing is available", () => {
    expect(resolveDefaultLanguage([], "en", versionsById)).toBeNull();
  });
});

describe("nativeLanguageName", () => {
  it("returns the native name for known languages", () => {
    expect(nativeLanguageName("he")).toBe("עברית");
    expect(nativeLanguageName("en")).toBe("English");
    expect(nativeLanguageName("ru")).toBe("Русский");
  });

  it("passes unknown codes through unchanged rather than guessing", () => {
    expect(nativeLanguageName("zz")).toBe("zz");
  });
});

describe("useReaderLanguages (hydration + persistence)", () => {
  const STORAGE_KEY = "readtes:reader-languages";

  const chapter: TocChapter = {
    id: "part-01/chapter-01",
    kind: "chapter",
    number: 1,
    title: { en: "Chapter 1", he: "פרק 1" },
    availableLayers: ["source"],
    availableVersions: {
      summary: [],
      source: ["he-jerusalem-1956", "en-sefaria-community"],
      commentary: [],
    },
  };

  // Default UI locale in tests is "en" (nuxt.config.ts), so the default
  // rule resolves to English — distinct from the persisted Hebrew below.
  const SSR_DEFAULT_LANGUAGE = "en";
  const PERSISTED_LANGUAGE = "he";

  const Host = defineComponent({
    setup() {
      const readerLanguages = useReaderLanguages(chapter, versions);
      // Captured in `setup`, i.e. before `onMounted` — this is what the
      // very first render (and the prerendered markup) resolves to.
      const preMountLanguage = readerLanguages.source.value;
      return { readerLanguages, preMountLanguage };
    },
    render: () => null,
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("resolves the default before mount, then reconciles to the persisted language", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ source: PERSISTED_LANGUAGE, commentary: null }),
    );

    const wrapper = await mountSuspended(Host);

    // Hydration-mismatch guard: the pre-mount value must be the default
    // rule's, not the persisted override's.
    expect(wrapper.vm.preMountLanguage).toBe(SSR_DEFAULT_LANGUAGE);

    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe(PERSISTED_LANGUAGE);
  });

  it("exposes the resolved version id alongside the language", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe("en");
    expect(wrapper.vm.readerLanguages.sourceVersion.value).toBe(
      "en-sefaria-community",
    );

    wrapper.vm.readerLanguages.setLanguage("source", "he");
    await nextTick();

    expect(wrapper.vm.readerLanguages.sourceVersion.value).toBe(
      "he-jerusalem-1956",
    );
  });

  it("ignores a persisted language this chapter has no version for", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ source: "ru", commentary: null }),
    );

    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe(SSR_DEFAULT_LANGUAGE);
  });

  it("persists a language choice via setLanguage", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.readerLanguages.setLanguage("source", PERSISTED_LANGUAGE);
    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe(PERSISTED_LANGUAGE);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      source: PERSISTED_LANGUAGE,
      commentary: null,
    });
  });

  it("resolves a null version for a layer with no versions at all", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerLanguages.commentary.value).toBeNull();
    expect(wrapper.vm.readerLanguages.commentaryVersion.value).toBeNull();
  });
});
