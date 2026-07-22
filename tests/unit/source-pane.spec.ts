import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import SourcePane from "~/components/reader/SourcePane.vue";
import type { SourceSegment } from "~~/shared/types/content";

// `SourcePane` reads its scroll container via `useReaderPaneContainer()`,
// which throws without a `ReaderPane` ancestor.
const PaneContainerStub = defineComponent({
  setup(_, { slots }) {
    const containerRef = provideReaderPaneContainer();
    return () => h("div", { ref: containerRef }, slots.default?.());
  },
});

describe("SourcePane", () => {
  it("strips the leading Sefaria seif-number prefix from the displayed html", async () => {
    const segments: SourceSegment[] = [
      {
        n: 1,
        sefariaRef: "x 1",
        html: "1. <b>Explaining the concept of the initial contraction</b>",
        anchors: [],
      },
    ];

    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(SourcePane, { segments }) },
    });

    expect(wrapper.text()).toContain(
      "Explaining the concept of the initial contraction",
    );
    // The numeral chip (rendered separately) still shows "1" once, but the
    // stripped prefix's literal "1. " text must be gone from the body.
    expect(wrapper.html()).not.toContain("1. <b>Explaining");
  });

  it("gives each segment an id matching the seif-N scheme, for mini-toc jump targets", async () => {
    const segments: SourceSegment[] = [
      { n: 1, sefariaRef: "x 1", html: "First.", anchors: [] },
      { n: 2, sefariaRef: "x 2", html: "Second.", anchors: [] },
    ];

    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(SourcePane, { segments }) },
    });

    expect(wrapper.find("#seif-1").exists()).toBe(true);
    expect(wrapper.find("#seif-2").exists()).toBe(true);
  });

  it("shows an empty-state message when the chapter has no source segments", async () => {
    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(SourcePane, { segments: [] }) },
    });

    expect(wrapper.text().toLowerCase()).toContain("no source text available");
  });

  it("emits open-seif-commentary when a plain paragraph (not a link) is tapped", async () => {
    const segments: SourceSegment[] = [
      { n: 1, sefariaRef: "x 1", html: "Plain paragraph text.", anchors: [] },
    ];

    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(SourcePane, { segments }) },
    });

    await wrapper.find("#seif-1").trigger("click");
    expect(
      wrapper.findComponent(SourcePane).emitted("open-seif-commentary"),
    ).toEqual([[1]]);
  });

  it("does not emit open-seif-commentary when a tes-anchor is tapped", async () => {
    const segments: SourceSegment[] = [
      {
        n: 1,
        sefariaRef: "x 1",
        html: 'Text with <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a>.',
        anchors: ["op-1"],
      },
    ];

    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(SourcePane, { segments }) },
    });

    await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");
    expect(
      wrapper.findComponent(SourcePane).emitted("open-seif-commentary"),
    ).toBeUndefined();
  });

  it("rewrites a legacy Sefaria site-relative href so the prerender crawler doesn't 404 on it", async () => {
    const segments: SourceSegment[] = [
      {
        n: 1,
        sefariaRef: "x 1",
        html: '<a href="/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_55">reply</a>',
        anchors: [],
      },
    ];

    const wrapper = await mountSuspended(PaneContainerStub, {
      slots: { default: () => h(SourcePane, { segments }) },
    });

    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe(
      "https://www.sefaria.org/Talmud_Eser_HaSefirot,_Section_I,_List_of_Answers_on_Topics_55",
    );
    expect(link.attributes("target")).toBe("_blank");
  });
});
