// Integration coverage for study mode's inline commentary disclosure
// (T8): a small, close-to-production mount of the real `StudyStream` —
// covers tapping an anchor to unfold/fold its commentary inline, several
// anchors open at once, and the inline missing-anchor notice with its
// one-click Hebrew switch. `reader-anchor-sync.spec.ts` covers the
// equivalent panes-mode cross-pane behaviour this reuses
// (`useAnchorActivation`/`useHighlightedAnchor`).
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudyStream from "~/components/reader/StudyStream.vue";
import type { CommentaryItem, SourceSegment } from "~~/shared/types/content";

const HEBREW = "he-jerusalem-1956";

const segments: SourceSegment[] = [
  {
    n: 1,
    sefariaRef: "x 1",
    html: 'First segment with <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a> and <a class="tes-anchor" href="#op-2" data-anchor="op-2">ב</a> two anchors.',
    anchors: ["op-1", "op-2"],
  },
  {
    n: 2,
    sefariaRef: "x 2",
    html: "Second segment, no anchors.",
    anchors: [],
  },
];

const commentaryItem = (anchorId: string): CommentaryItem => ({
  anchorId,
  order: 1,
  label: { en: anchorId, he: anchorId },
  sefariaRef: "y",
  targetSeif: 1,
  section: "ohr-pnimi",
  html: `Commentary for ${anchorId}.`,
});

// Only op-1 has an item in the currently-selected (English) commentary
// version — op-2 is "missing in this edition" but present in Hebrew.
const commentaryItems: CommentaryItem[] = [commentaryItem("op-1")];
const hebrewItems: CommentaryItem[] = [
  commentaryItem("op-1"),
  commentaryItem("op-2"),
];

const baseProps = {
  sourceSegments: segments,
  commentaryItems,
  summaryItems: [],
  sourceMeta: null,
  commentaryMeta: null,
  sourceVersionOptions: [],
  commentaryVersionOptions: [
    { id: "en-sefaria-community", label: "English" },
    { id: HEBREW, label: "Hebrew" },
  ],
  sourceVersion: null,
  commentaryVersion: "en-sefaria-community",
  hebrewItems,
  hebrewVersionId: HEBREW,
};

describe("StudyStream", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("unfolds an anchor's commentary inline on tap, and folds it back on a second tap", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });

    expect(wrapper.text()).not.toContain("Commentary for op-1");

    const anchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');
    await anchor.trigger("click");

    expect(wrapper.text()).toContain("Commentary for op-1");

    await anchor.trigger("click");

    expect(wrapper.text()).not.toContain("Commentary for op-1");
  });

  it("flips aria-expanded (and sets aria-controls) on the tapped anchor as its inline disclosure toggles", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });

    const anchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');
    expect(anchor.attributes("aria-expanded")).toBe("false");
    expect(anchor.attributes("aria-controls")).toBe("op-1");

    await anchor.trigger("click");
    expect(anchor.attributes("aria-expanded")).toBe("true");
    expect(anchor.attributes("aria-controls")).toBe("op-1");

    await anchor.trigger("click");
    expect(anchor.attributes("aria-expanded")).toBe("false");
  });

  it("re-syncs aria-expanded/aria-controls onto the fresh anchor node after a source-version switch", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });

    await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");
    expect(
      wrapper
        .find('a.tes-anchor[data-anchor="op-1"]')
        .attributes("aria-expanded"),
    ).toBe("true");

    // A source-version switch replaces the `v-html` markup outright — same
    // anchor id, but a brand-new DOM node with none of the attributes the
    // previous node had synced onto it.
    const switchedSegments: SourceSegment[] = [
      {
        n: 1,
        sefariaRef: "x 1",
        html: 'Different wording with <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a> the same anchor.',
        anchors: ["op-1", "op-2"],
      },
      segments[1]!,
    ];
    await wrapper.setProps({ sourceSegments: switchedSegments });

    const freshAnchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');
    expect(freshAnchor.attributes("aria-expanded")).toBe("true");
    expect(freshAnchor.attributes("aria-controls")).toBe("op-1");
  });

  it("keeps multiple anchors open at once — opening a second doesn't fold the first", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });

    await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");
    // op-2 is "missing" in the currently-selected version, but tapping it
    // should still open its (missing-notice) disclosure alongside op-1's.
    await wrapper.find('a.tes-anchor[data-anchor="op-2"]').trigger("click");

    expect(wrapper.text()).toContain("Commentary for op-1");
    expect(wrapper.text()).toContain("Not available in this edition");
  });

  it("shows the inline missing-anchor notice with a one-click Hebrew switch, and emits the version change", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });

    await wrapper.find('a.tes-anchor[data-anchor="op-2"]').trigger("click");

    expect(wrapper.text()).toContain("Not available in this edition");
    const switchButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Switch to Hebrew");
    expect(switchButton).toBeTruthy();

    await switchButton?.trigger("click");

    expect(wrapper.emitted("update:commentaryVersion")).toEqual([[HEBREW]]);
  });

  it("doesn't offer a Hebrew switch once Hebrew is already selected", async () => {
    const wrapper = await mountSuspended(StudyStream, {
      props: {
        ...baseProps,
        commentaryItems: [],
        commentaryVersion: HEBREW,
        hebrewItems: [],
      },
    });

    await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");

    expect(wrapper.text()).toContain("Not available in this edition");
    expect(
      wrapper.findAll("button").some((b) => b.text() === "Switch to Hebrew"),
    ).toBe(false);
  });

  it("renders every commentary item for an anchor when more than one applies", async () => {
    const wrapper = await mountSuspended(StudyStream, {
      props: {
        ...baseProps,
        commentaryItems: [commentaryItem("op-1"), commentaryItem("op-1")],
      },
    });

    await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");

    const matches = wrapper.text().match(/Commentary for op-1/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it("offers the 'read the full commentary' link when the chapter has a commentary layer", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });
    expect(wrapper.text()).toContain("Read the full commentary");
  });

  it("hides the 'read the full commentary' link when the chapter has no commentary layer", async () => {
    const wrapper = await mountSuspended(StudyStream, {
      props: { ...baseProps, commentaryVersionOptions: [] },
    });
    expect(wrapper.text()).not.toContain("Read the full commentary");
  });
});
