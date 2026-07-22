import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import AppThemeToggle from "~/components/app/AppThemeToggle.vue";

describe("AppThemeToggle", () => {
  it("renders a button with an accessible name describing the toggle action", async () => {
    const wrapper = await mountSuspended(AppThemeToggle);
    const button = wrapper.get("button");

    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-label")).toBeTruthy();
  });

  it("toggles the color mode preference and flips the accessible name on click", async () => {
    const colorMode = useColorMode();
    colorMode.preference = "light";
    await nextTick();

    const wrapper = await mountSuspended(AppThemeToggle);
    const initialLabel = wrapper.get("button").attributes("aria-label");

    await wrapper.get("button").trigger("click");

    expect(colorMode.preference).toBe("dark");
    expect(wrapper.get("button").attributes("aria-label")).not.toBe(
      initialLabel,
    );

    await wrapper.get("button").trigger("click");

    expect(colorMode.preference).toBe("light");
  });
});
