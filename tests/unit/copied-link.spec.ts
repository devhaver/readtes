// `useCopiedLink` builds the shareable URL from `siteUrl` + the route path +
// the current seif, and exposes a `copied` flag that must reset on its own.
// Pinned: the `#seif-N` hash (matching `SourcePane`'s ids), the bare-chapter
// URL before a seif is measured, the textarea fallback when the async
// clipboard is unavailable, and the 2s reset.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";

// The singleton is provided by the caller, as the reader page does; a
// component cannot inject what it provides itself, so the composable under
// test lives in a child.
const Child = defineComponent({
  setup: () => ({ link: useCopiedLink() }),
  render: () => null,
});

const Host = defineComponent({
  setup: () => ({ seif: useCurrentSeif() }),
  render: () => h(Child, { ref: "child" }),
});

const link = (wrapper: { vm: { $refs: Record<string, unknown> } }) =>
  (wrapper.vm.$refs.child as InstanceType<typeof Child>).link;

describe("useCopiedLink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("builds an absolute chapter URL, with the seif hash once one is known", async () => {
    const wrapper = await mountSuspended(Host);
    const { siteUrl } = useRuntimeConfig().public;
    const path = useRoute().path;

    expect(link(wrapper).url.value).toBe(`${siteUrl}${path}`);

    wrapper.vm.seif.setCurrentSeif(7);
    await nextTick();

    expect(link(wrapper).url.value).toBe(`${siteUrl}${path}#seif-7`);
  });

  it("copies through the clipboard and resets `copied` after 2s", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const wrapper = await mountSuspended(Host);

    await link(wrapper).copy();

    expect(writeText).toHaveBeenCalledWith(link(wrapper).url.value);
    expect(link(wrapper).copied.value).toBe(true);

    vi.advanceTimersByTime(1999);
    expect(link(wrapper).copied.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(link(wrapper).copied.value).toBe(false);
  });

  it("falls back to execCommand when the clipboard rejects", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const exec = vi.fn().mockReturnValue(true);
    document.execCommand = exec;
    const wrapper = await mountSuspended(Host);

    await link(wrapper).copy();

    expect(exec).toHaveBeenCalledWith("copy");
    expect(link(wrapper).copied.value).toBe(true);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("stays unconfirmed when every copy path fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    document.execCommand = vi.fn().mockReturnValue(false);
    const wrapper = await mountSuspended(Host);

    await link(wrapper).copy();

    expect(link(wrapper).copied.value).toBe(false);
  });
});
