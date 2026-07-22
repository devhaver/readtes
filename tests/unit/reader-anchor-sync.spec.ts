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
import type { ReaderState } from "~/composables/useReaderState";
import type { CommentaryItem, SourceSegment } from "~~/shared/types/content";

const PaneContainerStub = defineComponent({
  setup(_, { slots }) {
    const containerRef = provideReaderPaneContainer();
    return () => h("div", { ref: containerRef }, slots.default?.());
  },
});

// Setup returns the shared reader state (rather than only a render
// function) so tests can drive `reactivateAnchor` directly, the same way
// the reader page does after a version switch.
const ReaderTree = defineComponent({
  props: {
    segments: { type: Array as () => SourceSegment[], required: true },
    items: { type: Array as () => CommentaryItem[], required: true },
  },
  setup() {
    return useReaderState();
  },
  render() {
    return h("div", [
      h(PaneContainerStub, null, () =>
        h(SourcePane, { segments: this.segments }),
      ),
      h(PaneContainerStub, null, () =>
        h(CommentaryPane, { items: this.items }),
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

  it("re-fires the highlight/scroll when the same anchor is activated again", async () => {
    const wrapper = await mountSuspended(ReaderTree, {
      props: { segments, items },
    });

    const anchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');

    await anchor.trigger("click");
    await nextTick();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    // Re-clicking the same anchor doesn't change `activeAnchor`/
    // `anchorOrigin`, but should still re-fire the (possibly already-faded)
    // highlight rather than being a no-op.
    await anchor.trigger("click");
    await nextTick();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("re-fires the highlight once a version switch renders the previously-missing item", async () => {
    const wrapper = await mountSuspended(ReaderTree, {
      props: { segments, items: [] },
    });

    const anchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]');
    await anchor.trigger("click");
    await nextTick();

    // The commentary version currently shown has nothing for this anchor
    // (e.g. its English commentary is missing) - nothing to highlight yet.
    expect(wrapper.find("#op-1").exists()).toBe(false);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    // Simulate the "Switch to Hebrew" reconciliation path: the commentary
    // pane now renders an item for the same anchor, and the page calls
    // `reactivateAnchor()` since `activeAnchor`/`anchorOrigin` themselves
    // didn't change.
    await wrapper.setProps({ items });
    (wrapper.vm as unknown as ReaderState).reactivateAnchor();
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

  it("doesn't double-activate when Enter fires both the container keydown and the anchor's native click", async () => {
    const wrapper = await mountSuspended(ReaderTree, {
      props: { segments, items },
    });

    const anchor = wrapper.find('a.tes-anchor[data-anchor="op-1"]')
      .element as HTMLElement;

    // A focused anchor's native Enter activation dispatches both a
    // `keydown` and a synthesized `click`, synchronously, in the same task
    // - dispatch both directly (no `await`/`trigger` in between, which
    // would insert a microtask tick) to reproduce that exactly.
    anchor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await nextTick();

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
