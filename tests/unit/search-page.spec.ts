import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchPage from "~/pages/search.vue";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

mockNuxtImport("$fetch", () => fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

describe("search page", () => {
  it("renders an accessible search form", async () => {
    const wrapper = await mountSuspended(SearchPage);

    expect(wrapper.findAll("h1")).toHaveLength(1);
    expect(wrapper.get('form[role="search"]')).toBeTruthy();
    expect(wrapper.get('input[type="search"]').attributes("minlength")).toBe(
      "2",
    );
  });

  it("queries the current language and links results to the reader anchor", async () => {
    fetchMock.mockResolvedValue({
      data: [
        {
          type: "search-result",
          id: "en-ai:part-01/chapter-01:source:seif-1",
          attributes: {
            chapterTitle: "Chapter One",
            excerpt: "The searched phrase appears here.",
            language: "en",
            layer: "source",
            partTitle: "Part One",
            versionTitle: "English",
          },
          links: { reader: "/read/part-01/chapter-01#seif-1" },
        },
      ],
      meta: { count: 1, query: "searched phrase" },
    });
    const wrapper = await mountSuspended(SearchPage);

    await wrapper.get('input[type="search"]').setValue("searched phrase");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/search", {
      query: { q: "searched phrase", lang: "en" },
    });
    expect(wrapper.text()).toContain("The searched phrase appears here.");
    expect(wrapper.get("ol a").attributes("href")).toBe(
      "/read/part-01/chapter-01#seif-1",
    );
  });

  it("announces an empty result set", async () => {
    fetchMock.mockResolvedValue({
      data: [],
      meta: { count: 0, query: "notfound" },
    });
    const wrapper = await mountSuspended(SearchPage);

    await wrapper.get('input[type="search"]').setValue("notfound");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("No results found.");
    expect(wrapper.text()).toContain("Browse the vocabulary glossary");
  });
});
