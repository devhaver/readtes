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
});
