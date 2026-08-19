// The third pane became collapsible and tabbed (Inner Observation /
// Questions / Answers). Three things here break silently if they regress:
// the persisted state must survive a visit without being consulted during
// the first render (prerendering has no `localStorage` — the hydration trap
// `useCollapsedReaderChrome` documents); a persisted tab a given part does
// not offer must fall through WITHOUT being overwritten; and the tablist
// must only ever offer tabs the part actually has.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick } from "vue";
import ThirdPaneTabs from "~/components/reader/ThirdPaneTabs.vue";
import {
  resolveThirdPaneTab,
  type ThirdPaneTab,
} from "~/composables/useReaderThirdPane";

const OPEN_STORAGE_KEY = "readtes:reader-third-pane-open";
const TAB_STORAGE_KEY = "readtes:reader-third-pane-tab";

const Host = defineComponent({
  setup: () => ({ pane: useReaderThirdPane() }),
  render: () => null,
});

describe("useReaderThirdPane", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Open by default: the pane is what the reader had before it became
  // collapsible, and nobody should have to discover a control to find
  // Inner Observation where it has always been.
  it("starts open, on the first tab", async () => {
    const wrapper = await mountSuspended(Host);

    expect(wrapper.vm.pane.open.value).toBe(true);
    expect(wrapper.vm.pane.tab.value).toBe("inner-observation");
  });

  it("toggles, and writes the choice to storage", async () => {
    const wrapper = await mountSuspended(Host);

    wrapper.vm.pane.toggle();
    await nextTick();

    expect(wrapper.vm.pane.open.value).toBe(false);
    expect(localStorage.getItem(OPEN_STORAGE_KEY)).toBe("false");
  });

  it("restores a closed pane and a chosen tab on a later visit", async () => {
    localStorage.setItem(OPEN_STORAGE_KEY, "false");
    localStorage.setItem(TAB_STORAGE_KEY, "answers");

    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.pane.open.value).toBe(false);
    expect(wrapper.vm.pane.tab.value).toBe("answers");
  });

  // A hand-edited or stale value must not put the pane in a state no tab
  // matches — it would render a tablist with nothing selected.
  it("falls back to the first tab for an unrecognised stored value", async () => {
    localStorage.setItem(TAB_STORAGE_KEY, "not-a-tab");

    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.pane.tab.value).toBe("inner-observation");
  });
});

describe("resolveThirdPaneTab", () => {
  it("keeps the reader's tab when the part offers it", () => {
    expect(
      resolveThirdPaneTab("answers", [
        "inner-observation",
        "questions",
        "answers",
      ]),
    ).toBe("answers");
  });

  // The five parts with no Inner Observation. The preference is NOT
  // rewritten — the reader gets it back on the next part that has one.
  it("falls through to the first available tab when the part lacks it", () => {
    expect(
      resolveThirdPaneTab("inner-observation", ["questions", "answers"]),
    ).toBe("questions");
  });

  it("resolves to nothing when the part offers no tab at all", () => {
    expect(resolveThirdPaneTab("questions", [])).toBeNull();
  });
});

describe("ThirdPaneTabs", () => {
  const mountTabs = (tabs: ThirdPaneTab[], active: ThirdPaneTab) =>
    mountSuspended(ThirdPaneTabs, { props: { tabs, active } });

  it("renders one tab per available layer, and marks the active one", async () => {
    const wrapper = await mountTabs(
      ["inner-observation", "questions", "answers"],
      "questions",
    );

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(tabs[1]!.attributes("aria-selected")).toBe("true");
    expect(tabs[0]!.attributes("aria-selected")).toBe("false");
  });

  // A part with no Inner Observation gets a two-tab pane, never a tab that
  // opens onto an explanation — that explanation stays in the Source pane's
  // footnote, where it already was.
  it("offers only the tabs it was given", async () => {
    const wrapper = await mountTabs(["questions", "answers"], "questions");

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2);
    expect(
      wrapper.findAll('[role="tab"]').map((tab) => tab.text()),
    ).not.toContain("Inner Observation");
    // ...and the heading must not name a tab this part does not have.
    expect(wrapper.get("h2").text()).toBe("Questions and Answers");
  });

  it("emits the tab a click selects", async () => {
    const wrapper = await mountTabs(
      ["inner-observation", "questions"],
      "inner-observation",
    );

    await wrapper.findAll('[role="tab"]')[1]!.trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["questions"]);
  });

  // Roving tabindex: only the active tab is in the tab order, so Tab moves
  // past the whole tablist rather than through each of its buttons.
  it("keeps only the active tab reachable by Tab", async () => {
    const wrapper = await mountTabs(
      ["inner-observation", "questions", "answers"],
      "answers",
    );

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((tab) => tab.attributes("tabindex"))).toEqual([
      "-1",
      "-1",
      "0",
    ]);
  });

  it("moves to the next tab on ArrowRight, and wraps at the end", async () => {
    const wrapper = await mountTabs(
      ["inner-observation", "questions", "answers"],
      "answers",
    );

    await wrapper
      .findAll('[role="tab"]')[2]!
      .trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.emitted("select")?.[0]).toEqual(["inner-observation"]);
  });

  it("moves to the previous tab on ArrowLeft", async () => {
    const wrapper = await mountTabs(
      ["inner-observation", "questions", "answers"],
      "questions",
    );

    await wrapper
      .findAll('[role="tab"]')[1]!
      .trigger("keydown", { key: "ArrowLeft" });

    expect(wrapper.emitted("select")?.[0]).toEqual(["inner-observation"]);
  });
});
