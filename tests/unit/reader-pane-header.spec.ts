import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ReaderPaneHeader from "~/components/reader/ReaderPaneHeader.vue";
import type { ContentVersion } from "~~/shared/types/content";

const version = (
  overrides: Partial<ContentVersion> &
    Pick<ContentVersion, "id" | "language" | "source">,
): ContentVersion => ({
  direction: "ltr",
  title: overrides.id,
  license: "CC0",
  ...overrides,
});

const mountHeader = async (
  meta: ContentVersion | null,
  languageOptions = ["he", "en"],
) =>
  mountSuspended(ReaderPaneHeader, {
    props: { title: "The Ari's Text", languageOptions, modelValue: "en", meta },
  });

describe("ReaderPaneHeader provenance badge", () => {
  it("badges an AI translation", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-ai", language: "en", source: "ai" }),
    );
    expect(wrapper.text()).toContain("AI translated");
  });

  it("badges a Sefaria translation", async () => {
    const wrapper = await mountHeader(
      version({
        id: "en-sefaria-community",
        language: "en",
        source: "sefaria",
      }),
    );
    expect(wrapper.text()).toContain("Sefaria translation");
  });

  it("does not badge the official Bnei Baruch translation", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    expect(wrapper.text()).not.toContain("AI translated");
    expect(wrapper.text()).not.toContain("Sefaria translation");
  });

  // CLAUDE.md: the `en-ai` badge is the one place AI attribution is
  // mandatory. It must not be collateral damage of a switcher that has
  // nothing to switch between — see the StudyStream counterpart of this
  // test, which is the case that actually regressed.
  it("still badges an AI translation when there is only one language and no select", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-ai", language: "en", source: "ai" }),
      ["en"],
    );
    expect(wrapper.find("select").exists()).toBe(false);
    expect(wrapper.text()).toContain("AI translated");
  });

  it("never badges Hebrew — it is the original, not a translation", async () => {
    const wrapper = await mountHeader(
      version({
        id: "he-jerusalem-1956",
        language: "he",
        direction: "rtl",
        source: "sefaria",
      }),
    );
    expect(wrapper.text()).not.toContain("Sefaria translation");
  });
});

describe("ReaderPaneHeader language select", () => {
  it("labels options with native language names", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    const options = wrapper.findAll("option");
    expect(options.map((option) => option.text())).toEqual([
      "עברית",
      "English",
    ]);
  });

  it("hides the select when only one language is available", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
      ["en"],
    );
    expect(wrapper.find("select").exists()).toBe(false);
  });

  // Panes mode mounts three of these at once, plus the site-locale
  // switcher — a bare "Language" would leave a screen-reader user unable
  // to tell which pane a control drives.
  it("names the control after its own pane, not just 'Language'", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    const label = wrapper.find("label");
    expect(label.text()).toBe("Language: The Ari's Text");
    expect(label.attributes("for")).toBe(
      wrapper.find("select").attributes("id"),
    );
  });

  it("emits the chosen language code", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    const select = wrapper.find("select");
    await select.setValue("he");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["he"]);
  });
});
