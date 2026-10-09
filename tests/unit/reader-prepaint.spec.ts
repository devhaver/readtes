import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("reader pre-paint preferences", () => {
  it("connects persisted chrome and mode attributes to stable markup hooks", () => {
    const css = read("app/assets/css/main.css");
    const layout = read("app/layouts/reader.vue");
    const toolbar = read("app/components/reader/ReaderToolbar.vue");
    const page = read("app/pages/read/[part]/[chapter].vue");

    expect(layout).toContain("data-reader-navbar");
    expect(toolbar).toContain("data-reader-toolbar");
    expect(layout).toContain("data-reader-hydrated");
    expect(page).toContain('data-reader-mode="panes"');
    expect(css).toContain('[data-pref-chrome="collapsed"]');
    expect(css).toContain('[data-pref-mode="study"]');
    expect(css).toContain('[data-pref-mode="original"]');
  });

  it("removes auto-hidden chrome from keyboard navigation", () => {
    expect(read("app/layouts/reader.vue")).toContain(":inert=");
    expect(read("app/components/reader/ReaderToolbar.vue")).toContain(
      ':inert="isStudyMode && !chromeVisible ? true : undefined"',
    );
  });
});
