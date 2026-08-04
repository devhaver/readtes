import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import MobilePanePill from "~/components/reader/MobilePanePill.vue";
import type { PaneId } from "~/utils/readerAnchorState";

// `useCommentarySheet().open()` only opens on a narrow viewport (see that
// composable) — stub `matchMedia` to report one, the same pattern
// `reader-mode.spec.ts` uses for `useReaderMode`'s own viewport check.
const stubNarrowViewport = () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
};

// `MobilePanePill` injects `useReaderState()` and `useCommentarySheet()` —
// this host establishes both (the same provide/inject singletons the
// reader page normally provides) so the test can drive them directly.
const Host = defineComponent({
  props: {
    panes: {
      type: Array as () => PaneId[],
      default: () => ["source", "commentary", "inner-observation"],
    },
  },
  setup(props) {
    const state = useReaderState();
    const sheet = useCommentarySheet();
    return { state, sheet, props };
  },
  render() {
    return h(MobilePanePill, { panes: this.props.panes });
  },
});

describe("MobilePanePill", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a tablist with three tabs, labelled Ari/Inner Light/Inner Observation", async () => {
    const wrapper = await mountSuspended(Host);

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text())).toEqual([
      "The Ari's Text",
      "Inner Light",
      "Inner Observation",
    ]);
  });

  it("drops the Inner Observation tab when the part has none", async () => {
    const wrapper = await mountSuspended(Host, {
      props: { panes: ["source", "commentary"] satisfies PaneId[] },
    });

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text())).toEqual([
      "The Ari's Text",
      "Inner Light",
    ]);
  });

  it("drops the Inner Light tab when the chapter has no commentary edition", async () => {
    const wrapper = await mountSuspended(Host, {
      props: { panes: ["source", "inner-observation"] satisfies PaneId[] },
    });

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.text())).toEqual([
      "The Ari's Text",
      "Inner Observation",
    ]);
  });

  it("does not render at all for a single-pane chapter — nothing to switch between", async () => {
    const wrapper = await mountSuspended(Host, {
      props: { panes: ["source"] satisfies PaneId[] },
    });

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
  });

  it("reflects the shared activePane via aria-selected, defaulting to source", async () => {
    const wrapper = await mountSuspended(Host);

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0]?.attributes("aria-selected")).toBe("true");
    expect(tabs[1]?.attributes("aria-selected")).toBe("false");
    expect(tabs[2]?.attributes("aria-selected")).toBe("false");
  });

  it("uses roving tabindex — only the selected tab is in the tab order", async () => {
    const wrapper = await mountSuspended(Host);

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0]?.attributes("tabindex")).toBe("0");
    expect(tabs[1]?.attributes("tabindex")).toBe("-1");
    expect(tabs[2]?.attributes("tabindex")).toBe("-1");
  });

  it("points aria-controls at each swipe slide's own id", async () => {
    const wrapper = await mountSuspended(Host);

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0]?.attributes("aria-controls")).toBe("reader-source-pane");
    expect(tabs[1]?.attributes("aria-controls")).toBe("reader-commentary-pane");
    expect(tabs[2]?.attributes("aria-controls")).toBe(
      "reader-inner-observation-pane",
    );
  });

  it("sets activePane on tab click", async () => {
    const wrapper = await mountSuspended(Host);

    const commentaryTab = wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text() === "Inner Light");
    await commentaryTab?.trigger("click");

    expect(wrapper.vm.state.activePane.value).toBe("commentary");
  });

  it("moves to the next/previous tab on ArrowRight/ArrowLeft, with wraparound", async () => {
    const wrapper = await mountSuspended(Host);

    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[0]?.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.vm.state.activePane.value).toBe("commentary");

    await wrapper.findAll('[role="tab"]')[1]?.trigger("keydown", {
      key: "ArrowRight",
    });
    expect(wrapper.vm.state.activePane.value).toBe("inner-observation");

    await wrapper.findAll('[role="tab"]')[2]?.trigger("keydown", {
      key: "ArrowLeft",
    });
    expect(wrapper.vm.state.activePane.value).toBe("commentary");
  });

  it("jumps to the first/last tab on Home/End", async () => {
    const wrapper = await mountSuspended(Host);

    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[0]?.trigger("keydown", { key: "End" });
    expect(wrapper.vm.state.activePane.value).toBe("inner-observation");

    await wrapper.findAll('[role="tab"]')[2]?.trigger("keydown", {
      key: "Home",
    });
    expect(wrapper.vm.state.activePane.value).toBe("source");
  });

  it("hides itself while the commentary sheet is open", async () => {
    stubNarrowViewport();
    const wrapper = await mountSuspended(Host);
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);

    wrapper.vm.sheet.open(1);
    await nextTick();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);

    wrapper.vm.sheet.close();
    await nextTick();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true);
  });
});
