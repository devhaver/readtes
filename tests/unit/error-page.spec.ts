import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ErrorPage from "~/error.vue";

describe("error page", () => {
  it("renders the not-found copy for a 404", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: {
        error: createError({ statusCode: 404, statusMessage: "Not Found" }),
      },
    });

    expect(wrapper.text()).toContain("Page not found");
    expect(wrapper.text()).toContain("404");
  });

  it("renders generic error copy for a non-404 error", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: {
        error: createError({
          statusCode: 500,
          statusMessage: "Server Error",
        }),
      },
    });

    expect(wrapper.text()).toContain("Something went wrong");
    expect(wrapper.text()).not.toContain("Page not found");
  });

  it("links home and to the volumes index", async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: {
        error: createError({ statusCode: 404, statusMessage: "Not Found" }),
      },
    });
    const main = wrapper.get("main");
    const hrefs = main.findAll("a").map((link) => link.attributes("href"));

    expect(main.findAll("button")).toHaveLength(0);
    expect(main.text()).toContain("Back to home");
    expect(hrefs).toEqual(["/", "/volumes", "/glossary", "/about"]);
  });
});
