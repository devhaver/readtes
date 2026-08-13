// Thin wiring coverage for `MobileSwipePanes` over the tested pure
// `resolveActivePane` (`mobile-pane-sync.spec.ts`): renders the slides
// with their `data-pane` markers, and confirms `activePane` changes drive a
// direct `scrollTo` on the track (not the slide's `scrollIntoView` — see
// the component's `scrollToPane` comment for why) once the narrow-viewport
// media query matches. The reverse direction — a real swipe gesture
// settling on a slide via `IntersectionObserver`/`scrollend` — needs a
// manual pass on an actual device/browser: happy-dom's `IntersectionObserver`
// never fires real ratios from layout, so that half of the sync can only be
// exercised through the pure `resolveActivePane` unit tests, not end-to-end
// here. See the task report for what to check by hand.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import MobileSwipePanes from "~/components/reader/MobileSwipePanes.vue";
import { DEFAULT_SETTLE_MS } from "~/utils/mobilePaneSync";
import type { PaneId } from "~/utils/readerAnchorState";

const stubMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );
};

/**
 * The only fields `onIntersect` reads — `target` (for its `data-pane`) and
 * `intersectionRatio`. Everything else on a real entry is layout the DOM
 * stub cannot produce anyway.
 */
const entryFor = (
  wrapper: { find: (selector: string) => { element: Element } },
  pane: PaneId,
  intersectionRatio: number,
): IntersectionObserverEntry =>
  ({
    target: wrapper.find(`[data-pane="${pane}"]`).element,
    intersectionRatio,
  }) as IntersectionObserverEntry;

const Host = defineComponent({
  props: {
    panes: {
      type: Array as () => PaneId[],
      default: () => ["source", "commentary", "inner-observation"],
    },
  },
  setup(props) {
    const state = useReaderState();
    return { state, props };
  },
  render() {
    return h(
      MobileSwipePanes,
      { panes: this.props.panes },
      {
        source: () => h("div", { id: "source-content" }, "Source"),
        commentary: () => h("div", { id: "commentary-content" }, "Commentary"),
        "inner-observation": () =>
          h("div", { id: "inner-observation-content" }, "Observation"),
      },
    );
  },
});

describe("MobileSwipePanes", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    Element.prototype.scrollTo = vi.fn();
  });

  it("renders all three slides with their data-pane marker, always mounted", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host);

    expect(wrapper.find('[data-pane="source"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="commentary"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="inner-observation"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Source");
    expect(wrapper.text()).toContain("Commentary");
    expect(wrapper.text()).toContain("Observation");
  });

  it("renders only two slides when the part has no Inner Observation", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host, {
      props: { panes: ["source", "commentary"] satisfies PaneId[] },
    });

    expect(wrapper.find('[data-pane="source"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="commentary"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="inner-observation"]').exists()).toBe(
      false,
    );
  });

  it("renders no commentary slide when the chapter has no commentary edition", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host, {
      props: { panes: ["source", "inner-observation"] satisfies PaneId[] },
    });

    expect(wrapper.find('[data-pane="source"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="commentary"]').exists()).toBe(false);
    expect(wrapper.find('[data-pane="inner-observation"]').exists()).toBe(true);
  });

  it("snaps a stale activePane back to source when its pane is absent", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host, {
      props: { panes: ["source"] satisfies PaneId[] },
    });

    // The shared reader state persists across chapter navigations — this
    // simulates arriving from a chapter where Inner Light existed and was
    // active. The guard watch is on `paneOrder`, so drive it via props.
    wrapper.vm.state.setActivePane("source");
    await wrapper.setProps({
      panes: ["source", "commentary"] satisfies PaneId[],
    });
    wrapper.vm.state.setActivePane("commentary");
    await wrapper.setProps({ panes: ["source"] satisfies PaneId[] });

    expect(wrapper.vm.state.activePane.value).toBe("source");
  });

  it("scrolls the track to the matching slide when activePane changes on a narrow viewport", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.state.setActivePane("commentary");
    await nextTick();

    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it("lets a pill tap win over a settle commit still armed from the swipe it interrupted", async () => {
    // The one piece of the swipe->settle direction that can be driven
    // without real layout: the observer callback is captured and fed
    // hand-written ratios, so the commit debounce runs for real against a
    // known pre-tap visibility state. Reproduces the intermittent e2e
    // failure in issue 106 — without the `settleTimer.cancel()` in the
    // `activePane` watcher this ends on "inner-observation".
    stubMatchMedia(true);
    vi.useFakeTimers();
    let notify: IntersectionObserverCallback | undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );

    try {
      const wrapper = await mountSuspended(Host);
      await nextTick();

      // A swipe has just carried the track to the last slide: the observer
      // reports it fully visible, which arms a commit ~100ms out.
      notify?.(
        [
          entryFor(wrapper, "source", 0),
          entryFor(wrapper, "inner-observation", 1),
        ],
        {} as IntersectionObserver,
      );
      vi.advanceTimersByTime(DEFAULT_SETTLE_MS - 10);

      // The reader taps "Inner Light" with 10ms left on that countdown.
      wrapper.vm.state.setActivePane("commentary");
      await nextTick();

      // The stale deadline passes before the observer's post-scroll batch
      // arrives — the window in which the interrupted commit used to fire
      // and drag the track back to the slide the finger left behind.
      vi.advanceTimersByTime(10);
      await nextTick();
      expect(wrapper.vm.state.activePane.value).toBe("commentary");

      // The post-tap batch then confirms the same pane, one frame later.
      notify?.(
        [entryFor(wrapper, "commentary", 1), entryFor(wrapper, "source", 0)],
        {} as IntersectionObserver,
      );
      vi.advanceTimersByTime(DEFAULT_SETTLE_MS);
      await nextTick();

      expect(wrapper.vm.state.activePane.value).toBe("commentary");
    } finally {
      vi.useRealTimers();
    }
  });

  it("never auto-scrolls on a wide (desktop grid) viewport", async () => {
    stubMatchMedia(false);
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.state.setActivePane("commentary");
    await nextTick();

    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
  });
});
