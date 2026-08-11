import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import GlossaryPage from "~/pages/glossary.vue";
import glossaryIndex from "~~/content/glossary/tes-en.index.json";

const rowSelector = "li h3 button";

describe("glossary page", () => {
  it("renders one row per term in the committed index", async () => {
    const wrapper = await mountSuspended(GlossaryPage);

    expect(wrapper.findAll(rowSelector)).toHaveLength(
      glossaryIndex.entries.length,
    );
  });

  it("keeps the index's own thematic order rather than sorting alphabetically", async () => {
    const wrapper = await mountSuspended(GlossaryPage);
    const first = wrapper.findAll(rowSelector)[0];

    expect(first?.text()).toContain(glossaryIndex.entries[0]?.he);
  });

  it("filters the list as you type, in Hebrew", async () => {
    const wrapper = await mountSuspended(GlossaryPage);

    await wrapper.get('input[type="search"]').setValue("מסך");

    const rows = wrapper.findAll(rowSelector);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(glossaryIndex.entries.length);
    expect(wrapper.text()).toContain("screen");
  });

  it("filters by strategy when a chip is pressed, and clears it when pressed again", async () => {
    const wrapper = await mountSuspended(GlossaryPage);
    const acronymCount = glossaryIndex.entries.filter(
      (entry) => entry.strategy === "acronym",
    ).length;

    const chip = wrapper
      .findAll('[role="group"] button')
      .find((button) => button.text().startsWith("Acronym"));
    expect(chip).toBeTruthy();

    await chip!.trigger("click");
    expect(chip!.attributes("aria-pressed")).toBe("true");
    expect(wrapper.findAll(rowSelector)).toHaveLength(acronymCount);

    await chip!.trigger("click");
    expect(wrapper.findAll(rowSelector)).toHaveLength(
      glossaryIndex.entries.length,
    );
  });

  it("offers a way back when nothing matches", async () => {
    const wrapper = await mountSuspended(GlossaryPage);

    await wrapper.get('input[type="search"]').setValue("qqqzzz");
    expect(wrapper.findAll(rowSelector)).toHaveLength(0);
    expect(wrapper.text()).toContain("No term matches.");

    const clear = wrapper
      .findAll("button")
      .find((button) => button.text() === "Clear filters");
    await clear!.trigger("click");

    expect(wrapper.findAll(rowSelector)).toHaveLength(
      glossaryIndex.entries.length,
    );
  });

  it("states the evidence base and the parts it does not cover", async () => {
    const wrapper = await mountSuspended(GlossaryPage);
    const text = wrapper.text();

    expect(text).toContain(String(glossaryIndex.meta.alignedChapters));
    expect(text).toContain("Parts 1, 2, 3, 5, 6");
  });

  it("prerenders every house rule as a collapsed native disclosure", async () => {
    const wrapper = await mountSuspended(GlossaryPage);
    const details = wrapper.findAll("details");

    // One per convention, plus the "how the glossary was built" panel.
    expect(details.length).toBe(glossaryIndex.conventions.length + 1);
    expect(
      details.every((detail) => detail.attributes("open") === undefined),
    ).toBe(true);
    expect(wrapper.text()).toContain(glossaryIndex.conventions[0]?.topic);
  });

  it("renders the known gaps verbatim rather than hiding the coverage caveat", async () => {
    const wrapper = await mountSuspended(GlossaryPage);

    for (const gap of glossaryIndex.knownGaps) {
      expect(wrapper.text()).toContain(gap.slice(0, 60));
    }
  });

  it("has exactly one h1", async () => {
    const wrapper = await mountSuspended(GlossaryPage);

    expect(wrapper.findAll("h1")).toHaveLength(1);
    expect(wrapper.get("h1").text()).toBe("Glossary");
  });
});
