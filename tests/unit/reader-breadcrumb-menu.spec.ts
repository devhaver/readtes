import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ReaderBreadcrumbMenu from "~/components/reader/ReaderBreadcrumbMenu.vue";

const items = [
  {
    key: "volume-01",
    label: "Volume 1",
    to: "/volumes/volume-1",
    current: false,
  },
  {
    key: "volume-02",
    label: "Volume 2",
    to: "/volumes/volume-2",
    current: true,
  },
  { key: "volume-03", label: "Volume 3", to: null, current: false },
];

describe("ReaderBreadcrumbMenu", () => {
  it("renders closed by default, with the trigger label visible and no menu items", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumbMenu, {
      props: { triggerLabel: "Six volumes", items },
    });

    expect(wrapper.text()).toContain("Six volumes");
    expect(wrapper.find("[aria-expanded]").attributes("aria-expanded")).toBe(
      "false",
    );
    expect(wrapper.findAll("a")).toHaveLength(0);
  });

  it("opens on trigger click, listing every item and marking the current one", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumbMenu, {
      props: { triggerLabel: "Six volumes", items },
    });

    await wrapper.find("button").trigger("click");

    expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");
    const links = wrapper.findAll("a");
    expect(links).toHaveLength(2); // the disabled third item renders no link
    expect(wrapper.text()).toContain("Volume 3");

    const current = links.find((link) => link.text() === "Volume 2");
    expect(current?.attributes("aria-current")).toBe("true");
    const notCurrent = links.find((link) => link.text() === "Volume 1");
    expect(notCurrent?.attributes("aria-current")).toBeUndefined();
  });

  it("links point at the given hrefs", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumbMenu, {
      props: { triggerLabel: "Six volumes", items },
    });

    await wrapper.find("button").trigger("click");

    const hrefs = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(hrefs).toContain("/volumes/volume-1");
    expect(hrefs).toContain("/volumes/volume-2");
  });

  it("renders a footer link, when given one, after the regular items", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumbMenu, {
      props: {
        triggerLabel: "Volume 1",
        items,
        footerItem: { label: "Browse all chapters", to: "/volumes/volume-1" },
      },
    });

    await wrapper.find("button").trigger("click");

    expect(wrapper.text()).toContain("Browse all chapters");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const wrapper = await mountSuspended(ReaderBreadcrumbMenu, {
      props: { triggerLabel: "Six volumes", items },
      attachTo: document.body,
    });

    await wrapper.find("button").trigger("click");
    expect(wrapper.find("button").attributes("aria-expanded")).toBe("true");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.find("button").attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(wrapper.find("button").element);

    wrapper.unmount();
  });
});
