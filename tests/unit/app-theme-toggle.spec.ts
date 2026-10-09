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

  it("cycles light -> sepia -> dark -> light and renames itself each step", async () => {
    const colorMode = useColorMode();
    colorMode.preference = "light";
    await nextTick();

    const wrapper = await mountSuspended(AppThemeToggle);
    const labels = [wrapper.get("button").attributes("aria-label")];

    for (const expected of ["sepia", "dark", "light"]) {
      await wrapper.get("button").trigger("click");
      expect(colorMode.preference).toBe(expected);
      labels.push(wrapper.get("button").attributes("aria-label"));
    }

    // Back where it started after a full lap.
    expect(colorMode.preference).toBe("light");
    // Each of the three states announces a different destination, so a
    // screen-reader user can tell where the next press goes.
    expect(new Set(labels.slice(0, 3)).size).toBe(3);
  });

  it("enters the cycle from the resolved value when the preference is 'system'", async () => {
    const colorMode = useColorMode();
    colorMode.preference = "system";
    await nextTick();

    const wrapper = await mountSuspended(AppThemeToggle);
    await wrapper.get("button").trigger("click");

    // "system" isn't a cycle member; it must land on a real theme rather
    // than staying put or throwing.
    expect(["light", "sepia", "dark"]).toContain(colorMode.preference);
    expect(colorMode.preference).not.toBe("system");
  });

  it("renders all three theme icons, leaving the choice to CSS on <html>", async () => {
    // Prerendered HTML cannot know the visitor's theme; picking the icon in
    // the template left returning dark/sepia visitors looking at the sun.
    const wrapper = await mountSuspended(AppThemeToggle);

    expect(wrapper.findAll(".tes-theme-icon")).toHaveLength(3);
    expect(wrapper.find(".tes-icon-theme-light").exists()).toBe(true);
    expect(wrapper.find(".tes-icon-theme-sepia").exists()).toBe(true);
    expect(wrapper.find(".tes-icon-theme-dark").exists()).toBe(true);
  });

  it("names both the current theme and the next one in its label", async () => {
    const colorMode = useColorMode();
    colorMode.preference = "sepia";
    await nextTick();

    const wrapper = await mountSuspended(AppThemeToggle);
    await nextTick();

    expect(wrapper.get("button").attributes("aria-label")).toBe(
      "Theme: Sepia. Switch to Dark.",
    );
  });
});
