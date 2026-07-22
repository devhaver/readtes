// Integration coverage for `ReadingPreferencesModal`'s open state and the
// font-size/theme controls' wiring to `useReadingPreferences`/
// `useColorMode`. UI-language links are plain `switchLocalePath` `NuxtLink`s
// — covered indirectly by rendering (their `href`s), not by asserting a
// full navigation (out of scope for a unit test).
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { beforeEach, describe, expect, it } from "vitest";
import ReadingPreferencesModal from "~/components/reader/ReadingPreferencesModal.vue";

describe("ReadingPreferencesModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders nothing in the DOM when closed", async () => {
    const wrapper = await mountSuspended(ReadingPreferencesModal, {
      props: { open: false },
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it("shows the font size, theme, and language sections when open", async () => {
    const wrapper = await mountSuspended(ReadingPreferencesModal, {
      props: { open: true },
    });
    await nextTick();

    expect(document.body.textContent).toContain("Text size");
    expect(document.body.textContent).toContain("Theme");
    expect(document.body.textContent).toContain("Language");
    wrapper.unmount();
  });

  it("changes the persisted reading scale when a font-size step is clicked", async () => {
    const wrapper = await mountSuspended(ReadingPreferencesModal, {
      props: { open: true },
    });
    await nextTick();

    const largeButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "Large");
    largeButton?.click();
    await nextTick();

    expect(localStorage.getItem("readtes:reading-scale")).toBe("3");
    wrapper.unmount();
  });

  it("changes the colour-mode preference when a theme option is clicked", async () => {
    const colorMode = useColorMode();
    colorMode.preference = "system";

    const wrapper = await mountSuspended(ReadingPreferencesModal, {
      props: { open: true },
    });
    await nextTick();

    const darkButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent === "Dark");
    darkButton?.click();
    await nextTick();

    expect(colorMode.preference).toBe("dark");
    wrapper.unmount();
  });

  it("emits close on Escape", async () => {
    const wrapper = await mountSuspended(ReadingPreferencesModal, {
      props: { open: true },
    });
    await nextTick();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();
    wrapper.unmount();
  });
});
