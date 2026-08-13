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
  subject: "Terminology" | "Topics" | "Cause_and_Effect",
  n: number,
) =>
  `${SEFARIA_ORIGIN}/Talmud_Eser_HaSefirot,_Section_${numeral},_List_of_${apparatus}_on_${subject}_${n}`;

/** Resolves every ref that maps at all — where existence isn't the point. */
const resolveWithOffset = (terminology: number) => (ref: SefariaCrossRef) => {
  const target = sefariaCrossRefTarget(ref, { terminology });
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

  it("targets a seif of the single consolidated answers chapter", () => {
    // Issue #91: answers are `#seif-N` items of `answers-<subject>-01` now,
    // exactly like questions — no more one chapter per answer.
    expect(
      sefariaCrossRefTarget(ref(refHref("I", "Answers", "Terminology", 1)), {
        terminology: 54,
      }),
    ).toEqual({
      requiredChapterIds: ["part-01/answers-terminology-01"],
      answerItem: { chapterId: "part-01/answers-terminology-01", n: 1 },
      path: "/read/part-01/answers-terminology-01",
      hash: "#seif-1",
    });
  });

  it("targets a seif of the single questions chapter", () => {
    // Two required ids, not one: the answers chapter isn't the target here
    // — it's the only evidence available that seif 12 is really there (its
    // own item 12 must exist), the same pairing #78 always used, now
    // checked at item granularity — see `SefariaCrossRefTarget.answerItem`.
    expect(
      sefariaCrossRefTarget(ref(refHref("I", "Questions", "Terminology", 12)), {
        terminology: 54,
      }),
    ).toEqual({
      requiredChapterIds: [
        "part-01/questions-terminology-01",
        "part-01/answers-terminology-01",
      ],
      answerItem: { chapterId: "part-01/answers-terminology-01", n: 12 },
      path: "/read/part-01/questions-terminology-01",
      hash: "#seif-12",
    });
  });

  it("subtracts the part's terminology count from a topics answer ref", () => {
    // Part 9's 78 topics answers are items 1-78 of `answers-topics-01`, but
    // the links pointing at them are numbered 106-183 — continuing on from
    // its 105 terminology answers.
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Answers", "Topics", 106)), {
        terminology: 105,
      }),
    ).toEqual({
      requiredChapterIds: ["part-09/answers-topics-01"],
      answerItem: { chapterId: "part-09/answers-topics-01", n: 1 },
      path: "/read/part-09/answers-topics-01",
      hash: "#seif-1",
    });
  });

  it("subtracts the same offset from a topics question ref's seif", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Questions", "Topics", 183)), {
        terminology: 105,
      }),
    ).toEqual({
      requiredChapterIds: [
        "part-09/questions-topics-01",
        "part-09/answers-topics-01",
      ],
      answerItem: { chapterId: "part-09/answers-topics-01", n: 78 },
      path: "/read/part-09/questions-topics-01",
      hash: "#seif-78",
    });
  });

  it("leaves a terminology ref's number alone whatever the offset", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Answers", "Terminology", 12)), {
        terminology: 105,
      })?.answerItem,
    ).toEqual({ chapterId: "part-09/answers-terminology-01", n: 12 });
  });

  it("keeps three-digit answer numbers unpadded in the seif fragment", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("XII", "Answers", "Topics", 251)), {
        terminology: 149,
      }),
    ).toEqual({
      requiredChapterIds: ["part-12/answers-topics-01"],
      answerItem: { chapterId: "part-12/answers-topics-01", n: 102 },
      path: "/read/part-12/answers-topics-01",
      hash: "#seif-102",
    });
  });

  it("returns null when the offset would leave nothing to point at", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Answers", "Topics", 105)), {
        terminology: 105,
      }),
    ).toBeNull();
  });

  it("subtracts terminology AND topics from a cause-and-effect ref (issue #86)", () => {
    // Section VI is the only part with the table. Its cause-and-effect
    // answers are numbered from 138 upstream, continuing on from 30
    // terminology + 107 topics answers — the same 137 Sefaria publishes as
    // that node's `index_offsets_by_depth` (issue #103).
    expect(
      sefariaCrossRefTarget(
        ref(refHref("VI", "Answers", "Cause_and_Effect", 138)),
        {
          terminology: 30,
          topics: 107,
        },
      ),
    ).toEqual({
      requiredChapterIds: ["part-06/answers-cause-effect-01"],
      answerItem: { chapterId: "part-06/answers-cause-effect-01", n: 1 },
      path: "/read/part-06/answers-cause-effect-01",
      hash: "#seif-1",
    });
  });

  it("counts a missing earlier subject as zero rather than refusing", () => {
    // Fifteen of the sixteen parts have no cause-and-effect table at all,
    // so a partial `answerCounts` is the normal case, not an error.
    expect(
      sefariaCrossRefTarget(ref(refHref("IX", "Answers", "Topics", 106)), {
        terminology: 105,
      })?.answerItem,
    ).toEqual({ chapterId: "part-09/answers-topics-01", n: 1 });
  });

  it("returns null for a zero-numbered ref", () => {
    expect(
      sefariaCrossRefTarget(ref(refHref("I", "Answers", "Terminology", 0)), {
        terminology: 0,
      }),
    ).toBeNull();
  });
});

