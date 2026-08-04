import { describe, expect, it } from "vitest";
import { resolveReaderPanes } from "~/utils/readerPanes";

describe("resolveReaderPanes", () => {
  it("returns all three panes when every layer exists", () => {
    expect(
      resolveReaderPanes({ hasCommentary: true, hasInnerObservation: true }),
    ).toEqual(["source", "commentary", "inner-observation"]);
  });

  it("drops Inner Light when the chapter has no commentary edition", () => {
    expect(
      resolveReaderPanes({ hasCommentary: false, hasInnerObservation: true }),
    ).toEqual(["source", "inner-observation"]);
  });

  it("drops Inner Observation when the part has none", () => {
    expect(
      resolveReaderPanes({ hasCommentary: true, hasInnerObservation: false }),
    ).toEqual(["source", "commentary"]);
  });

  it("collapses to a lone Source pane when both layers are absent", () => {
    expect(
      resolveReaderPanes({ hasCommentary: false, hasInnerObservation: false }),
    ).toEqual(["source"]);
  });
});
