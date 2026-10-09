/**
 * The house rules are written in the reader's language (`glossary.
 * conventionCopy.<id>` in every locale), keyed by the convention's id — the
 * artifact's own topic/rule/evidence strings are pipeline notes (counts,
 * file names, anchor ids) and are never rendered. Several examples quote
 * Hebrew inline, so those stay explicitly tagged by `GlossaryQuotePair`.
 */
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import GlossaryConventionList from "~/components/glossary/GlossaryConventionList.vue";
import glossaryIndex from "~~/content/glossary/tes-en.index.json";
import type { GlossaryConvention } from "~~/shared/types/content";

const conventions = glossaryIndex.conventions as GlossaryConvention[];

const mountList = () =>
  mountSuspended(GlossaryConventionList, { props: { conventions } });

describe("GlossaryConventionList", () => {
  it("renders each rule's topic and rule from the reader-facing copy", async () => {
    const wrapper = await mountList();
    const summaries = wrapper.findAll("summary").map((s) => s.text());

    expect(summaries).toHaveLength(conventions.length);
    expect(summaries[0]).toBe("Item markers");
    expect(wrapper.text()).toContain(
      "A Hebrew letter used as an inline marker",
    );
    expect(wrapper.text()).not.toContain("glossary.conventionCopy");
  });

  it("never renders the artifact's own pipeline notes", async () => {
    const wrapper = await mountList();

    for (const convention of conventions) {
      expect(wrapper.text()).not.toContain(convention.evidence);
      expect(wrapper.text()).not.toContain(convention.rule);
    }
    expect(wrapper.text()).not.toMatch(/op-\d+/);
    expect(wrapper.text()).not.toContain("Evidence:");
  });

  it("prerenders one collapsed disclosure per rule", async () => {
    const wrapper = await mountList();
    const details = wrapper.findAll("details");

    expect(details).toHaveLength(conventions.length);
    expect(details.every((d) => d.attributes("open") === undefined)).toBe(true);
  });
});
