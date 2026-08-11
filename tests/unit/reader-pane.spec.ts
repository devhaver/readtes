import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ReaderPane from "~/components/reader/ReaderPane.vue";
import type { ContentVersion } from "~~/shared/types/content";

const hebrewMeta: ContentVersion = {
  id: "he-jerusalem-1956",
  language: "he",
  direction: "rtl",
  title: "ירושלים",
  license: "Public Domain",
  source: "sefaria",
};

const aiMeta: ContentVersion = {
  id: "en-ai",
  language: "en",
  direction: "ltr",
  title: "English (AI translation)",
  license: "CC0",
  source: "ai",
  translatedFrom: "he-jerusalem-1956",
};

describe("ReaderPane", () => {
  it("sets dir/lang on the scroll container from the resolved version metadata", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: [],
        modelValue: "he",
        meta: hebrewMeta,
      },
    });

    const container = wrapper.find('[lang="he"]');
    expect(container.exists()).toBe(true);
    expect(container.attributes("dir")).toBe("rtl");
  });

  it("shows the AI-translated badge only for an AI-sourced version", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: [],
        modelValue: "en",
        meta: aiMeta,
      },
    });

    expect(wrapper.text()).toContain("AI translated");
  });

  it("hides the AI badge for a non-AI version", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: [],
        modelValue: "he",
        meta: hebrewMeta,
      },
    });

    expect(wrapper.text()).not.toContain("AI translated");
  });

  it("only renders the language <select> when there's more than one language", async () => {
    const single = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: ["he"],
        modelValue: "he",
        meta: hebrewMeta,
      },
    });
    expect(single.find("select").exists()).toBe(false);

    const multiple = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: ["he", "en"],
        modelValue: "he",
        meta: hebrewMeta,
      },
    });
    expect(multiple.find("select").exists()).toBe(true);
  });

  it("emits update:modelValue when the language <select> changes", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: ["he", "en"],
        modelValue: "he",
        meta: hebrewMeta,
      },
    });

    await wrapper.find("select").setValue("en");
    expect(wrapper.emitted("update:modelValue")).toEqual([["en"]]);
  });
});
