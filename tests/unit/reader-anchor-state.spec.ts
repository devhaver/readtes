import { describe, expect, it } from "vitest";

describe("initialReaderAnchorState", () => {
  it("starts with no active anchor and the source pane active", () => {
    expect(initialReaderAnchorState()).toEqual({
      activeAnchor: null,
      anchorOrigin: null,
      activePane: "source",
      activationSeq: 0,
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
      activationSeq: 1,
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
      activationSeq: 2,
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

  it("bumps activationSeq even when re-activating the same id/origin", () => {
    const first = activateAnchorState(
      initialReaderAnchorState(),
      "op-1",
      "source",
    );
    const second = activateAnchorState(first, "op-1", "source");

    expect(second.activeAnchor).toBe("op-1");
    expect(second.anchorOrigin).toBe("source");
    expect(second.activationSeq).toBe(first.activationSeq + 1);
  });
});

describe("reactivateAnchorState", () => {
  it("bumps activationSeq without touching the active anchor/origin/pane", () => {
    const active = activateAnchorState(
      initialReaderAnchorState(),
      "op-1",
      "commentary",
    );
    const next = reactivateAnchorState(active);

    expect(next).toEqual({
      ...active,
      activationSeq: active.activationSeq + 1,
    });
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
      activationSeq: active.activationSeq,
    });
  });
});
