import { describe, expect, it } from "vitest";
import { PANE_ORDER, resolveActivePane } from "~/utils/mobilePaneSync";

describe("resolveActivePane", () => {
  it("picks the pane with the highest intersection ratio", () => {
    expect(
      resolveActivePane(
        { source: 0.9, commentary: 0.1, "inner-observation": 0 },
        "source",
      ),
    ).toBe("source");
  });

  it("keeps `current` unchanged when every ratio is zero or absent", () => {
    expect(resolveActivePane({}, "source")).toBe("source");
    expect(
      resolveActivePane(
        { source: 0, commentary: 0, "inner-observation": 0 },
        "commentary",
      ),
    ).toBe("commentary");
  });

  it("breaks ties by reading order (source, commentary, inner-observation)", () => {
    expect(
      resolveActivePane(
        { commentary: 0.5, "inner-observation": 0.5 },
        "source",
      ),
    ).toBe("commentary");
    expect(
      resolveActivePane({ source: 0.5, commentary: 0.5 }, "inner-observation"),
    ).toBe("source");
  });

  it("switches from source to commentary as the commentary slide comes fully into view", () => {
    expect(resolveActivePane({ source: 0.4, commentary: 0.6 }, "source")).toBe(
      "commentary",
    );
  });

  it("treats a missing entry for a pane as ratio 0", () => {
    expect(resolveActivePane({ commentary: 0.2 }, "source")).toBe("commentary");
  });

  it("honours a caller-supplied order — e.g. a part with no Inner Observation slide at all", () => {
    const order = ["source", "commentary"] as const;
    expect(
      resolveActivePane({ source: 0.5, commentary: 0.5 }, "source", order),
    ).toBe("source");
  });
});

describe("PANE_ORDER", () => {
  it("is source, commentary, inner-observation, in that reading order", () => {
    expect(PANE_ORDER).toEqual(["source", "commentary", "inner-observation"]);
  });
});
