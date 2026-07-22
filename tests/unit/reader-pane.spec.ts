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
  it("sets dir/lang on the scroll container from the version metadata", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        versionOptions: [],
        modelValue: "he-jerusalem-1956",
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
        versionOptions: [],
        modelValue: "en-ai",
        meta: aiMeta,
      },
    });

    expect(wrapper.text()).toContain("AI translated");
  });

  it("hides the AI badge for a non-AI version", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        versionOptions: [],
        modelValue: "he-jerusalem-1956",
        meta: hebrewMeta,
      },
    });

    expect(wrapper.text()).not.toContain("AI translated");
  });

  it("only renders the version <select> when there's more than one version", async () => {
    const single = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        versionOptions: [{ id: "he-jerusalem-1956", label: "Hebrew" }],
        modelValue: "he-jerusalem-1956",
        meta: hebrewMeta,
      },
    });
    expect(single.find("select").exists()).toBe(false);

    const multiple = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        versionOptions: [
          { id: "he-jerusalem-1956", label: "Hebrew" },
          { id: "en-ai", label: "English (AI)" },
        ],
        modelValue: "he-jerusalem-1956",
        meta: hebrewMeta,
      },
    });
    expect(multiple.find("select").exists()).toBe(true);
  });

  it("emits update:modelValue when the version <select> changes", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        versionOptions: [
          { id: "he-jerusalem-1956", label: "Hebrew" },
          { id: "en-ai", label: "English (AI)" },
        ],
        modelValue: "he-jerusalem-1956",
        meta: hebrewMeta,
      },
    });

    await wrapper.find("select").setValue("en-ai");
    expect(wrapper.emitted("update:modelValue")).toEqual([["en-ai"]]);
  });
});
