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
  it("shows a decorative skeleton, not the empty state, while the bodies are pending", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections: [], state: "pending" },
    });

    const skeleton = wrapper.find('[data-testid="inner-observation-skeleton"]');
    expect(skeleton.exists()).toBe(true);
    // The pulsing bars carry no information a screen reader wants; the
    // persistent live region below announces the state instead.
    expect(skeleton.attributes("aria-hidden")).toBe("true");
    expect(wrapper.text().toLowerCase()).not.toContain("no inner observation");
  });

  it("drops the skeleton once the sections arrive", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: {
        state: "ready",
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

  // A `role="status"` that only exists while the skeleton does announces the
  // wait and never its end. This one outlives every state change, so the
  // arrival (or failure) of the bodies is what gets announced.
  it("keeps one polite live region across every state, so completion is announced", async () => {
    const sections: InnerObservationSectionView[] = [
      {
        chapterId: "part-01/inner-observation-01",
        title: { en: "Histaklut Pnimit 1", he: "א" },
        items: [{ n: 1, sefariaRef: "x 1", html: "Text.", anchors: [] }],
      },
    ];

    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections: [], state: "pending" },
    });

    const status = () =>
      wrapper.find('[data-testid="inner-observation-status"]');
    expect(status().attributes("role")).toBe("status");
    expect(status().attributes("aria-live")).toBe("polite");
    expect(status().text().toLowerCase()).toContain("loading");

    await wrapper.setProps({ sections, state: "ready" });

    // Same element, new text — that is what a live region announces.
    expect(status().exists()).toBe(true);
    expect(status().text().toLowerCase()).toContain("loaded");

    await wrapper.setProps({ sections: [], state: "failed" });
    expect(status().text().toLowerCase()).toContain("could not be loaded");
  });

  // The whole point of the third state: a chunk that 404s under a cached
  // document must never render as "this part has no Inner Observation".
  it("shows a distinct failed state with a recovery action, never the empty message", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections: [], state: "failed" },
    });

    const failed = wrapper.find('[data-testid="inner-observation-failed"]');
    expect(failed.exists()).toBe(true);
    expect(wrapper.text().toLowerCase()).not.toContain("no inner observation");
    expect(
      wrapper.find('[data-testid="inner-observation-skeleton"]').exists(),
    ).toBe(false);

    // A page reload, not an in-place retry — a failed `import()` stays failed
    // in the module map for the life of the document (see the composable).
    await failed.find("button").trigger("click");
    expect(wrapper.emitted("reload")).toHaveLength(1);
  });
});

describe("InnerObservationPane collapsible sections", () => {
  const sections: InnerObservationSectionView[] = [
    {
      chapterId: "part-01/inner-observation-01",
      title: { en: "Histaklut Pnimit 1", he: "הסתכלות פנימית א׳" },
      items: [
        {
          n: 1,
          sefariaRef: "x 1",
          html: "First passage.<br>Second passage.",
          anchors: [],
        },
      ],
    },
    {
      chapterId: "part-01/inner-observation-02",
      title: { en: "Histaklut Pnimit 2", he: "הסתכלות פנימית ב׳" },
      items: [{ n: 1, sefariaRef: "x 2", html: "Other section.", anchors: [] }],
    },
  ];

  it("opens every section by default — this pane is the part's whole reference text", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections },
    });

    const groups = wrapper.findAll("details");
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect((group.element as HTMLDetailsElement).open).toBe(true);
    }
  });

  it("makes each section title its own summary, so it toggles the section", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections },
    });

    const summaries = wrapper.findAll("summary");
    expect(summaries.map((summary) => summary.text())).toEqual([
      "Histaklut Pnimit 1",
      "Histaklut Pnimit 2",
    ]);
    expect(summaries[0]?.element.parentElement?.tagName).toBe("DETAILS");
  });

  it("splits a section's segment into paragraphs on its own <br>s", async () => {
    const wrapper = await mountSuspended(InnerObservationPane, {
      props: { sections },
    });

    expect(
      wrapper.findAll("p.tes-prose-paragraph").map((p) => p.text()),
    ).toContain("First passage.");
  });
});
