// CLAUDE.md: the `en-ai` translation version MUST be badged "AI translated"
// in the UI — in every reading mode. Panes mode (ReaderPane), study mode
// (StudyStream) and original mode (OriginalStream) each render the
// resolved version's text, so each must carry the badge; original mode once
// showed `en-ai` text with none.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import OriginalStream from "~/components/reader/OriginalStream.vue";
import ReaderPane from "~/components/reader/ReaderPane.vue";
import StudyStream from "~/components/reader/StudyStream.vue";
import type {
  CommentaryItem,
  ContentVersion,
  SourceSegment,
} from "~~/shared/types/content";

const aiMeta: ContentVersion = {
  id: "en-ai",
  language: "en",
  direction: "ltr",
  title: "English (AI translation)",
  license: "CC0",
  source: "ai",
  translatedFrom: "he-jerusalem-1956",
};

const hebrewMeta: ContentVersion = {
  id: "he-jerusalem-1956",
  language: "he",
  direction: "rtl",
  title: "ירושלים",
  license: "Public Domain",
  source: "sefaria",
};

const segments: SourceSegment[] = [
  { n: 1, sefariaRef: "x 1", html: "First seif.", anchors: [] },
];

const items: CommentaryItem[] = [
  {
    anchorId: "op-1",
    order: 1,
    label: { en: "1", he: "א" },
    sefariaRef: "y",
    targetSeif: 1,
    section: "ohr-pnimi",
    html: "Commentary.",
  },
];

describe("AI translated badge in every reading mode", () => {
  it("panes mode", async () => {
    const wrapper = await mountSuspended(ReaderPane, {
      props: {
        title: "Source",
        languageOptions: ["en"],
        modelValue: "en",
        meta: aiMeta,
      },
    });
    expect(wrapper.text()).toContain("AI translated");
  });

  it("study mode", async () => {
    const wrapper = await mountSuspended(StudyStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [],
        summaryItems: [],
        sourceMeta: aiMeta,
        commentaryMeta: null,
        sourceLanguageOptions: ["en"],
        commentaryLanguageOptions: [],
        sourceLanguage: "en",
        commentaryLanguage: null,
        commentaryVersionId: null,
        hebrewItems: null,
        hebrewVersionId: "he-jerusalem-1956",
      },
    });
    expect(wrapper.text()).toContain("AI translated");
  });

  it("original mode badges both the source and the commentary list", async () => {
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: items,
        sourceMeta: aiMeta,
        commentaryMeta: aiMeta,
        pagination: null,
      },
    });

    const source = wrapper.get('[data-testid="original-source-provenance"]');
    const commentary = wrapper.get(
      '[data-testid="original-commentary-provenance"]',
    );
    expect(source.text()).toContain("English");
    expect(source.text()).toContain("AI translated");
    expect(commentary.text()).toContain("AI translated");
  });

  it("original mode names a Hebrew original without a badge", async () => {
    const wrapper = await mountSuspended(OriginalStream, {
      props: {
        sourceSegments: segments,
        commentaryItems: [],
        sourceMeta: hebrewMeta,
        commentaryMeta: null,
        pagination: null,
      },
    });

    const source = wrapper.get('[data-testid="original-source-provenance"]');
    expect(source.text()).toContain("עברית");
    expect(source.text()).not.toContain("AI translated");
  });
});
