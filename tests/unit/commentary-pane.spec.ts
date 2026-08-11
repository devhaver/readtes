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
  it("renders items under their section heading", async () => {
    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(CommentaryPane, { items }) },
    });

    expect(wrapper.text()).toContain("Inner Light");
    expect(wrapper.text()).toContain("First commentary item");
    expect(wrapper.text()).toContain("Second commentary item");
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
});
