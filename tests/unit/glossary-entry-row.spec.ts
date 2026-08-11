import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import GlossaryEntryRow from "~/components/glossary/GlossaryEntryRow.vue";
import type {
  GlossaryCitation,
  GlossaryIndexEntry,
} from "~~/shared/types/content";

const partsCovered = ["part-01", "part-02", "part-03"];

const or: GlossaryIndexEntry = {
  id: "or",
  he: "אור",
  canonicalEn: "light",
  strategy: "translate",
  heItemCount: 449,
  alignedItemCount: 441,
  coveragePct: 98,
  attestedInParts: ["part-01", "part-03"],
  variants: [
    { en: "light", occurrences: 1250 },
    { en: "Light (title case, in section names)", occurrences: 7 },
  ],
  note: "Never transliterated as Ohr.",
  citationCount: 1,
};

const citations: GlossaryCitation[] = [
  {
    chapterId: "part-03/answers-terminology-13",
    layer: "source",
    item: "item 1",
    he: "פרצוף הכתר נקרא אריך אנפין",
    en: "Partzuf Keter is called Arich Anpin",
  },
];

const mountRow = (
  props: Partial<InstanceType<typeof GlossaryEntryRow>["$props"]> = {},
) =>
  mountSuspended(GlossaryEntryRow, {
    props: { entry: or, partsCovered, citations: null, ...props },
  });

describe("GlossaryEntryRow", () => {
  it("renders the Hebrew term with rtl direction and a Hebrew lang tag", async () => {
    const wrapper = await mountRow();
    const hebrew = wrapper.get('[lang="he"]');

    expect(hebrew.text()).toBe("אור");
    expect(hebrew.attributes("dir")).toBe("rtl");
  });

  it("renders the canonical English with ltr direction and an English lang tag", async () => {
    const wrapper = await mountRow();
    const english = wrapper.get('span[lang="en"]');

    expect(english.text()).toBe("light");
    expect(english.attributes("dir")).toBe("ltr");
  });

  it("marks the crossing rule with the entry's strategy", async () => {
    const wrapper = await mountRow();

    expect(wrapper.get(".glossary-crossing").attributes("data-strategy")).toBe(
      "translate",
    );
  });

  it("starts collapsed, with the detail panel absent from the DOM", async () => {
    const wrapper = await mountRow();

    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    expect(wrapper.find("#glossary-entry-or").exists()).toBe(false);
  });

  it("expands on click and emits open so the page can fetch the citations chunk", async () => {
    const wrapper = await mountRow();

    await wrapper.get("button").trigger("click");

    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(wrapper.find("#glossary-entry-or").exists()).toBe(true);
    expect(wrapper.emitted("open")).toHaveLength(1);
  });

  it("shows the note and every attested variant with its count once open", async () => {
    const wrapper = await mountRow();
    await wrapper.get("button").trigger("click");

    const text = wrapper.text();
    expect(text).toContain("Never transliterated as Ohr.");
    expect(text).toContain("Light (title case, in section names)");
    expect(text).toContain("1250");
  });

  it("scales the variant bars against the entry's most-used rendering", async () => {
    const wrapper = await mountRow();
    await wrapper.get("button").trigger("click");

    const bars = wrapper.findAll(".glossary-variant-bar");
    expect(bars[0]?.attributes("style")).toContain("inline-size: 100%");
    expect(bars[1]?.attributes("style")).toContain("inline-size: 1%");
  });

  it("says the citations are still loading while the chunk is in flight", async () => {
    const wrapper = await mountRow();
    await wrapper.get("button").trigger("click");

    expect(wrapper.text()).toContain("Loading passages");
    expect(wrapper.find("figure").exists()).toBe(false);
  });

  it("links a citation to the chapter it was read off", async () => {
    const wrapper = await mountRow({ citations });
    await wrapper.get("button").trigger("click");

    const link = wrapper.get("figcaption a");
    expect(link.attributes("href")).toBe(
      "/read/part-03/answers-terminology-13",
    );
    expect(link.text()).toContain("Part 3");
    expect(link.text()).toContain("Answers — Terminology 13");
  });

  it("renders a citation's two languages with their own dir/lang", async () => {
    const wrapper = await mountRow({ citations });
    await wrapper.get("button").trigger("click");

    const quote = wrapper.get("figure blockquote");
    const hebrew = quote.get('[lang="he"]');
    const english = quote.get('[lang="en"]');

    expect(hebrew.attributes("dir")).toBe("rtl");
    expect(english.attributes("dir")).toBe("ltr");
    expect(english.text()).toContain("Arich Anpin");
  });

  it("renders no citation section for an entry that has none", async () => {
    const wrapper = await mountRow({
      entry: { ...or, citationCount: 0 },
      citations: [],
    });
    await wrapper.get("button").trigger("click");

    expect(wrapper.text()).not.toContain("Loading passages");
    expect(wrapper.find("figure").exists()).toBe(false);
  });

  it("surfaces a derived (unattested) entry's caveat", async () => {
    const wrapper = await mountRow({
      entry: {
        ...or,
        variants: undefined,
        citationCount: 0,
        attestation: "DERIVED — zero aligned occurrences in en-bb",
      },
      citations: [],
    });
    await wrapper.get("button").trigger("click");

    expect(wrapper.text()).toContain("DERIVED — zero aligned occurrences");
  });

  it("does not repeat the plain 'attested' marker as a caveat", async () => {
    const wrapper = await mountRow({
      entry: { ...or, attestation: "attested" },
    });
    await wrapper.get("button").trigger("click");

    expect(wrapper.find(".text-\\(--warning-text\\)").exists()).toBe(false);
  });
});
