import { describe, expect, it } from "vitest";
import {
  linkInternalSefariaCrossRefs,
  parseSefariaCrossRef,
  sefariaCrossRefTarget,
  type SefariaCrossRef,
} from "~/utils/sefariaCrossRefs";

const SEFARIA_ORIGIN = "https://www.sefaria.org";

const refHref = (
  numeral: string,
  apparatus: "Answers" | "Questions",
  subject: "Terminology" | "Topics",
  n: number,
) =>
  `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_${numeral},_List_of_${apparatus}_on_${subject}_${n}`;

/** Resolves every ref that maps at all — where existence isn't the point. */
const resolveWithOffset = (topicsOffset: number) => (ref: SefariaCrossRef) => {
  const target = sefariaCrossRefTarget(ref, topicsOffset);
  return target && `${target.path}${target.hash}`;
};

const alwaysResolve = resolveWithOffset(0);

describe("parseSefariaCrossRef — the four ref shapes", () => {
  it("reads an answers-on-terminology ref", () => {
    expect(
      parseSefariaCrossRef(refHref("I", "Answers", "Terminology", 3)),
    ).toEqual({
      partId: "part-01",
      apparatus: "answers",
      subject: "terminology",
      number: 3,
    });
  });

  it("reads an answers-on-topics ref", () => {
    expect(
      parseSefariaCrossRef(refHref("IX", "Answers", "Topics", 106)),
    ).toEqual({
      partId: "part-09",
      apparatus: "answers",
      subject: "topics",
      number: 106,
    });
  });

  it("reads a questions-on-terminology ref", () => {
    expect(
      parseSefariaCrossRef(refHref("II", "Questions", "Terminology", 12)),
    ).toEqual({
      partId: "part-02",
      apparatus: "questions",
      subject: "terminology",
      number: 12,
    });
  });

  it("reads a questions-on-topics ref", () => {
    expect(
      parseSefariaCrossRef(refHref("XVI", "Questions", "Topics", 254)),
    ).toEqual({
      partId: "part-16",
      apparatus: "questions",
      subject: "topics",
      number: 254,
    });
  });

  it("parses the site-relative form the Sefaria API itself emits", () => {
    expect(
      parseSefariaCrossRef(
        "/Talmud_Eser_HaSefirot,_Section_IV,_List_of_Answers_on_Topics_3",
      ),
    ).toEqual({
      partId: "part-04",
      apparatus: "answers",
      subject: "topics",
      number: 3,
    });
  });
});

describe("parseSefariaCrossRef — section numerals", () => {
  const numerals = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
    "XIV",
    "XV",
    "XVI",
  ];

  it.each(numerals.map((numeral, index) => [numeral, index + 1] as const))(
    "maps Section %s to part %i",
    (numeral, partNumber) => {
      expect(
        parseSefariaCrossRef(refHref(numeral, "Answers", "Terminology", 1))
          ?.partId,
      ).toBe(`part-${String(partNumber).padStart(2, "0")}`);
    },
  );

  it("rejects a numeral outside the work's 16 sections", () => {
    expect(
      parseSefariaCrossRef(refHref("XVII", "Answers", "Terminology", 1)),
    ).toBeNull();
  });

  it("rejects a non-canonical numeral spelling", () => {
    expect(
      parseSefariaCrossRef(refHref("IIII", "Answers", "Terminology", 1)),
    ).toBeNull();
  });
});

describe("parseSefariaCrossRef — hrefs it declines", () => {
  it("returns null for another Sefaria text entirely", () => {
    expect(
      parseSefariaCrossRef(`${SEFARIA_ORIGIN}/Zohar,_Prologue.1`),
    ).toBeNull();
  });

  it("returns null for an in-page anchor fragment", () => {
    expect(parseSefariaCrossRef("#op-1")).toBeNull();
  });

  it("returns null for an unrelated external link", () => {
    expect(parseSefariaCrossRef("https://example.org/whatever")).toBeNull();
  });

  it("returns null for a ref with a trailing sub-reference", () => {
    expect(
      parseSefariaCrossRef(`${refHref("I", "Answers", "Topics", 3)}.4`),
    ).toBeNull();
  });
});

