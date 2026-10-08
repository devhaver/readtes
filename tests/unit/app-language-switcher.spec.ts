import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import AppLanguageSwitcher from "~/components/app/AppLanguageSwitcher.vue";

describe("AppLanguageSwitcher", () => {
  it("renders one link per configured locale", async () => {
    const wrapper = await mountSuspended(AppLanguageSwitcher);
    const links = wrapper.findAll("a");

    expect(links.map((link) => link.text())).toEqual([
      "English",
      "עברית",
      "Русский",
      "Español",
      "Français",
      "Deutsch",
      "Português",
      "Türkçe",
      "Українська",
    ]);
  });

  it("is a disclosure menu labelled with the current language", async () => {
    const wrapper = await mountSuspended(AppLanguageSwitcher);
    expect(wrapper.find("details > summary").text()).toContain("English");
  });

  it("marks the active locale with aria-current and links to the other locale's path", async () => {
    const wrapper = await mountSuspended(AppLanguageSwitcher);
    const links = wrapper.findAll("a");

    const english = links.find((link) => link.text() === "English");
    const hebrew = links.find((link) => link.text() === "עברית");

    expect(english?.attributes("aria-current")).toBe("true");
    expect(hebrew?.attributes("aria-current")).toBeUndefined();
    expect(hebrew?.attributes("href")).toMatch(/\/he(\/|$)/);
  });
});
