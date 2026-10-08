import { describe, expect, it } from "vitest";
import { sourcePaneLabelKey } from "~/utils/sourcePaneLabel";

describe("sourcePaneLabelKey", () => {
  it("names only the Ari's own chapters as the Ari's text", () => {
    expect(sourcePaneLabelKey("chapter")).toBe("reader.pane.source");
    expect(sourcePaneLabelKey("introduction")).toBe("reader.pane.introduction");
    expect(sourcePaneLabelKey("inner-observation")).toBe(
      "reader.pane.innerObservation",
    );
    expect(sourcePaneLabelKey("questions-topics")).toBe(
      "reader.pane.questions",
    );
    expect(sourcePaneLabelKey("answers-cause-effect")).toBe(
      "reader.pane.answers",
    );
  });
});
