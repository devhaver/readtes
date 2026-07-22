// Thin wiring coverage for `MobileSwipePanes` over the tested pure
// `resolveActivePane` (`mobile-pane-sync.spec.ts`): renders the three slides
// with their `data-pane` markers, and confirms `activePane` changes drive a
// `scrollIntoView` call on the matching slide once the narrow-viewport
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

const Host = defineComponent({
  setup() {
    const state = useReaderState();
    return { state };
  },
  render() {
    return h(MobileSwipePanes, null, {
      summary: () => h("div", { id: "summary-content" }, "Summary"),
      source: () => h("div", { id: "source-content" }, "Source"),
      commentary: () => h("div", { id: "commentary-content" }, "Commentary"),
    });
  },
});

describe("MobileSwipePanes", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders all three slides with their data-pane marker, always mounted", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host);

    expect(wrapper.find('[data-pane="summary"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="source"]').exists()).toBe(true);
    expect(wrapper.find('[data-pane="commentary"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Summary");
    expect(wrapper.text()).toContain("Source");
    expect(wrapper.text()).toContain("Commentary");
  });

  it("scrolls the matching slide into view when activePane changes on a narrow viewport", async () => {
    stubMatchMedia(true);
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.state.setActivePane("commentary");
    await nextTick();

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("never auto-scrolls on a wide (desktop grid) viewport", async () => {
    stubMatchMedia(false);
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.state.setActivePane("commentary");
    await nextTick();

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
