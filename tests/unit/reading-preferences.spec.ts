// `useReadingPreferences`'s hydration-safe persistence, mirroring
// `reader-mode.spec.ts`'s pattern for `useReaderMode`: the very first render
// (SSR, and the client's pre-mount render) must always resolve to
// `DEFAULT_READING_SCALE`, regardless of what's in `localStorage` — only
// after mount does the persisted value reconcile in.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick } from "vue";

const Host = defineComponent({
  setup() {
    const prefs = useReadingPreferences();
    // Captured synchronously in `setup` — this is what SSR (and the
    // client's pre-mount render) would have resolved to.
    const preMountScale = prefs.scale.value;
    return { prefs, preMountScale };
  },
  render: () => null,
});

describe("useReadingPreferences (hydration)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("resolves to the default scale before mount, even with a persisted override", async () => {
    localStorage.setItem("readtes:reading-scale", "4");

    const wrapper = await mountSuspended(Host);
    expect(wrapper.vm.preMountScale).toBe(DEFAULT_READING_SCALE);

    await nextTick();
    expect(wrapper.vm.prefs.scale.value).toBe(4);
  });

  it("resolves to the default scale after mount when nothing is persisted", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.prefs.scale.value).toBe(DEFAULT_READING_SCALE);
  });

  it("persists an explicit setScale call across a fresh mount", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.prefs.setScale(1);
    await nextTick();
    expect(wrapper.vm.prefs.scale.value).toBe(1);

    const returning = await mountSuspended(Host);
    expect(returning.vm.preMountScale).toBe(DEFAULT_READING_SCALE);

    await nextTick();
    expect(returning.vm.prefs.scale.value).toBe(1);
  });
});
