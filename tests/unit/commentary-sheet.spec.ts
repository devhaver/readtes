// Integration coverage for `CommentarySheet`'s open/dismiss state and the
// "Open in Commentary" cross-slide jump. Drag-gesture math itself is
// covered separately (`commentary-sheet-gesture.spec.ts`, pure); the actual
// pointer-event wiring is thin enough over that + `open`/`close` that it
// isn't re-tested here — see the module doc in that component for why, and
// the task report for what still wants a manual pass (real touch/pointer
// drag on a device).
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type PropType } from "vue";
import CommentarySheet from "~/components/reader/CommentarySheet.vue";
import type { CommentaryItem } from "~~/shared/types/content";

const items: CommentaryItem[] = [
  {
    anchorId: "op-1",
    order: 1,
    label: { en: "1", he: "א" },
    sefariaRef: "x 1",
    targetSeif: 3,
    section: "ohr-pnimi",
    html: "First commentary item",
  },
];

// `CommentarySheet` calls `activateAnchor` via `useReaderState()` — this
// host establishes that shared state so the test can observe the effect of
// "Open in Commentary" directly.
const ReaderStateHost = defineComponent({
  props: {
    open: { type: Boolean, required: true },
    seif: { type: Number as PropType<number | null>, default: null },
    items: { type: Array as () => CommentaryItem[], required: true },
  },
  emits: ["close"],
  setup(_, { emit }) {
    const state = useReaderState();
    return { state, emit };
  },
  render() {
    return h(CommentarySheet, {
      open: this.open,
      seif: this.seif,
      items: this.items,
      onClose: () => this.emit("close"),
    });
  },
});

describe("CommentarySheet", () => {
  it("renders nothing when closed", async () => {
    const wrapper = await mountSuspended(ReaderStateHost, {
      props: { open: false, seif: null, items: [] },
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it("lists the given seif's commentary items when open", async () => {
    const wrapper = await mountSuspended(ReaderStateHost, {
      props: { open: true, seif: 3, items },
    });

    expect(document.body.textContent).toContain("First commentary item");
    expect(document.body.textContent).toContain("3");
    wrapper.unmount();
  });

  it("shows an empty state when the seif has no commentary in this edition", async () => {
    const wrapper = await mountSuspended(ReaderStateHost, {
      props: { open: true, seif: 3, items: [] },
    });

    expect(document.body.textContent).toContain(
      "No commentary for this seif in this edition.",
    );
    wrapper.unmount();
  });

  it("emits close on backdrop click", async () => {
    const wrapper = await mountSuspended(ReaderStateHost, {
      props: { open: true, seif: 3, items },
    });

    const backdrop = document.body.querySelector(
      ".fixed.inset-0.bg-black\\/40",
    ) as HTMLElement;
    backdrop.click();
    await nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("emits close on Escape", async () => {
    const wrapper = await mountSuspended(ReaderStateHost, {
      props: { open: true, seif: 3, items },
    });
    await nextTick();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });

  it("'Open in Commentary' activates the item's anchor from source and closes the sheet", async () => {
    Element.prototype.scrollIntoView = vi.fn();

    const wrapper = await mountSuspended(ReaderStateHost, {
      props: { open: true, seif: 3, items },
    });

    const openButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "Open in Commentary");
    openButton?.click();
    await nextTick();

    expect(wrapper.vm.state.activeAnchor.value).toBe("op-1");
    expect(wrapper.vm.state.anchorOrigin.value).toBe("source");
    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });
});
