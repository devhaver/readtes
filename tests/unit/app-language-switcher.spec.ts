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

  describe("closing", () => {
    const open = async () => {
      const wrapper = await mountSuspended(AppLanguageSwitcher, {
        attachTo: document.body,
      });
      const details = wrapper.get("details").element as HTMLDetailsElement;
      details.open = true;
      await nextTick();
      return { wrapper, details };
    };

    it("closes on a pointerdown outside the menu", async () => {
      const { wrapper, details } = await open();

      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));

      expect(details.open).toBe(false);
      wrapper.unmount();
    });

    it("stays open for a pointerdown inside the menu", async () => {
      const { wrapper, details } = await open();

      details
        .querySelector("summary")
        ?.dispatchEvent(new Event("pointerdown", { bubbles: true }));

      expect(details.open).toBe(true);
      wrapper.unmount();
    });

    it("closes on Escape and returns focus to the summary", async () => {
      const { wrapper, details } = await open();
      details.querySelector<HTMLElement>("a[href]")?.focus();

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(details.open).toBe(false);
      expect(document.activeElement).toBe(details.querySelector("summary"));
      wrapper.unmount();
    });

    it("moves through the languages with ArrowDown and ArrowUp", async () => {
      const { wrapper, details } = await open();
      const items = Array.from(
        details.querySelectorAll<HTMLElement>("a[href]"),
      );
      details.querySelector<HTMLElement>("summary")?.focus();

      const press = (key: string) =>
        document.dispatchEvent(new KeyboardEvent("keydown", { key }));
      press("ArrowDown");
      expect(document.activeElement).toBe(items[0]);
      press("ArrowDown");
      expect(document.activeElement).toBe(items[1]);
      press("ArrowUp");
      expect(document.activeElement).toBe(items[0]);
      wrapper.unmount();
    });

    it("closes when a trapped overlay opens", async () => {
      const { wrapper, details } = await open();
      const overlays = useOpenOverlayCount();

      overlays.value = 1;
      await nextTick();

      expect(details.open).toBe(false);
      overlays.value = 0;
      wrapper.unmount();
    });
  });
});
