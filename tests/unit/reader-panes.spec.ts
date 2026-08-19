import { describe, expect, it } from "vitest";
import { resolveReaderPanes } from "~/utils/readerPanes";

describe("resolveReaderPanes", () => {
  it("returns all three panes when every layer exists", () => {
    expect(
      resolveReaderPanes({ hasCommentary: true, hasThirdPane: true }),
    ).toEqual(["source", "commentary", "inner-observation"]);
  });

  it("drops Inner Light when the chapter has no commentary edition", () => {
    expect(
      resolveReaderPanes({ hasCommentary: false, hasThirdPane: true }),
    ).toEqual(["source", "inner-observation"]);
  });

  // The third pane is tabbed (Inner Observation / Questions / Answers), so
  // a part with no Inner Observation still has one — it just opens on
  // Questions. This case is what happens if a part ever has none of the
  // three, which no part in the corpus does today.
  it("drops the third pane when the part has none of its three tabs", () => {
    expect(
      resolveReaderPanes({ hasCommentary: true, hasThirdPane: false }),
    ).toEqual(["source", "commentary"]);
  });

  it("collapses to a lone Source pane when both layers are absent", () => {
    expect(
      resolveReaderPanes({ hasCommentary: false, hasThirdPane: false }),
    ).toEqual(["source"]);
  });
});
