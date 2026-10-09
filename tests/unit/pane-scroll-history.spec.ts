import { describe, expect, it } from "vitest";
import {
  paneScrollPosition,
  withPaneScrollPosition,
} from "~/composables/usePaneScrollHistory";

describe("reader pane history state", () => {
  it("preserves router state and each pane's independent position", () => {
    const source = withPaneScrollPosition({ back: "/volumes" }, "source", 420);
    const both = withPaneScrollPosition(source, "commentary", 930);

    expect(both.back).toBe("/volumes");
    expect(paneScrollPosition(both, "source")).toBe(420);
    expect(paneScrollPosition(both, "commentary")).toBe(930);
  });

  it("returns null when an entry has no saved position for that pane", () => {
    expect(paneScrollPosition(null, "source")).toBeNull();
    expect(paneScrollPosition({}, "source")).toBeNull();
  });
});
