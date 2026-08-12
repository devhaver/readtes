import { describe, expect, it } from "vitest";

describe("splitProseParagraphs", () => {
  it("splits an Inner Observation segment on its <br> boundaries", () => {
    expect(
      splitProseParagraphs("First paragraph.<br>Second paragraph."),
    ).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it.each(["<br>", "<br/>", "<br />", "<BR>", "<br  />"])(
    "treats %s as a boundary",
    (tag) => {
      expect(splitProseParagraphs(`one${tag}two`)).toEqual(["one", "two"]);
    },
  );

  it("returns the whole segment as one paragraph when there is no break", () => {
    expect(splitProseParagraphs("A single unbroken passage.")).toEqual([
      "A single unbroken passage.",
    ]);
  });

  it("drops the empty run consecutive breaks produce", () => {
    expect(splitProseParagraphs("one<br><br>two")).toEqual(["one", "two"]);
  });

  it("drops leading and trailing breaks rather than emitting blank paragraphs", () => {
    expect(splitProseParagraphs("<br>only<br>")).toEqual(["only"]);
  });

  it("returns no paragraphs for empty or whitespace-only html", () => {
    expect(splitProseParagraphs("")).toEqual([]);
    expect(splitProseParagraphs("   <br>  ")).toEqual([]);
  });

  it("never splits <b>, which shares the prefix but is not a break", () => {
    expect(splitProseParagraphs("<b>ראשית</b> כל צריכים לדעת")).toEqual([
      "<b>ראשית</b> כל צריכים לדעת",
    ]);
  });

  it("keeps inline markup intact within a paragraph", () => {
    expect(
      splitProseParagraphs('<b>ראשית</b> כל<br>ובזה <small>(ע"ח)</small> תנוח'),
    ).toEqual(["<b>ראשית</b> כל", 'ובזה <small>(ע"ח)</small> תנוח']);
  });
});
