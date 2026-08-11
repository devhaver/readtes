import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import InnerObservationPane, {
  type InnerObservationSectionView,
} from "~/components/reader/InnerObservationPane.vue";

describe("InnerObservationPane", () => {
  it("renders every section under its own title heading, in order", async () => {
    const sections: InnerObservationSectionView[] = [
      {
        chapterId: "part-01/inner-observation-01",
        title: { en: "Histaklut Pnimit 1", he: "הסתכלות פנימית א׳" },
        items: [
          { n: 1, sefariaRef: "x 1", html: "First section.", anchors: [] },
        ],
      },
      {
        chapterId: "part-01/inner-observation-02",
        title: { en: "Histaklut Pnimit 2", he: "הסתכלות פנימית ב׳" },
        items: [
          { n: 1, sefariaRef: "x 2", html: "Second section.", anchors: [] },
        ],
      },
    ];

    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections },
    });

    const text = wrapper.text();
    expect(text).toContain("Histaklut Pnimit 1");
    expect(text).toContain("First section.");
    expect(text).toContain("Histaklut Pnimit 2");
    expect(text).toContain("Second section.");
    expect(text.indexOf("First section.")).toBeLessThan(
      text.indexOf("Histaklut Pnimit 2"),
    );
  });

  it("never renders ids on its segments — a same-numbered section would collide with the Source pane's seif-N ids", async () => {
    const sections: InnerObservationSectionView[] = [
      {
        chapterId: "part-01/inner-observation-01",
        title: { en: "Histaklut Pnimit 1", he: "א" },
        items: [{ n: 1, sefariaRef: "x 1", html: "Text.", anchors: [] }],
      },
    ];

    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections },
    });

    expect(wrapper.find("#seif-1").exists()).toBe(false);
  });

  it("shows an empty-state message when the part has no Inner Observation sections", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections: [] },
    });

    expect(wrapper.text().toLowerCase()).toContain("no inner observation");
  });

  // The bodies are client-loaded (see `useInnerObservationContent`), so
  // "nothing here yet" is the state every first paint starts in — it must
  // not read as "this part has none".
  it("shows a labelled skeleton, not the empty state, while the bodies are pending", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections: [], pending: true },
    });

    const skeleton = wrapper.find('[data-testid="inner-observation-skeleton"]');
    expect(skeleton.exists()).toBe(true);
    expect(skeleton.attributes("role")).toBe("status");
    expect(skeleton.attributes("aria-label")?.toLowerCase()).toContain(
      "loading",
    );
    expect(wrapper.text().toLowerCase()).not.toContain("no inner observation");
  });

  it("drops the skeleton once the sections arrive", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: {
        pending: false,
        sections: [
          {
            chapterId: "part-01/inner-observation-01",
            title: { en: "Histaklut Pnimit 1", he: "א" },
            items: [{ n: 1, sefariaRef: "x 1", html: "Text.", anchors: [] }],
          },
        ] satisfies InnerObservationSectionView[],
      },
    });

    expect(
      wrapper.find('[data-testid="inner-observation-skeleton"]').exists(),
    ).toBe(false);
    expect(wrapper.text()).toContain("Text.");
  });
});
