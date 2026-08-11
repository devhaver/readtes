/**
 * The house rules are the one part of the glossary written *about* the
 * English edition rather than in the reader's language: topic, rule and
 * evidence all come out of the artifact as English prose, and several of
 * them quote Hebrew fragments inline. Under `/he` the document is
 * `dir="rtl"`, so an untagged rule has its brackets, slashes and trailing
 * punctuation reordered by the bidi algorithm — legible-looking, wrong.
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
  it("tags every convention's topic, rule and evidence as English prose", async () => {
    const wrapper = await mountList();

    for (const convention of conventions) {
      for (const prose of [
        convention.topic,
        convention.rule,
        convention.evidence,
      ]) {
        const tagged = wrapper
          .findAll('[dir="ltr"][lang="en"]')
          .find((element) => element.text() === prose);

        expect(tagged, `untagged English: ${prose}`).toBeTruthy();
      }
    }
  });

  it("leaves the translated label around the evidence in the page's own direction", async () => {
    const wrapper = await mountList();
    const evidenceLine = wrapper
      .findAll("p")
      .find((paragraph) => paragraph.text().startsWith("Evidence:"));

    expect(evidenceLine).toBeTruthy();
    expect(evidenceLine!.attributes("dir")).toBeUndefined();
    expect(evidenceLine!.get('[dir="ltr"]').text()).toBe(
      conventions[0]?.evidence,
    );
  });

  it("prerenders one collapsed disclosure per rule", async () => {
    const wrapper = await mountList();
    const details = wrapper.findAll("details");

    expect(details).toHaveLength(conventions.length);
    expect(details.every((d) => d.attributes("open") === undefined)).toBe(true);
  });
});