describe("linkInternalSefariaCrossRefs", () => {
  /**
   * Resolves only against a fixed set of chapter ids and per-chapter
   * `itemCount`s, mirroring `useLinkedCrossRefs`'s own guardrail: both the
   * chapter and the specific answer item (`SefariaCrossRefTarget.answerItem`)
   * must be confirmed before a link goes internal.
   */
  const resolveAgainst =
    (
      chapterIds: string[],
      itemCounts: Record<string, number> = {},
      terminology = 0,
    ) =>
    (parsed: SefariaCrossRef) => {
      const existing = new Set(chapterIds);
      const target = sefariaCrossRefTarget(parsed, { terminology });
      if (!target) return null;
      if (!target.requiredChapterIds.every((id) => existing.has(id))) {
        return null;
      }
      const count = itemCounts[target.answerItem.chapterId];
      if (count === undefined || target.answerItem.n > count) return null;
      return `${target.path}${target.hash}`;
    };

  it("replaces a resolved answer link, dropping its new-tab attributes", () => {
    const html = `מהו אור. <small>(<a href="${refHref("I", "Answers", "Terminology", 1)}" target="_blank" rel="noopener noreferrer">לתשובה</a>)</small>`;

    expect(linkInternalSefariaCrossRefs(html, alwaysResolve)).toBe(
      'מהו אור. <small>(<a href="/read/part-01/answers-terminology-01#seif-1" data-cross-ref>לתשובה</a>)</small>',
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
    // an external fallback must never carry it. Both refs land on the same
    // consolidated chapter now, so it's the item guardrail (itemCount: 1)
    // — not chapter existence — that keeps "55" external.
    const html = [
      `<a href="${refHref("I", "Answers", "Terminology", 1)}">1</a>`,
      `<a href="${refHref("I", "Answers", "Terminology", 55)}">55</a>`,
    ].join(" ");

    const linked = linkInternalSefariaCrossRefs(
      html,
      resolveAgainst(["part-01/answers-terminology-01"], {
        "part-01/answers-terminology-01": 1,
      }),
    );

    expect(linked.match(/data-cross-ref/g)).toHaveLength(1);
    expect(linked).toContain(
      '<a href="/read/part-01/answers-terminology-01#seif-1" data-cross-ref>',
    );
  });

  it("passes the caller's locale-prefixed href straight through", () => {
    const html = `<a href="${refHref("I", "Answers", "Topics", 2)}" target="_blank" rel="noopener noreferrer">לתשובה</a>`;

    expect(
      linkInternalSefariaCrossRefs(html, (parsed) => {
        const target = sefariaCrossRefTarget(parsed, {});
        return target && `/he${target.path}${target.hash}`;
      }),
    ).toBe(
      '<a href="/he/read/part-01/answers-topics-01#seif-2" data-cross-ref>לתשובה</a>',
    );
  });

  it("keeps the external link when the answer item does not exist", () => {
    // Part 1's terminology answers run 1-54 — a "to the answer" link for
    // answer 55 (an out-of-range number) has nowhere to go on this site.
    const html = `<a href="${refHref("I", "Answers", "Terminology", 55)}" target="_blank" rel="noopener noreferrer">לתשובה</a>`;

    expect(
      linkInternalSefariaCrossRefs(
        html,
        resolveAgainst(["part-01/answers-terminology-01"], {
          "part-01/answers-terminology-01": 54,
        }),
      ),
    ).toBe(html);
  });

  it("keeps the external link when the seif's own answer item is missing", () => {
    // The questions chapter exists, and so does the answers chapter — but
    // nothing here says the answers chapter runs as far as item 55, and a
    // missing answer 55 is the corpus saying question 55 may have none
    // either (Part 1's known break: 55 terminology questions, 54 answers).
    // A fragment that isn't on the page would scroll nowhere, silently.
    const html = `<a href="${refHref("I", "Questions", "Terminology", 55)}" target="_blank" rel="noopener noreferrer">לשאלה</a>`;

    expect(
      linkInternalSefariaCrossRefs(
        html,
        resolveAgainst(
          [
            "part-01/questions-terminology-01",
            "part-01/answers-terminology-01",
          ],
          { "part-01/answers-terminology-01": 54 },
        ),
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
        resolveAgainst(["part-01/answers-terminology-01"], {
          "part-01/answers-terminology-01": 54,
        }),
      ),
    ).toBe(
      `<a href="/read/part-01/answers-terminology-01#seif-54" data-cross-ref>54</a> <a href="${refHref("I", "Answers", "Terminology", 55)}">55</a>`,
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
      '<a href="/read/part-01/answers-topics-01#seif-2" data-cross-ref class="x">לתשובה</a>',
    );
  });
});
