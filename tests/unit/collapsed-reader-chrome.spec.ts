// `useCollapsedReaderChrome` is a persisted preference, and the two things
// worth pinning are the ones that break silently: that it survives a visit
// (the whole reason it is a preference and not component state), and that it
// does NOT consult storage during the first render (prerendering has no
// `localStorage`, so a returning visitor's hydration would diverge from the
// prerendered HTML — the same trap `useReadingPreferences` documents).
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick } from "vue";

const STORAGE_KEY = "readtes:reader-chrome-collapsed";

const Host = defineComponent({
  setup: () => ({ chrome: useCollapsedReaderChrome() }),
  render: () => null,
});

describe("useCollapsedReaderChrome", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts expanded", async () => {
    const wrapper = await mountSuspended(Host);

    expect(wrapper.vm.chrome.collapsed.value).toBe(false);
  });

  it("toggles, and writes the choice to storage", async () => {
    const wrapper = await mountSuspended(Host);

    wrapper.vm.chrome.toggle();
    await nextTick();

    expect(wrapper.vm.chrome.collapsed.value).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");

    wrapper.vm.chrome.toggle();
    await nextTick();

    expect(wrapper.vm.chrome.collapsed.value).toBe(false);
  });

  it("restores a returning visitor's choice", async () => {
    localStorage.setItem(STORAGE_KEY, "true");

    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.chrome.collapsed.value).toBe(true);
  });
});
