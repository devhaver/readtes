import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";

describe("resolveReaderMode", () => {
  it("always resolves to the fixed premount mode before hydration, regardless of viewport", () => {
    expect(
      resolveReaderMode({
        hydrated: false,
        override: null,
        prefersStudyViewport: true,
      }),
    ).toBe(FIXED_PREMOUNT_MODE);

    expect(
      resolveReaderMode({
        hydrated: false,
        override: "study",
        prefersStudyViewport: true,
      }),
    ).toBe(FIXED_PREMOUNT_MODE);
  });

  it("resolves to study on a narrow viewport once hydrated, with no override", () => {
    expect(
      resolveReaderMode({
        hydrated: true,
        override: null,
        prefersStudyViewport: true,
      }),
    ).toBe("study");
  });

  it("resolves to panes on a wide viewport once hydrated, with no override", () => {
    expect(
      resolveReaderMode({
        hydrated: true,
        override: null,
        prefersStudyViewport: false,
      }),
    ).toBe("panes");
  });

  it("lets a persisted override win over the viewport default once hydrated", () => {
    expect(
      resolveReaderMode({
        hydrated: true,
        override: "panes",
        prefersStudyViewport: true,
      }),
    ).toBe("panes");

    expect(
      resolveReaderMode({
        hydrated: true,
        override: "study",
        prefersStudyViewport: false,
      }),
    ).toBe("study");
  });
});

describe("useReaderMode (hydration)", () => {
  const stubMatchMedia = (matches: boolean) => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => listeners.add(listener),
        removeEventListener: (
          _type: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => listeners.delete(listener),
      })),
    );
  };

  const Host = defineComponent({
    setup() {
      const readerMode = useReaderMode();
      // Captured synchronously in `setup` — this is what SSR (and the
      // client's pre-mount render) would have resolved to.
      const preMountMode = readerMode.mode.value;
      return { readerMode, preMountMode };
    },
    render: () => null,
  });

  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("resolves to the fixed premount mode before mount, then the narrow-viewport default after", async () => {
    stubMatchMedia(true);

    const wrapper = await mountSuspended(Host);

    expect(wrapper.vm.preMountMode).toBe(FIXED_PREMOUNT_MODE);

    await nextTick();

    expect(wrapper.vm.readerMode.mode.value).toBe("study");
  });

  it("resolves to panes after mount on a wide viewport", async () => {
    stubMatchMedia(false);

    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerMode.mode.value).toBe("panes");
  });

  it("reconciles a persisted override in after mount, winning over the viewport default", async () => {
    stubMatchMedia(true);

    // Establish the persisted override the same way the composable itself
    // writes it (via `setMode`), rather than assuming a storage encoding.
    const setup = await mountSuspended(Host);
    await nextTick();
    setup.vm.readerMode.setMode("panes");
    await nextTick();

    // A fresh mount (a "new page load") still starts from the fixed default...
    const wrapper = await mountSuspended(Host);
    expect(wrapper.vm.preMountMode).toBe(FIXED_PREMOUNT_MODE);

    // ...then reconciles to the persisted override once hydrated, even
    // though the viewport default here would be "study".
    await nextTick();
    expect(wrapper.vm.readerMode.mode.value).toBe("panes");
  });

  it("persists an explicit setMode call across a fresh mount", async () => {
    stubMatchMedia(true);

    const wrapper = await mountSuspended(Host);
    await nextTick();
    expect(wrapper.vm.readerMode.mode.value).toBe("study");

    wrapper.vm.readerMode.setMode("panes");
    await nextTick();
    expect(wrapper.vm.readerMode.mode.value).toBe("panes");

    const returning = await mountSuspended(Host);
    await nextTick();
    expect(returning.vm.readerMode.mode.value).toBe("panes");
  });
});
