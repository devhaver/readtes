// `ReaderContentsPanel` renders via `Teleport to="body"` (same as
// `CommentarySheet`/`ReadingPreferencesModal`), so assertions read
// `document.body` directly rather than the mounted wrapper — see
// `commentary-sheet.spec.ts`.
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import ReaderContentsPanel from "~/components/reader/ReaderContentsPanel.vue";
import type { TocVolumeSkeleton } from "~~/shared/types/content";

const part = (
  id: string,
  number: number,
  firstChapterId: string | null,
): TocVolumeSkeleton["parts"][number] => ({
  id,
  number,
  title: { en: `Part ${number}`, he: `חלק ${number}` },
  sefariaNode: `Talmud Eser HaSefirot, Section ${number}`,
  chapterCount: firstChapterId ? 1 : 0,
  kindsPresent: firstChapterId ? ["chapter"] : [],
  firstChapterId,
  lastChapterId: firstChapterId,
  firstChapterTitle: firstChapterId ? { en: "Chapter 1", he: "פרק א׳" } : null,
  lastChapterTitle: firstChapterId ? { en: "Chapter 1", he: "פרק א׳" } : null,
  availableSummary: { he: "full", en: "none" },
});

const volumes: TocVolumeSkeleton[] = [
  {
    id: "volume-01",
    number: 1,
    title: { en: "Volume 1", he: "כרך 1" },
    parts: [
      part("part-01", 1, "part-01/chapter-01"),
      part("part-02", 2, "part-02/chapter-01"),
    ],
  },
  {
    id: "volume-02",
    number: 2,
    title: { en: "Volume 2", he: "כרך 2" },
    parts: [part("part-03", 3, null)],
  },
];

describe("ReaderContentsPanel", () => {
  it("renders nothing when closed", async () => {
    const wrapper = await mountSuspended(ReaderContentsPanel, {
      props: {
        open: false,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it("lists every volume and every one of its parts when open", async () => {
    const wrapper = await mountSuspended(ReaderContentsPanel, {
      props: {
        open: true,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    expect(document.body.textContent).toContain("Volume 1");
    expect(document.body.textContent).toContain("Volume 2");
    expect(document.body.textContent).toContain("Part 1");
    expect(document.body.textContent).toContain("Part 2");
    expect(document.body.textContent).toContain("Part 3");
    wrapper.unmount();
  });

  it("marks the current volume and part with aria-current", async () => {
    const wrapper = await mountSuspended(ReaderContentsPanel, {
      props: {
        open: true,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    const links = Array.from(document.body.querySelectorAll("a"));
    const currentVolumeLink = links.find(
      (link) => link.getAttribute("href") === "/volumes/volume-1",
    );
    expect(currentVolumeLink?.getAttribute("aria-current")).toBe("true");

    const currentPartLink = links.find(
      (link) => link.getAttribute("href") === "/read/part-01/chapter-01",
    );
    expect(currentPartLink?.getAttribute("aria-current")).toBe("true");

    const otherPartLink = links.find(
      (link) => link.getAttribute("href") === "/read/part-02/chapter-01",
    );
    expect(otherPartLink?.getAttribute("aria-current")).toBeNull();
    wrapper.unmount();
  });

  it("renders a part with no chapters yet as disabled, not a link", async () => {
    const wrapper = await mountSuspended(ReaderContentsPanel, {
      props: {
        open: true,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
    });

    const hrefs = Array.from(document.body.querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(hrefs).not.toContain("/read/part-03/chapter-01");
    expect(document.body.textContent).toContain("Part 3");
    wrapper.unmount();
  });

  it("closes on Escape", async () => {
    const wrapper = await mountSuspended(ReaderContentsPanel, {
      props: {
        open: true,
        volumes,
        currentVolumeId: "volume-01",
        currentPartId: "part-01",
      },
      attachTo: document.body,
    });

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.emitted("close")).toBeTruthy();

    wrapper.unmount();
  });
});
