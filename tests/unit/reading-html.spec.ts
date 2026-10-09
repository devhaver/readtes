import { describe, expect, it } from "vitest";

const MARKER = (n: string, order = n) =>
  `<a class="tes-anchor" href="#op-${order}" data-anchor="op-${order}">${n}</a>`;

describe("trimEdgeBreaks", () => {
  it("drops breaks that open or close an item", () => {
    expect(trimEdgeBreaks("<br><b>Catchword:</b> body<br>")).toBe(
      "<b>Catchword:</b> body",
    );
    expect(trimEdgeBreaks("<br/> <br />text")).toBe("text");
  });

  it("drops breaks that open or close a small or paragraph wrapper", () => {
    expect(trimEdgeBreaks("<small><br>Synopsis</small>")).toBe(
      "<small>Synopsis</small>",
    );
    expect(trimEdgeBreaks('<span class="tes-para">One<br></span>')).toBe(
      '<span class="tes-para">One</span>',
    );
  });

  it("leaves breaks between lines alone", () => {
    expect(trimEdgeBreaks("one<br>two")).toBe("one<br>two");
  });
});

describe("attachNoteMarkers", () => {
  it("removes the space before a marker so it cannot start a line", () => {
    expect(attachNoteMarkers(`reality ${MARKER("3")}.`)).toBe(
      `reality${MARKER("3")}.`,
    );
  });

  it("puts a space after a marker only when a letter follows it", () => {
    expect(attachNoteMarkers(`a ${MARKER("1")}b`)).toBe(`a${MARKER("1")} b`);
    expect(attachNoteMarkers(`a ${MARKER("1")}, b`)).toBe(`a${MARKER("1")}, b`);
    expect(attachNoteMarkers(`דע כי ${MARKER("א")}טרם`)).toBe(
      `דע כי${MARKER("א")} טרם`,
    );
  });

  it("keeps two adjacent markers apart", () => {
    expect(attachNoteMarkers(`x ${MARKER("1")} ${MARKER("2")}`)).toBe(
      `x${MARKER("1")} ${MARKER("2")}`,
    );
  });

  it("names each marker for assistive tech when asked", () => {
    expect(
      attachNoteMarkers(
        `x ${MARKER("20", "12")}`,
        (marker) => `Note ${marker}`,
      ),
    ).toBe(
      'x<a class="tes-anchor" href="#op-12" data-anchor="op-12" aria-label="Note 20">20</a>',
    );
  });

  it("leaves html with no markers untouched", () => {
    expect(attachNoteMarkers("plain <b>text</b> here")).toBe(
      "plain <b>text</b> here",
    );
  });
});

describe("markPrintAsterisk", () => {
  it("wraps a leading asterisk with its tooltip", () => {
    expect(markPrintAsterisk("* דע כי", "Printed mark")).toBe(
      '<span class="tes-print-mark" title="Printed mark">*</span> דע כי',
    );
  });

  it("leaves an asterisk that is not leading, or not a lone mark, alone", () => {
    expect(markPrintAsterisk("a * b", "t")).toBe("a * b");
    expect(markPrintAsterisk("*bold*", "t")).toBe("*bold*");
  });
});

describe("markSynopses", () => {
  it("tags a multi-line or long small as a synopsis", () => {
    expect(markSynopses("<small>a<br>b</small>")).toBe(
      '<small class="tes-synopsis">a<br>b</small>',
    );
    const long = "x".repeat(200);
    expect(markSynopses(`<small>${long}</small>`)).toBe(
      `<small class="tes-synopsis">${long}</small>`,
    );
  });

  it("leaves a short heading small alone", () => {
    expect(markSynopses("<small>Chapter One</small>")).toBe(
      "<small>Chapter One</small>",
    );
  });
});

describe("markTitleParagraph", () => {
  it("tags a first paragraph followed by a small heading as the title", () => {
    expect(
      markTitleParagraph(
        '<span class="tes-para">Circles</span><span class="tes-para"><small>One</small></span>',
      ),
    ).toBe(
      '<span class="tes-para tes-para-title">Circles</span><span class="tes-para"><small>One</small></span>',
    );
  });

  it("leaves a plain paragraph run alone", () => {
    const html =
      '<span class="tes-para">One</span><span class="tes-para">Two</span>';
    expect(markTitleParagraph(html)).toBe(html);
  });
});

describe("startsWithBold", () => {
  it("is true only when the bold opens the paragraph", () => {
    expect(startsWithBold("<b>ראשית</b> כל")).toBe(true);
    expect(startsWithBold("  <b>x</b>")).toBe(true);
    expect(startsWithBold("text <b>ה</b> more")).toBe(false);
    expect(startsWithBold("<br>text")).toBe(false);
  });
});

describe("prepareReadingHtml", () => {
  it("applies every touch-up in one pass", () => {
    expect(
      prepareReadingHtml(`<br>* word ${MARKER("1")}next<br>`, {
        printMarkTitle: "Printed mark",
      }),
    ).toBe(
      `<span class="tes-print-mark" title="Printed mark">*</span> word${MARKER("1")} next`,
    );
  });
});
