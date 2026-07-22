import { describe, expect, it } from "vitest";

describe("localizedText", () => {
  it("resolves the requested locale when present", () => {
    expect(localizedText({ en: "Volume 1", he: "כרך 1" }, "he")).toBe("כרך 1");
    expect(localizedText({ en: "Volume 1", he: "כרך 1" }, "en")).toBe(
      "Volume 1",
    );
  });

  it("falls back to en when the requested locale is missing", () => {
    expect(localizedText({ en: "Volume 1" }, "fr")).toBe("Volume 1");
  });

  it("falls back to he when en is also missing", () => {
    expect(localizedText({ he: "כרך 1" }, "fr")).toBe("כרך 1");
  });

  it("falls back to the first available value when neither en nor he exist", () => {
    expect(localizedText({ fr: "Volume 1" }, "de")).toBe("Volume 1");
  });

  it("returns an empty string for a completely empty record", () => {
    expect(localizedText({}, "en")).toBe("");
  });
});