describe("sefariaCrossRefTarget", () => {
  const ref = (href: string) => parseSefariaCrossRef(href) as SefariaCrossRef;

  it("targets an answer's own chapter", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("I", "Answers", "Terminology", 1)), 54),
    ).toEqual({
      requiredChapterIds: ["part-01/answers-terminology-01"],
      path: "/read/part-01/answers-terminology-01",
      hash: "",
    });
  });

  it("targets a seif of the single questions chapter", () => {
    // Two required ids, not one: the ToC has no per-chapter item count, so
    // the paired answer chapter is what stands in for "seif 12 is really
    // there" — see `SefariaCrossRefTarget.requiredChapterIds`.
    expect(
      sefariaCrossRefTarget(
        ref(refHref("I", "Questions", "Terminology", 12)),
        54,
      ),
    ).toEqual({
      requiredChapterIds: [
        "part-01/questions-terminology-01",
        "part-01/answers-terminology-12",
      ],
      path: "/read/part-01/questions-terminology-01",
      hash: "#seif-12",
    });
  });

  it("subtracts the part's terminology count from a topics answer ref", () => {
    // Part 9's 78 topics answers are chapters 01-78, but the links pointing
    // at them are numbered 106-183 — continuing on from its 105 terminology
    // answers.
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Answers", "Topics", 106)), 105),
    ).toEqual({
      requiredChapterIds: ["part-09/answers-topics-01"],
      path: "/read/part-09/answers-topics-01",
      hash: "",
    });
  });

  it("subtracts the same offset from a topics question ref's seif", () => {
    expect(
      sefariaCrossRefTarget(
        ref(refHref("IX", "Questions", "Topics", 183)),
        105,
      ),
    ).toEqual({
      requiredChapterIds: [
        "part-09/questions-topics-01",
        "part-09/answers-topics-78",
      ],
      path: "/read/part-09/questions-topics-01",
      hash: "#seif-78",
    });
  });

  it("leaves a terminology ref's number alone whatever the offset", () => {
    expect(
      sefariaCrossRefTarget(
        ref(refHref("IX", "Answers", "Terminology", 12)),
        105,
      )?.requiredChapterIds,
    ).toEqual(["part-09/answers-terminology-12"]);
  });

  it("keeps three-digit chapter numbers unpadded", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("XII", "Answers", "Topics", 251)), 149)
        ?.requiredChapterIds,
    ).toEqual(["part-12/answers-topics-102"]);
  });

  it("returns null when the offset would leave nothing to point at", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Answers", "Topics", 105)), 105),
    ).toBeNull();
  });

  it("returns null for a zero-numbered ref", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("I", "Answers", "Terminology", 0)), 0),
    ).toBeNull();
  });
});

