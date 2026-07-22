import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import IndexPage from "~/pages/index.vue";

describe("home page", () => {
  it("links the primary CTA to the first chapter and the secondary CTA to the volumes index", async () => {
    const wrapper = await mountSuspended(IndexPage);
    const links = wrapper.findAll("a");

    const beginReading = links.find((link) =>
      link.attributes("href")?.includes("/read/part-01/chapter-01"),
    );
    const browseVolumes = links.find(
      (link) => link.attributes("href") === "/volumes",
    );

    expect(beginReading).toBeTruthy();
    expect(browseVolumes).toBeTruthy();
  });

  it("renders the three reading-layer cards", async () => {
    const wrapper = await mountSuspended(IndexPage);
    const text = wrapper.text();

    expect(text).toContain("Source");
    expect(text).toContain("Inner Light");
    expect(text).toContain("Inner Observation");
  });

  it("renders the real opening line of the source text as the hero quote", async () => {
    const wrapper = await mountSuspended(IndexPage);

    expect(wrapper.text()).toContain(
      "Before the contraction, there was the Infinite, filling all of existence.",
    );
  });
});
