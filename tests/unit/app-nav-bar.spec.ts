import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import AppNavBar from "~/components/app/AppNavBar.vue";

const mount = () => mountSuspended(AppNavBar, { attachTo: document.body });

describe("AppNavBar", () => {
  it("links About from the desktop nav", async () => {
    const wrapper = await mount();
    const hrefs = wrapper
      .get('nav[aria-label="Primary"]')
      .findAll("a")
      .map((link) => link.attributes("href"));

    expect(hrefs).toContain("/about");
    wrapper.unmount();
  });

  it("opens the mobile menu as a nav landmark with About in it", async () => {
    const wrapper = await mount();
    await wrapper.get("button[aria-controls='mobile-nav']").trigger("click");

    const nav = wrapper.get("nav#mobile-nav");
    expect(nav.attributes("aria-label")).toBe("Primary");
    expect(nav.findAll("a").map((link) => link.attributes("href"))).toContain(
      "/about",
    );
    wrapper.unmount();
  });

  it("closes the mobile menu on Escape and on an outside tap", async () => {
    const wrapper = await mount();
    const button = wrapper.get("button[aria-controls='mobile-nav']");

    await button.trigger("click");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();
    expect(wrapper.find("#mobile-nav").exists()).toBe(false);

    await button.trigger("click");
    expect(wrapper.find("#mobile-nav").exists()).toBe(true);
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await nextTick();
    expect(wrapper.find("#mobile-nav").exists()).toBe(false);
    wrapper.unmount();
  });

  it("closes the mobile menu when the language menu opens, and vice versa", async () => {
    const wrapper = await mount();
    const activeMenu = useActiveNavMenu();

    await wrapper.get("button[aria-controls='mobile-nav']").trigger("click");
    expect(activeMenu.value).toBe("mobile");

    activeMenu.value = "language";
    await nextTick();
    expect(wrapper.find("#mobile-nav").exists()).toBe(false);
    activeMenu.value = null;
    wrapper.unmount();
  });
});
