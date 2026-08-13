import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import CommentaryPane from "~/components/reader/CommentaryPane.vue";
import type { CommentaryItem } from "~~/shared/types/content";

// `CommentaryPane` reads its scroll container via `useReaderPaneContainer()`,
// which throws without a `ReaderPane` ancestor — this stub provides just
// that (not the rest of `ReaderPane`'s header chrome), so the test stays
// focused on `CommentaryPane` itself.
const PaneContainerStub = defineComponent({
  setup(_, { slots }) {
    const containerRef = provideReaderPaneContainer();
    return () => h("div", { ref: containerRef }, slots.default?.());
  },
});

const items: CommentaryItem[] = [
  {
    anchorId: "op-1",
    order: 1,
    label: { en: "1", he: "א" },
    sefariaRef: "x 1",
    targetSeif: 1,
    section: "ohr-pnimi",
    html: "First commentary item",
  },
  {
    anchorId: "op-2",
    order: 2,
    label: { en: "2", he: "ב" },
    sefariaRef: "x 2",
    targetSeif: 1,
    section: "ohr-pnimi",
    html: "Second commentary item",
  },
];

/** An unanchored item: known chapter, unknown seif — no `targetSeif` (issue #79). */
const unanchoredItem: CommentaryItem = {
  anchorId: "op-3",
  order: 3,
  label: { en: "3", he: "3" },
  section: "ohr-pnimi",
  html: "Unanchored commentary item",
};

