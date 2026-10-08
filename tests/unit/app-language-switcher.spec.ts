import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import AppLanguageSwitcher from "~/components/app/AppLanguageSwitcher.vue";

describe("AppLanguageSwitcher", () => {
  it("renders one link per configured locale", async () => {
    const wrapper = await mountSuspended(AppLanguageSwitcher);
    const links = wrapper.findAll("a");

    expect(links).toHaveLength(3);

    // Each link carries a short code for phones and the full name.
    const labels = links.map((link) => link.text());
    expect(labels.some((label) => label.includes("English"))).toBe(true);
    expect(labels.some((label) => label.includes("עברית"))).toBe(true);
    expect(labels.some((label) => label.includes("Русский"))).toBe(true);
  });

  it("marks the active locale with aria-current and links to the other locale's path", async () => {
    const wrapper = await mountSuspended(AppLanguageSwitcher);
    const links = wrapper.findAll("a");

    const english = links.find((link) => link.text().includes("English"));
    const hebrew = links.find((link) => link.text().includes("עברית"));

    expect(english?.attributes("aria-current")).toBe("true");
    expect(hebrew?.attributes("aria-current")).toBeUndefined();
    expect(hebrew?.attributes("href")).toMatch(/\/he(\/|$)/);
  });
});
