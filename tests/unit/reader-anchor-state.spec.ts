import { describe, expect, it } from "vitest";

describe("initialReaderAnchorState", () => {
  it("starts with no active anchor and the source pane active", () => {
    expect(initialReaderAnchorState()).toEqual({
      activeAnchor: null,
      anchorOrigin: null,
      activePane: "source",
    });
  });
});

describe("activateAnchorState", () => {
  it("sets the active anchor, its origin, and makes the origin pane active", () => {
    const next = activateAnchorState(
      initialReaderAnchorState(),
      "op-12",
      "source",
    );

    expect(next).toEqual({
      activeAnchor: "op-12",
      anchorOrigin: "source",
      activePane: "source",
    });
  });

  it("overwrites a previously-active anchor from a different pane", () => {
    const first = activateAnchorState(
      initialReaderAnchorState(),
      "op-1",
      "source",
    );
    const next = activateAnchorState(first, "op-1", "commentary");

    expect(next).toEqual({
      activeAnchor: "op-1",
      anchorOrigin: "commentary",
      activePane: "commentary",
    });
  });

  it("handles a summary-origin seif jump", () => {
    const next = activateAnchorState(
      initialReaderAnchorState(),
      "seif-3",
      "summary",
    );

    expect(next.activeAnchor).toBe("seif-3");
    expect(next.anchorOrigin).toBe("summary");
    expect(next.activePane).toBe("summary");
  });
});

describe("clearAnchorState", () => {
  it("clears the active anchor and its origin, but keeps the active pane", () => {
    const active = activateAnchorState(
      initialReaderAnchorState(),
      "op-1",
      "commentary",
    );
    const cleared = clearAnchorState(active);

    expect(cleared).toEqual({
      activeAnchor: null,
      anchorOrigin: null,
      activePane: "commentary",
    });
  });
});