describe("linkInternalSefariaCrossRefs", () => {
  /** Resolves only against a fixed set of chapter ids, as the reader does. */
  const resolveAgainst =
    (chapterIds: string[], topicsOffset = 0) =>
    (parsed: SefariaCrossRef) => {
      const existing = new Set(chapterIds);
      const target = sefariaCrossRefTarget(parsed, topicsOffset);
      return target && target.requiredChapterIds.every((id) => existing.has(id))
        ? `${target.path}${target.hash}`
        : null;
    };

  it("replaces a resolved answer link, dropping its new-tab attributes", () => {
    const html = `מהו אור. <small>(<a href="${refHref("I", "Answers", "Terminology", 1)}" target="_blank" rel="noopener noreferrer">לתשובה</a>)</small>`;

    expect(linkInternalSefariaCrossRefs(html, alwaysResolve)).toBe(
      'מהו אור. <small>(<a href="/read/part-01/answers-terminology-01" data-cross-ref>לתשובה</a>)</small>',
    );
  });

  it("replaces a resolved question link with a seif fragment", () => {
    const html = `<small>(<a href="${refHref("I", "Questions", "Terminology", 1)}" target="_blank" rel="noopener noreferrer">לשאלה</a>)</small> <b>אור</b>`;

    expect(linkInternalSefariaCrossRefs(html, alwaysResolve)).toBe(
      '<small>(<a href="/read/part-01/questions-terminology-01#seif-1" data-cross-ref>לשאלה</a>)</small> <b>אור</b>',
    );
  });

  it("marks every link it made internal, and nothing else", () => {
    // `data-cross-ref` is what the reader's delegated click handler keys
    // off to route these client-side instead of reloading the document —
    // an external fallback must never carry it.
    const html = [
      `<a href="${refHref("I", "Answers", "Terminology", 1)}">1</a>`,
      `<a href="${refHref("I", "Answers", "Terminology", 55)}">55</a>`,
    ].join(" ");

    const linked = linkInternalSefariaCrossRefs(
      html,
      resolveAgainst(["part-01/answers-terminology-01"]),
    );

    expect(linked.match(/data-cross-ref/g)).toHaveLength(1);
    expect(linked).toContain(
      '<a href="/read/part-01/answers-terminology-01" data-cross-ref>',
    );
  });

  it("passes the caller's locale-prefixed href straight through", () => {
    const html = `<a href="${refHref("I", "Answers", "Topics", 2)}" target="_blank" rel="noopener noreferrer">לתשובה</a>`;

    expect(
      linkInternalSefariaCrossRefs(html, (parsed) => {
        const target = sefariaCrossRefTarget(parsed, 0);
        return target && `/he${target.path}${target.hash}`;
      }),
    ).toBe(
      '<a href="/he/read/part-01/answers-topics-02" data-cross-ref>לתשובה</a>',
    );
  });

  it("keeps the external link when the target chapter does not exist", () => {
    // Part 1 has 55 terminology questions but only 54 answer chapters — a
    // "to the answer" link for question 55 has nowhere to go on this site.
    const html = `<a href="${refHref("I", "Answers", "Terminology", 55)}" target="_blank" rel="noopener noreferrer">לתשובה</a>`;

    expect(
      linkInternalSefariaCrossRefs(
        html,
        resolveAgainst(["part-01/answers-terminology-54"]),
      ),
    ).toBe(html);
  });

  it("keeps the external link when the seif's own answer chapter is missing", () => {
    // The questions chapter exists, so the chapter half of the target
    // resolves — but nothing here says it runs as far as seif 55, and the
    // missing answer chapter is the corpus saying it may not. A fragment
    // that isn't on the page would scroll nowhere, silently.
    const html = `<a href="${refHref("I", "Questions", "Terminology", 55)}" target="_blank" rel="noopener noreferrer">לשאלה</a>`;

    expect(
      linkInternalSefariaCrossRefs(
        html,
        resolveAgainst([
          "part-01/questions-terminology-01",
          "part-01/answers-terminology-54",
        ]),
      ),
    ).toBe(html);
  });

  it("still links the refs around an unmatched one", () => {
    const html = [
      `<a href="${refHref("I", "Answers", "Terminology", 54)}">54</a>`,
      `<a href="${refHref("I", "Answers", "Terminology", 55)}">55</a>`,
    ].join(" ");

    expect(
      linkInternalSefariaCrossRefs(
        html,
        resolveAgainst(["part-01/answers-terminology-54"]),
      ),
    ).toBe(
      `<a href="/read/part-01/answers-terminology-54" data-cross-ref>54</a> <a href="${refHref("I", "Answers", "Terminology", 55)}">55</a>`,
    );
  });

  it("leaves an unrecognised href untouched", () => {
    const html =
      '<a href="https://example.org/elsewhere" target="_blank" rel="noopener noreferrer">elsewhere</a>';

    expect(linkInternalSefariaCrossRefs(html, alwaysResolve)).toBe(html);
  });

  it("leaves the reader's own in-page anchor markers untouched", () => {
    const html = '<a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a>';

    expect(linkInternalSefariaCrossRefs(html, alwaysResolve)).toBe(html);
  });

  it("leaves html with no links at all unchanged", () => {
    expect(
      linkInternalSefariaCrossRefs("<b>plain text</b>", alwaysResolve),
    ).toBe("<b>plain text</b>");
  });

  it("preserves any other attributes on a rewritten link", () => {
    const html = `<a class="x" href="${refHref("I", "Answers", "Topics", 2)}" target="_blank">לתשובה</a>`;

    expect(linkInternalSefariaCrossRefs(html, alwaysResolve)).toBe(
      '<a href="/read/part-01/answers-topics-02" data-cross-ref class="x">לתשובה</a>',
    );
  });
});
