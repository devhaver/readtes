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

describe("useReaderVersions (hydration)", () => {
  const STORAGE_KEY = "readtes:reader-versions";

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

  // Default UI locale in tests is "en" (see nuxt.config.ts), so the
  // default-rule resolution for this chapter's source layer is the English
  // version — distinct from the Hebrew override persisted below.
  const SSR_DEFAULT = "en-sefaria-community";
  const PERSISTED_OVERRIDE = "he-jerusalem-1956";

  const Host = defineComponent({
    setup() {
      const readerVersions = useReaderVersions(chapter, versions);
      // Captured synchronously in `setup`, i.e. before this component's
      // `onMounted` runs — this is the value the very first render (and,
      // for a real page load, the prerendered SSR markup) resolves to.
      const preMountSource = readerVersions.source.value;
      return { readerVersions, preMountSource };
    },
    render: () => null,
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("resolves to the SSR default before mount, then reconciles to the persisted override after mount", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        source: PERSISTED_OVERRIDE,
        commentary: null,
        summary: null,
      }),
    );

    const wrapper = await mountSuspended(Host);

    // The pre-mount value (captured in `setup`, matching what SSR would
    // have rendered) must equal the default-rule resolution, not the
    // persisted override — this is the hydration-mismatch guard.
    expect(wrapper.vm.preMountSource).toBe(SSR_DEFAULT);

    await nextTick();

    // Post-mount, the persisted override reconciles in.
    expect(wrapper.vm.readerVersions.source.value).toBe(PERSISTED_OVERRIDE);
  });

  it("still resolves to the default rule post-mount when nothing is persisted", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerVersions.source.value).toBe(SSR_DEFAULT);
  });

  it("keeps persisting a version choice via setVersion", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.readerVersions.setVersion("source", PERSISTED_OVERRIDE);
    await nextTick();

    expect(wrapper.vm.readerVersions.source.value).toBe(PERSISTED_OVERRIDE);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      source: PERSISTED_OVERRIDE,
      commentary: null,
      summary: null,
    });
  });
});
