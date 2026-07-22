import { describe, expect, it } from "vitest";
import { resolveActivePane } from "~/utils/mobilePaneSync";

describe("resolveActivePane", () => {
  it("picks the pane with the highest intersection ratio", () => {
    expect(
      resolveActivePane(
        { summary: 0, source: 0.9, commentary: 0.1 },
        "summary",
      ),
    ).toBe("source");
  });

  it("keeps `current` unchanged when every ratio is zero or absent", () => {
    expect(resolveActivePane({}, "source")).toBe("source");
    expect(
      resolveActivePane({ summary: 0, source: 0, commentary: 0 }, "commentary"),
    ).toBe("commentary");
  });

  it("breaks ties by reading order (summary, source, commentary)", () => {
    expect(resolveActivePane({ source: 0.5, commentary: 0.5 }, "summary")).toBe(
      "source",
    );
    expect(resolveActivePane({ summary: 0.5, commentary: 0.5 }, "source")).toBe(
      "summary",
    );
  });

  it("switches from source to commentary as the commentary slide comes fully into view", () => {
    expect(resolveActivePane({ source: 0.4, commentary: 0.6 }, "source")).toBe(
      "commentary",
    );
  });

  it("treats a missing entry for a pane as ratio 0", () => {
    expect(resolveActivePane({ commentary: 0.2 }, "summary")).toBe(
      "commentary",
    );
  });
});
