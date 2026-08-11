// Integration coverage for study mode's inline commentary disclosure
// (T8): a small, close-to-production mount of the real `StudyStream` —
// covers tapping an anchor to unfold/fold its commentary inline, several
// anchors open at once, and the inline missing-anchor notice with its
// one-click Hebrew switch. `reader-anchor-sync.spec.ts` covers the
// equivalent panes-mode cross-pane behaviour this reuses
// (`useAnchorActivation`/`useHighlightedAnchor`).
import { mountSuspended } from "@nuxt/test-utils/runtime";
import type { VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudyStream from "~/components/reader/StudyStream.vue";
import type {
  CommentaryItem,
  ContentVersion,
  SourceSegment,
} from "~~/shared/types/content";

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

/** An unanchored item: known chapter, unknown seif — no `targetSeif` (issue #79). */
const unanchoredCommentaryItem = (
  anchorId: string,
  order: number,
): CommentaryItem => ({
  anchorId,
  order,
  label: { en: String(order), he: String(order) },
  section: "ohr-pnimi",
  html: `Unanchored commentary ${anchorId}.`,
});

// Only op-1 has an item in the currently-selected (English) commentary
// version — op-2 is "missing in this language" but present in Hebrew.
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
  sourceLanguageOptions: [],
  commentaryLanguageOptions: ["he", "en"],
  sourceLanguage: null,
  commentaryLanguage: "en",
  commentaryVersionId: "en-sefaria-community",
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
    expect(wrapper.text()).toContain("Not available in this language");
  });

  it("shows the inline missing-anchor notice with a one-click Hebrew switch, and emits the language change", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });

    await wrapper.find('a.tes-anchor[data-anchor="op-2"]').trigger("click");

    expect(wrapper.text()).toContain("Not available in this language");
    const switchButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Switch to Hebrew");
    expect(switchButton).toBeTruthy();

    await switchButton?.trigger("click");

    expect(wrapper.emitted("update:commentaryLanguage")).toEqual([["he"]]);
  });

  it("doesn't offer a Hebrew switch once Hebrew is already selected", async () => {
    const wrapper = await mountSuspended(StudyStream, {
      props: {
        ...baseProps,
        commentaryItems: [],
        commentaryLanguage: "he",
        commentaryVersionId: HEBREW,
        hebrewItems: [],
      },
    });

    await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");

    expect(wrapper.text()).toContain("Not available in this language");
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

  // CLAUDE.md names the "AI translated" badge as the project's one
  // mandatory label. Study mode is the default below `lg`, and it used to
  // render the whole pane header — badge included — only when the layer
  // offered more than one language, so an English-only chapter (what
  // issues #79/#87 create) would have shown AI text with no attribution.
  // The badge must survive the switcher's absence.
  describe("mandatory AI-translated badge", () => {
    const enAi: ContentVersion = {
      id: "en-ai",
      language: "en",
      direction: "ltr",
      title: "English (AI translation)",
      license: "CC0",
      source: "ai",
    };

    it("badges an AI-translated source layer that offers only one language", async () => {
      const wrapper = await mountSuspended(StudyStream, {
        props: {
          ...baseProps,
          sourceMeta: enAi,
          sourceLanguageOptions: ["en"],
          sourceLanguage: "en",
        },
      });

      expect(wrapper.text()).toContain("AI translated");
    });

    it("badges an AI-translated commentary layer that offers only one language", async () => {
      const wrapper = await mountSuspended(StudyStream, {
        props: {
          ...baseProps,
          commentaryMeta: enAi,
          commentaryLanguageOptions: ["en"],
          commentaryLanguage: "en",
          commentaryVersionId: "en-ai",
        },
      });

      expect(wrapper.text()).toContain("AI translated");
    });
  });

  it("offers the 'read the full commentary' link when the chapter has a commentary layer", async () => {
    const wrapper = await mountSuspended(StudyStream, { props: baseProps });
    expect(wrapper.text()).toContain("Read the full commentary");
  });

  it("hides the 'read the full commentary' link when the chapter has no commentary layer", async () => {
    const wrapper = await mountSuspended(StudyStream, {
      props: { ...baseProps, commentaryLanguageOptions: [] },
    });
    expect(wrapper.text()).not.toContain("Read the full commentary");
  });

  // `ReaderChapterIntro`'s own mini-toc disclosure is also a `<details>`, so
  // these tests pick out the unanchored-commentary section specifically by
  // its title rather than assuming it's the only (or the first) `<details>`
  // on the page.
  const findUnanchoredSection = (wrapper: VueWrapper) =>
    wrapper
      .findAll("details")
      .find((details) => details.text().includes("More commentary"));

  describe("unanchored commentary reachability (issue #79)", () => {
    it("regression: an anchored-only chapter renders no unanchored section", async () => {
      const wrapper = await mountSuspended(StudyStream, { props: baseProps });

      expect(findUnanchoredSection(wrapper)).toBeUndefined();
      expect(wrapper.text()).not.toContain("not yet matched");
    });

    it("an unanchored-only chapter reaches its commentary via a titled, collapsed-by-default section after the source stream", async () => {
      const unanchoredOnlySegments: SourceSegment[] = [
        {
          n: 1,
          sefariaRef: "x 1",
          html: "First segment, no anchors.",
          anchors: [],
        },
        {
          n: 2,
          sefariaRef: "x 2",
          html: "Second segment, no anchors.",
          anchors: [],
        },
      ];
      const unanchoredItems = [
        unanchoredCommentaryItem("op-1", 1),
        unanchoredCommentaryItem("op-2", 2),
      ];

      const heJerusalem: ContentVersion = {
        id: "he-jerusalem-1956",
        language: "he",
        direction: "rtl",
        title: "ירושלים",
        license: "Public Domain",
        source: "sefaria",
      };

      const wrapper = await mountSuspended(StudyStream, {
        props: {
          ...baseProps,
          sourceSegments: unanchoredOnlySegments,
          commentaryItems: unanchoredItems,
          hebrewItems: unanchoredItems,
          commentaryMeta: heJerusalem,
        },
      });

      const section = findUnanchoredSection(wrapper);
      expect(section).toBeDefined();
      // Collapsed by default — no `open` attribute.
      expect(section?.attributes("open")).toBeUndefined();
      expect(section?.text()).toContain("not yet matched");
      expect(section?.text()).toContain("Unanchored commentary op-1.");
      expect(section?.text()).toContain("Unanchored commentary op-2.");

      // No dead per-seif inline-disclosure triggers: no source anchor
      // markers exist for unanchored items to hang off of.
      expect(wrapper.find("a.tes-anchor").exists()).toBe(false);

      // The item lists carry the commentary VERSION's direction/language —
      // Hebrew commentary must not lay out LTR inside an English UI. The
      // note above them is UI copy and deliberately does not.
      const list = section?.find("ol");
      expect(list?.attributes("dir")).toBe("rtl");
      expect(list?.attributes("lang")).toBe("he");
    });

    it("a mixed chapter reaches unanchored items via the section AND keeps anchored items inline, without duplicating either", async () => {
      const mixedItems = [
        commentaryItem("op-1"),
        unanchoredCommentaryItem("op-9", 9),
      ];

      const wrapper = await mountSuspended(StudyStream, {
        props: {
          ...baseProps,
          commentaryItems: mixedItems,
          hebrewItems: mixedItems,
        },
      });

      // Unanchored item reachable via the titled section straight away.
      const section = findUnanchoredSection(wrapper);
      expect(section).toBeDefined();
      expect(section?.text()).toContain("Unanchored commentary op-9.");

      // Anchored item stays inline-only (folded until tapped) — not
      // duplicated into the unanchored section.
      expect(section?.text()).not.toContain("Commentary for op-1");
      expect(wrapper.text()).not.toContain("Commentary for op-1");
      await wrapper.find('a.tes-anchor[data-anchor="op-1"]').trigger("click");
      expect(wrapper.text()).toContain("Commentary for op-1");
      expect(findUnanchoredSection(wrapper)?.text()).not.toContain(
        "Commentary for op-1",
      );
    });
  });
});
