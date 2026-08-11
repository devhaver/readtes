import { describe, expect, it } from "vitest";
import { formatIsoDate } from "~/composables/useFormattedDate";

describe("formatIsoDate", () => {
  it("renders a calendar date in the reader's own language", () => {
    expect(formatIsoDate("2026-07-27", "en-US")).toBe("July 27, 2026");
    expect(formatIsoDate("2026-07-27", "he-IL")).toContain("2026");
    expect(formatIsoDate("2026-07-27", "he-IL")).not.toBe("2026-07-27");
  });

  /**
   * `new Date("2026-07-27")` is midnight UTC, so a formatter left on the
   * machine's own zone shows the 26th to anyone west of Greenwich. The dates
   * this renders have no time in them at all.
   */
  it("does not drift a day in a western timezone", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(formatIsoDate("2026-07-27", "en-US")).toBe("July 27, 2026");
    } finally {
      process.env.TZ = previous;
    }
  });

  it("returns unparseable input untouched rather than rendering 'Invalid Date'", () => {
    expect(formatIsoDate("not-a-date", "en-US")).toBe("not-a-date");
  });
});
