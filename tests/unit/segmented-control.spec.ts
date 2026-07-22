import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import SegmentedControl from "~/components/ui/SegmentedControl.vue";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

describe("SegmentedControl", () => {
  it("renders a button per option, in order", async () => {
    const wrapper = await mountSuspended(SegmentedControl, {
      props: { modelValue: "a", options, ariaLabel: "Pick one" },
    });

    expect(wrapper.findAll("button").map((b) => b.text())).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ]);
  });

  it("marks only the current value's button as pressed", async () => {
    const wrapper = await mountSuspended(SegmentedControl, {
      props: { modelValue: "b", options, ariaLabel: "Pick one" },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons[0]?.attributes("aria-pressed")).toBe("false");
    expect(buttons[1]?.attributes("aria-pressed")).toBe("true");
    expect(buttons[2]?.attributes("aria-pressed")).toBe("false");
  });

  it("emits update:modelValue with the clicked option's value", async () => {
    const wrapper = await mountSuspended(SegmentedControl, {
      props: { modelValue: "a", options, ariaLabel: "Pick one" },
    });

    await wrapper.findAll("button")[2]?.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["c"]]);
  });

  it("labels the group with the given aria-label", async () => {
    const wrapper = await mountSuspended(SegmentedControl, {
      props: { modelValue: "a", options, ariaLabel: "Pick one" },
    });

    expect(wrapper.find('[role="group"]').attributes("aria-label")).toBe(
      "Pick one",
    );
  });
});
