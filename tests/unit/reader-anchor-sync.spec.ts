// Integration coverage for the reader's two-way anchor sync: a small tree
// composing the real `ReaderShell` (provides `useReaderState`), two
// `ReaderPane`-style containers (via `provideReaderPaneContainer`), and the
// real `SourcePane`/`CommentaryPane` — the shape production actually uses,
// minus `ReaderToolbar`/the version-select chrome, which aren't relevant
// here. Covers the acceptance scenario directly: clicking a source anchor
// highlights + scrolls the matching commentary item, and vice versa.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import CommentaryPane from "~/components/reader/CommentaryPane.vue";
import SourcePane from "~/components/reader/SourcePane.vue";
import type { CommentaryItem, SourceSegment } from "~~/shared/types/content";

const PaneContainerStub = defineComponent({
  setup(_, { slots }) {
    const containerRef = provideReaderPaneContainer();
    return () => h("div", { ref: containerRef }, slots.default?.());
  },
});

const ReaderTree = defineComponent({
  props: {
    segments: { type: Array as () => SourceSegment[], required: true },
    items: { type: Array as () => CommentaryItem[], required: true },
  },
  setup(props) {
    useReaderState();
    return () =>
      h("div", [
        h(PaneContainerStub, null, () =>
          h(SourcePane, { segments: props.segments }),
        ),
        h(PaneContainerStub, null, () =>
          h(CommentaryPane, { items: props.items }),
        ),
      ]);
  },
});

const segments: SourceSegment[] = [
  {
    n: 1,
    sefariaRef: "x 1",
    html: 'Text with <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a> an anchor.',
    anchors: ["op-1"],
  },
];

const items: CommentaryItem[] = [
  {
    anchorId: "op-1",
    order: 1,
    label: { en: "1", he: "א" },
    sefariaRef: "y 1",
    targetSeif: 1,
    section: "ohr-pnimi",
    html: "Inner Light on the first anchor.",
  },
];

describe("reader anchor sync", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("highlights and scrolls the commentary item when its source anchor is clicked", async () => {
    const wrapper = await mountSuspended(ReaderTree, {
      props: { segments, items },
    });

    const anchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');
    expect(anchor.exists()).toBe(true);

    await anchor.trigger("click");
    await nextTick();

    const commentaryTarget = wrapper.find("#op-1");
    expect(commentaryTarget.exists()).toBe(true);
    expect(
      (commentaryTarget.element as HTMLElement).classList.contains(
        "is-highlighted",
      ),
    ).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("highlights the source seif's anchor chip when the commentary item is clicked", async () => {
    const wrapper = await mountSuspended(ReaderTree, {
      props: { segments, items },
    });

    const chip = wrapper.find("#op-1 button.tes-anchor");
    expect(chip.exists()).toBe(true);

    await chip.trigger("click");
    await nextTick();

    const sourceAnchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');
    expect(sourceAnchor.exists()).toBe(true);
    expect(
      (sourceAnchor.element as HTMLElement).classList.contains(
        "is-highlighted",
      ),
    ).toBe(true);
  });
});