describe("CommentaryPane", () => {
  it("renders the section's items", async () => {
    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(CommentaryPane, { items }) },
    });

    expect(wrapper.text()).toContain("First commentary item");
    expect(wrapper.text()).toContain("Second commentary item");
  });

  describe("section heading", () => {
    it("omits it for an Ohr Pnimi-only chapter, whose pane header already says it", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      expect(wrapper.text()).not.toContain("Inner Light");
    });

    it("keeps it when the section is not what the pane header says", async () => {
      const histaklut = items.map((item) => ({
        ...item,
        section: "histaklut-pnimit" as const,
      }));

      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items: histaklut }) },
      });

      expect(wrapper.text()).toContain("Inner Observation");
    });

    it("keeps it when a chapter carries both sections, which must be told apart", async () => {
      const bothSections = [
        ...items,
        {
          ...items[0]!,
          anchorId: "op-9",
          order: 9,
          section: "histaklut-pnimit" as const,
        },
      ];

      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items: bothSections }) },
      });

      expect(wrapper.text()).toContain("Inner Light");
      expect(wrapper.text()).toContain("Inner Observation");
    });
  });

  it("shows an empty-state message when the chapter has no commentary", async () => {
    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(CommentaryPane, { items: [] }) },
    });

    expect(wrapper.text().toLowerCase()).toContain("no commentary available");
  });

  it("gives each item an id matching its anchorId, for highlight targeting", async () => {
    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(CommentaryPane, { items }) },
    });

    expect(wrapper.find("#op-1").exists()).toBe(true);
    expect(wrapper.find("#op-2").exists()).toBe(true);
  });

  it("does not throw when a label chip is clicked", async () => {
    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(CommentaryPane, { items }) },
    });

    const chip = wrapper.findAll("button.tes-anchor")[0];
    await chip?.trigger("click");
  });

  describe("unanchored items (issue #79: known chapter, unknown seif)", () => {
    it("renders an anchored-only chapter with no not-aligned note", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      expect(wrapper.text()).not.toContain("not yet");
      expect(wrapper.findAll("button.tes-anchor")).toHaveLength(2);
    });

    it("renders an unanchored-only chapter's items in order, with the not-aligned note shown once", async () => {
      const unanchoredOnly = [
        unanchoredItem,
        { ...unanchoredItem, anchorId: "op-4", order: 4, html: "Fourth item" },
      ];

      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items: unanchoredOnly }) },
      });

      const matches =
        wrapper.text().match(/matched to individual seifim/g) ?? [];
      expect(matches).toHaveLength(1);
      expect(wrapper.text()).toContain("Unanchored commentary item");
      expect(wrapper.text()).toContain("Fourth item");
    });

    it("renders a mixed chapter with both anchored and unanchored items, and shows the note once", async () => {
      const mixed = [...items, unanchoredItem];

      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items: mixed }) },
      });

      const matches =
        wrapper.text().match(/matched to individual seifim/g) ?? [];
      expect(matches).toHaveLength(1);
      expect(wrapper.findAll("button.tes-anchor")).toHaveLength(2);
      expect(wrapper.text()).toContain("Unanchored commentary item");
    });

    it("gives an unanchored item's label no clickable/dead highlight affordance", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: {
          default: () => h(CommentaryPane, { items: [unanchoredItem] }),
        },
      });

      expect(wrapper.find("button.tes-anchor").exists()).toBe(false);
      expect(wrapper.find("#op-3").exists()).toBe(true);
      expect(wrapper.text()).toContain("3");
    });
  });
  describe("seif grouping", () => {
    /** Two seifim: seif 1 carries op-1/op-2, seif 2 carries op-3. */
    const acrossTwoSeifim: CommentaryItem[] = [
      ...items,
      {
        anchorId: "op-3",
        order: 3,
        label: { en: "3", he: "\u05d2" },
        sefariaRef: "x 3",
        targetSeif: 2,
        section: "ohr-pnimi",
        html: "Third commentary item",
      },
    ];

    it("heads each group with its seif number, not the items' running order", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      expect(wrapper.find(".tes-commentary-seif-heading").text()).toBe(
        "Seif 1",
      );
    });

    it("renders every seif in the chapter at once, ascending", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items: acrossTwoSeifim }) },
      });

      expect(
        wrapper
          .findAll(".tes-commentary-seif-heading")
          .map((heading) => heading.text()),
      ).toEqual(["Seif 1", "Seif 2"]);
      expect(wrapper.find("#op-1").exists()).toBe(true);
      expect(wrapper.find("#op-3").exists()).toBe(true);
    });

    it("gives the unanchored items their own trailing group", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: {
          default: () =>
            h(CommentaryPane, { items: [...items, unanchoredItem] }),
        },
      });

      expect(
        wrapper
          .findAll(".tes-commentary-seif-heading")
          .map((heading) => heading.text()),
      ).toEqual(["Seif 1", "Not matched to a seif"]);
    });
  });

  describe("collapsible groups", () => {
    it("opens every group by default — nothing is hidden on arrival", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      const groups = wrapper.findAll("details");
      expect(groups.length).toBeGreaterThan(0);
      for (const group of groups) {
        expect((group.element as HTMLDetailsElement).open).toBe(true);
      }
    });

    it("makes the seif heading the group's own summary, so it toggles it", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      const heading = wrapper.find(".tes-commentary-seif-heading");
      expect(heading.element.tagName).toBe("SUMMARY");
      expect(heading.element.parentElement?.tagName).toBe("DETAILS");
    });

    it("keeps the seif number readable as a heading inside the summary", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      expect(wrapper.find(".tes-commentary-seif-heading h4").text()).toBe(
        "Seif 1",
      );
    });

    it("keeps a collapsed group's items in the document, for in-page find", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      const group = wrapper.find("details").element as HTMLDetailsElement;
      group.open = false;

      expect(wrapper.find("#op-1").exists()).toBe(true);
    });
  });
  describe("marker text (issue #96)", () => {
    it("prints the marker the source text shows, not the item's stored label", async () => {
      // Bnei Baruch's English marks the 11th note "(20)" in the Ari's text
      // while numbering it "11" in the commentary list. The reader clicks
      // "20", so "20" is what they must land on.
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: {
          default: () =>
            h(CommentaryPane, {
              items,
              anchorMarkers: new Map([
                ["op-1", "20"],
                ["op-2", "30"],
              ]),
            }),
        },
      });

      expect(
        wrapper.findAll(".tes-commentary-marker").map((m) => m.text()),
      ).toEqual(["20", "30"]);
    });

    it("falls back to the stored label for an anchor the source does not print", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: {
          default: () =>
            h(CommentaryPane, {
              items,
              anchorMarkers: new Map([["op-1", "20"]]),
            }),
        },
      });

      expect(
        wrapper.findAll(".tes-commentary-marker").map((m) => m.text()),
      ).toEqual(["20", "2"]);
    });

    it("uses the stored label throughout when given no markers at all", async () => {
      const wrapper = await mountSuspended(PaneContainerStub, {
        slots: { default: () => h(CommentaryPane, { items }) },
      });

      expect(
        wrapper.findAll(".tes-commentary-marker").map((m) => m.text()),
      ).toEqual(["1", "2"]);
    });
  });
});
