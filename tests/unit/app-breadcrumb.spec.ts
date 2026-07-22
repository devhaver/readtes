import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import AppBreadcrumb from "~/components/app/AppBreadcrumb.vue";

describe("AppBreadcrumb", () => {
  it("renders a link for every item except the last, which is plain text", async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, {
      props: {
        items: [
          { label: "Read TES", to: "/" },
          { label: "Volumes", to: "/volumes" },
          { label: "Volume 1" },
        ],
      },
    });

    const links = wrapper.findAll("a");
    expect(links.map((link) => link.text())).toEqual(["Read TES", "Volumes"]);

    const current = wrapper.find('[aria-current="page"]');
    expect(current.text()).toBe("Volume 1");
  });

  it("separates items with a visual divider between them", async () => {
    const wrapper = await mountSuspended(AppBreadcrumb, {
      props: {
        items: [{ label: "A", to: "/a" }, { label: "B" }],
      },
    });

    expect(wrapper.text()).toContain("/");
  });
});
