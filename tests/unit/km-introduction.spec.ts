import { describe, expect, it } from "vitest";
import { bareHebrewOrdinal } from "../../scripts/lib/hebrew-numerals.ts";
import {
  alignKmIntroduction,
  alignSectionParagraphs,
  buildKmHebrewReference,
  KM_INTRODUCTION_SECTIONS,
  matchSharedWords,
  parseKmIntroductionBlocks,
  placeParagraphsInSegments,
  splitKmIntroductionSections,
} from "../../scripts/lib/km-introduction.ts";
import type { SourceSegment } from "../../shared/types/content.ts";

// ---------------------------------------------------------------------------
// Fixtures. KabbalahMedia's documents are 155 numbered sections long, so the
// end-to-end cases build all of them: a Hebrew document, OUR segments cut from
// the same words differently, and a translation printed in any of the three
// numbering styles the real ones use. Nothing here touches the network.
// ---------------------------------------------------------------------------

/** doc2html wraps every word onto a line of its own; nothing may depend on it. */
const paragraph = (text: string): string =>
  `<p>\n  ${text.split(" ").join("\n  ")}\n</p>`;

const LETTERS = [..."אבגדהוזחטיכלמנסעפצקרשת"];

/** A distinct four-letter Hebrew "word" per index, so a diff can tell any two apart. */
const hebrewWord = (index: number): string =>
  [0, 1, 2, 3]
    .map((place) => LETTERS[Math.floor(index / 22 ** place) % 22])
    .join("");

const hebrewWords = (from: number, to: number): string =>
  Array.from({ length: to - from }, (_, index) =>
    hebrewWord(from + index),
  ).join(" ");

const filler = (words: number): string =>
  Array.from({ length: words }, () => "lorem").join(" ");

interface Shape {
  /** Words in each Hebrew paragraph; the first opens the section. */
  hebrew: number[];
  /** Words in each translated paragraph; the first opens the section. */
  translated: number[];
  /** How many Hebrew paragraphs each of OUR segments holds (default: one each). */
  cuts?: number[];
}

const DEFAULT_SHAPE: Shape = { hebrew: [8, 12], translated: [12, 18] };

type NumberingStyle = "paren" | "dot" | "list";

const buildFixture = (shapes: Record<number, Partial<Shape>> = {}) => {
  let nextWord = 0;
  let nextSegment = 1;
  const segments: SourceSegment[] = [];
  const segmentsOf = new Map<number, number[]>();

  const sections = KM_INTRODUCTION_SECTIONS.map((number) => {
    const shape = { ...DEFAULT_SHAPE, ...shapes[number] };
    const hebrew = shape.hebrew.map((words, index) => {
      const text = hebrewWords(nextWord, nextWord + words);
      nextWord += words;
      return index === 0 ? `${bareHebrewOrdinal(number)}) ${text}` : text;
    });

    let taken = 0;
    const own: number[] = [];
    for (const count of shape.cuts ?? hebrew.map(() => 1)) {
      segments.push({
        n: nextSegment,
        sefariaRef: `Introduction ${nextSegment}`,
        html: hebrew.slice(taken, taken + count).join(" "),
        anchors: [],
      });
      own.push(nextSegment);
      nextSegment += 1;
      taken += count;
    }
    segmentsOf.set(number, own);

    const translated = shape.translated.map(
      (words, index) => `S${number}P${index + 1} ${filler(words - 1)}`,
    );
    return { number, hebrew, translated };
  });

  const hebrewHtml = [
    "<h1>הקדמה לתלמוד עשר הספירות</h1>",
    ...sections.flatMap((section) => [
      ...section.hebrew.map(paragraph),
      ...(section.number === 70
        ? [paragraph('[הערת העורך: אות ע"א חסרה במקור]')]
        : []),
    ]),
  ].join("\n");

  const translationHtml = (style: NumberingStyle = "paren"): string =>
    [
      "<h1>Introduction to the Study of the Ten Sefirot</h1>",
      paragraph("Baal HaSulam"),
      ...sections.flatMap((section) => {
        const [opener, ...rest] = section.translated as [string, ...string[]];
        // Portuguese prints no numbers: each section opens a list item.
        const first =
          style === "list"
            ? `<ol start="${section.number}">\n<li>\n${paragraph(opener)}\n</li>\n</ol>`
            : paragraph(
                `${section.number}${style === "paren" ? ")" : "."} ${opener}`,
              );
        const body = rest.map((text, index) =>
          // Word's numbering also gave an ordinary paragraph of section 70 the number 71.
          style === "list" && section.number === 70 && index === 0
            ? `<ol start="71">\n<li>\n${paragraph(text)}\n</li>\n</ol>`
            : paragraph(text),
        );
        return [
          first,
          ...body,
          ...(section.number === 70
            ? [
                paragraph(
                  "[Editor’s note: Item 71 is missing in the manuscript]",
                ),
              ]
            : []),
        ];
      }),
    ].join("\n");

  return { segments, segmentsOf, hebrewHtml, translationHtml };
};

const referenceOf = (fixture: ReturnType<typeof buildFixture>) => {
  const reference = buildKmHebrewReference(
    fixture.hebrewHtml,
    fixture.segments,
  );
  if (!reference.ok) throw new Error(reference.reason);
  return reference;
};

const importOf = (
  fixture: ReturnType<typeof buildFixture>,
  html = fixture.translationHtml(),
) => alignKmIntroduction(referenceOf(fixture), html);

const imported = (result: ReturnType<typeof alignKmIntroduction>) => {
  if (!result.ok) throw new Error(result.reason);
  return result;
};

/** The segment whose text holds `label`. */
const segmentWith = (segments: SourceSegment[], label: string) =>
  segments.find((segment) => segment.html.includes(label));

// ---------------------------------------------------------------------------

describe("KM_INTRODUCTION_SECTIONS", () => {
  it("is 1 to 156 without 71, the item missing from the manuscript", () => {
    expect(KM_INTRODUCTION_SECTIONS).toHaveLength(155);
    expect(KM_INTRODUCTION_SECTIONS.slice(68, 72)).toEqual([69, 70, 72, 73]);
    expect(KM_INTRODUCTION_SECTIONS.at(-1)).toBe(156);
  });
});

describe("parseKmIntroductionBlocks", () => {
  it("reads paragraphs and headings in order, undoing the one-word-per-line wrapping", () => {
    const blocks = parseKmIntroductionBlocks(
      [
        "<h1>\n  Title\n</h1>",
        "<p>\n  Plain\n  &nbsp;text\n</p>",
        "<p>&nbsp;</p>",
        "<p><strong>\n  1)</strong>\n  Bold\n  <em>\n  em</em>\n</p>",
      ].join("\n"),
    );

    expect(blocks.map((block) => block.text)).toEqual([
      "Title",
      "Plain text",
      "1) Bold em",
    ]);
    expect(blocks[2]?.html).toBe("<strong> 1)</strong> Bold <em> em</em>");
  });

  it("numbers the first paragraph of each ordered-list item from the list's start, and no other", () => {
    const blocks = parseKmIntroductionBlocks(
      [
        "<p>Title</p>",
        '<ol start="2"><li><p>Two</p><p>Two, continued</p></li><li><p>Three</p></li></ol>',
        "<ul><li><p>Bullet</p></li></ul>",
        '<ol type="1"><li><p>One</p></li></ol>',
        "<p>After</p>",
      ].join(""),
    );

    expect(blocks.map((block) => [block.text, block.listNumber])).toEqual([
      ["Title", undefined],
      ["Two", 2],
      ["Two, continued", undefined],
      ["Three", 3],
      ["Bullet", undefined],
      ["One", 1],
      ["After", undefined],
    ]);
  });

  it("folds a footnote into the pair sanitizeHtml reads, at its reference, and drops the trailing section", () => {
    const blocks = parseKmIntroductionBlocks(
      [
        '<p>Before the <em>PARDESS</em><a href="#fn1"\n  class="footnote-ref"\n  id="fnref1"><sup>1</sup></a> after.</p>',
        "<p>The last paragraph.</p>",
        '<section class="footnotes"><hr><ol><li id="fn1"><p>See\n the essay.<a href="#fnref1" class="footnote-back">↩</a></p></li></ol></section>',
      ].join("\n"),
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.html).toBe(
      'Before the <em>PARDESS</em><sup class="footnote-marker">1</sup><i class="footnote">See the essay.</i> after.',
    );
    // A tooltip is not text: it must not lengthen the paragraph it hangs on.
    expect(blocks[0]?.text).toBe("Before the PARDESS after.");
  });

  it("reads a reference written with the link inside the superscript, and keeps the number of one with no definition", () => {
    const blocks = parseKmIntroductionBlocks(
      [
        '<p>One<sup><a class="footnote-ref" href="#fn1">1</a></sup> two<sup><a class="footnote-ref" href="#fn2">2</a></sup>.</p>',
        '<section class="footnotes"><ol><li id="fn1"><p>First.</p></li></ol></section>',
      ].join(""),
    );

    expect(blocks[0]?.html).toBe(
      'One<sup class="footnote-marker">1</sup><i class="footnote">First.</i> two<sup>2</sup>.',
    );
  });
});

describe("splitKmIntroductionSections", () => {
  const opens = (block: string, number: number): boolean =>
    block.startsWith(`${number})`);

  it("drops what precedes the first section, and skips a number the manuscript lacks", () => {
    const { sections, problem } = splitKmIntroductionSections(
      ["Title", "Author", "1) a", "more a", "2) b", "4) d", "more d"],
      [1, 2, 4],
      opens,
    );

    expect(problem).toBeUndefined();
    expect(sections).toEqual([
      { number: 1, blocks: ["1) a", "more a"] },
      { number: 2, blocks: ["2) b"] },
      { number: 4, blocks: ["4) d", "more d"] },
    ]);
  });

  it("opens a section only on the number expected next", () => {
    const { sections } = splitKmIntroductionSections(
      ["1) a", "3) an item of a list inside section 1", "2) b", "4) d"],
      [1, 2, 4],
      opens,
    );

    expect(sections.map((section) => section.blocks)).toEqual([
      ["1) a", "3) an item of a list inside section 1"],
      ["2) b"],
      ["4) d"],
    ]);
  });

  it("names the first section that never opens", () => {
    const { sections, problem } = splitKmIntroductionSections(
      ["1) a", "2) b", "text", "4) d"],
      [1, 2, 3, 4],
      opens,
    );

    expect(sections.map((section) => section.number)).toEqual([1, 2]);
    expect(problem).toBe(
      "found 2 of 4 numbered sections — section 3 never opens",
    );
  });
});

describe("matchSharedWords", () => {
  const lcsLength = (a: string[], b: string[]): number => {
    const table = Array.from({ length: a.length + 1 }, () =>
      new Array<number>(b.length + 1).fill(0),
    );
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        (table[i] as number[])[j] =
          a[i - 1] === b[j - 1]
            ? ((table[i - 1] as number[])[j - 1] as number) + 1
            : Math.max(
                (table[i - 1] as number[])[j] as number,
                (table[i] as number[])[j - 1] as number,
              );
      }
    }
    return (table[a.length] as number[])[b.length] as number;
  };

  it("pairs every word of identical streams with its twin", () => {
    const words = ["a", "b", "c"];
    expect([...(matchSharedWords(words, words, 0) as Int32Array)]).toEqual([
      0, 1, 2,
    ]);
  });

  it("leaves an inserted, a deleted and a substituted word unpaired", () => {
    const matched = matchSharedWords(
      ["a", "b", "x", "d", "e"],
      ["a", "b", "c", "d", "y", "e"],
      10,
    ) as Int32Array;

    // x was swapped for c (no twin), and e moved past an inserted y.
    expect([...matched]).toEqual([0, 1, -1, 3, 5]);
  });

  it("gives up on streams further apart than it was told to look", () => {
    expect(matchSharedWords(["a", "b"], ["c", "d"], 3)).toBeUndefined();
    expect([
      ...(matchSharedWords(["a", "b"], ["c", "d"], 4) as Int32Array),
    ]).toEqual([-1, -1]);
  });

  it("agrees with a brute-force longest common subsequence on random streams", () => {
    // A small deterministic generator (mulberry32): the test must not flake.
    let state = 20260709;
    const random = (): number => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const stream = (): string[] =>
      Array.from({ length: Math.floor(random() * 40) }, () =>
        String(Math.floor(random() * 5)),
      );

    for (let trial = 0; trial < 300; trial += 1) {
      const a = stream();
      const b = stream();
      const matched = matchSharedWords(a, b, a.length + b.length) as Int32Array;

      const pairs = [...matched].flatMap((partner, index) =>
        partner === -1 ? [] : [[index, partner] as const],
      );
      expect(pairs.length).toBe(lcsLength(a, b));
      pairs.forEach(([i, j], at) => {
        expect(a[i]).toBe(b[j]);
        // Pairs keep text order on both sides.
        if (at > 0)
          expect(j).toBeGreaterThan((pairs[at - 1] as [number, number])[1]);
      });
    }
  });
});

describe("placeParagraphsInSegments", () => {
  const segment = (n: number, html: string): SourceSegment => ({
    n,
    html,
    anchors: [],
  });

  it("puts a paragraph in the first segment its words fall in, whether it straddles two or shares one", () => {
    const placement = placeParagraphsInSegments(
      [hebrewWords(0, 10), hebrewWords(10, 30), hebrewWords(30, 40)],
      [
        segment(1, hebrewWords(0, 5)),
        segment(2, hebrewWords(5, 20)),
        segment(3, hebrewWords(20, 40)),
      ],
    );

    // Paragraph 2 starts in segment 2 and runs on into 3: the whole of it
    // is placed under the first.
    expect(placement?.segmentNs).toEqual([1, 2, 3]);
    expect(placement?.identity).toBe(1);

    expect(
      placeParagraphsInSegments(
        [hebrewWords(0, 10), hebrewWords(10, 20)],
        [segment(7, hebrewWords(0, 20))],
      )?.segmentNs,
    ).toEqual([7, 7]);
  });

  it("matches on Hebrew letters alone, so numerals, punctuation and niqqud do not matter", () => {
    const placement = placeParagraphsInSegments(
      ["א) בְּרֵאשִׁית, ברא; (1)"],
      [segment(1, "א) <b>בראשית</b> ברא")],
    );

    expect(placement?.segmentNs).toEqual([1]);
  });

  it("tolerates a stray word but not a different text", () => {
    const text = hebrewWords(0, 400);
    const withStray = text.replace(hebrewWord(50), "שונה");
    const near = placeParagraphsInSegments(
      [hebrewWords(0, 200), hebrewWords(200, 400)],
      [segment(1, withStray)],
    );
    expect(near?.segmentNs).toEqual([1, 1]);
    expect(near?.identity).toBeCloseTo(399 / 400);

    const different = placeParagraphsInSegments(
      [hebrewWords(0, 200), hebrewWords(200, 400)],
      [segment(1, hebrewWords(0, 360) + " " + hebrewWords(1000, 1040))],
    );
    expect(different).toBeUndefined();
  });

  it("seats a paragraph with no Hebrew words beside its neighbour", () => {
    const segments = [
      segment(1, hebrewWords(0, 10)),
      segment(2, hebrewWords(10, 20)),
    ];

    expect(
      placeParagraphsInSegments(
        [hebrewWords(0, 10), "***", hebrewWords(10, 20)],
        segments,
      )?.segmentNs,
    ).toEqual([1, 1, 2]);
    expect(
      placeParagraphsInSegments(
        ["***", hebrewWords(0, 10), hebrewWords(10, 20)],
        segments,
      )?.segmentNs,
    ).toEqual([1, 1, 2]);
  });
});

describe("alignSectionParagraphs", () => {
  const shape = (beads: ReturnType<typeof alignSectionParagraphs>): string[] =>
    beads.map(
      (bead) =>
        `${bead.hebrew}:${bead.translated}@${bead.hebrewAt}/${bead.translatedAt}`,
    );

  it("pairs paragraphs one to one while their lengths keep the section's ratio", () => {
    expect(
      shape(alignSectionParagraphs([100, 200, 150], [150, 300, 225])),
    ).toEqual(["1:1@0/0", "1:1@1/1", "1:1@2/2"]);
  });

  it("merges two Hebrew paragraphs into one translated paragraph when the lengths say so", () => {
    expect(shape(alignSectionParagraphs([100, 100], [300]))).toEqual([
      "2:1@0/0",
    ]);
  });

  it("splits one Hebrew paragraph over two translated ones", () => {
    expect(shape(alignSectionParagraphs([200], [150, 150]))).toEqual([
      "1:2@0/0",
    ]);
  });

  it("merges three Hebrew paragraphs into one when that is the only fit", () => {
    expect(shape(alignSectionParagraphs([100, 100, 100], [450]))).toEqual([
      "3:1@0/0",
    ]);
  });

  it("leaves Hebrew without translation once the widest merge is spent", () => {
    // No bead takes more than three Hebrew paragraphs for one translated one.
    const tally = shape(
      alignSectionParagraphs([100, 100, 100, 100, 100], [500]),
    )
      .map((bead) => bead.split("@")[0])
      .sort();

    expect(tally).toEqual(["1:0", "1:0", "3:1"]);
  });

  it("leaves translation without Hebrew once the widest split is spent", () => {
    const tally = shape(
      alignSectionParagraphs([100], [100, 100, 100, 100, 100]),
    )
      .map((bead) => bead.split("@")[0])
      .sort();

    expect(tally).toEqual(["0:1", "0:1", "1:3"]);
  });

  it("returns beads that tile both sequences without a gap", () => {
    const beads = alignSectionParagraphs(
      [30, 400, 80, 80, 90],
      [60, 700, 150, 20],
    );
    let hebrew = 0;
    let translated = 0;
    for (const bead of beads) {
      expect(bead.hebrewAt).toBe(hebrew);
      expect(bead.translatedAt).toBe(translated);
      hebrew += bead.hebrew;
      translated += bead.translated;
    }
    expect([hebrew, translated]).toEqual([5, 4]);
  });
});

describe("buildKmHebrewReference", () => {
  it("places the Hebrew document's paragraphs in our segments, section by section", () => {
    const fixture = buildFixture({ 5: { cuts: [2] } });
    const reference = referenceOf(fixture);

    expect(reference.sections).toHaveLength(155);
    expect(reference.identity).toBe(1);
    // Section 5's two paragraphs share one of our segments.
    const [four, five] = [
      reference.sections.find((section) => section.number === 4),
      reference.sections.find((section) => section.number === 5),
    ];
    expect(five?.paragraphs.map((p) => p.segmentN)).toEqual([
      (four?.paragraphs.at(-1)?.segmentN as number) + 1,
      (four?.paragraphs.at(-1)?.segmentN as number) + 1,
    ]);
  });

  it("refuses a Hebrew document with a section missing", () => {
    const fixture = buildFixture();
    const result = buildKmHebrewReference(
      fixture.hebrewHtml.replace(
        `<p>\n  ${bareHebrewOrdinal(50)})\n  `,
        "<p>\n  ",
      ),
      fixture.segments,
    );

    expect(result).toMatchObject({
      ok: false,
      status: "structure-unsupported",
    });
    expect(result.ok ? "" : result.reason).toContain(
      "Hebrew document: found 49 of 155 numbered sections — section 50 never opens",
    );
  });

  it("refuses a Hebrew document that is not the text our segments hold", () => {
    const fixture = buildFixture();
    const changed = fixture.segments.map((segment, index) =>
      index % 10 === 0
        ? { ...segment, html: segment.html.replace(/\S+/g, "שונה") }
        : segment,
    );

    expect(buildKmHebrewReference(fixture.hebrewHtml, changed)).toMatchObject({
      ok: false,
      status: "unmatched",
      reason: expect.stringContaining("fewer than 99% of its words"),
    });
  });
});

describe("alignKmIntroduction", () => {
  it("seats each translated paragraph in the segment of its Hebrew paragraph", () => {
    const fixture = buildFixture();
    const result = imported(importOf(fixture));

    expect(result.beads).toEqual({ "1:1": 310 });
    expect(result.paragraphs).toBe(310);
    expect(result.segments).toHaveLength(310);
    expect(result.segments[0]).toEqual({
      n: 1,
      sefariaRef: "Introduction 1",
      html: `1) S1P1 ${filler(11)}`,
      anchors: [],
    });
    // The editor's note between 70 and 72 is no paragraph of either.
    expect(segmentWith(result.segments, "S70P2")?.n).toBe(
      fixture.segmentsOf.get(70)?.[1],
    );
    expect(segmentWith(result.segments, "72) S72P1")?.n).toBe(
      fixture.segmentsOf.get(72)?.[0],
    );
    expect(result.segments.map((segment) => segment.n)).toEqual(
      [...fixture.segmentsOf.values()].flat(),
    );
  });

  it("reads `N.` openers as it reads `N)`", () => {
    const fixture = buildFixture();
    const parens = imported(importOf(fixture));
    const dots = imported(importOf(fixture, fixture.translationHtml("dot")));

    expect(dots.beads).toEqual(parens.beads);
    expect(dots.segments.map((segment) => segment.html)).toEqual(
      parens.segments.map((segment) => segment.html.replace(/^(\d+)\)/, "$1.")),
    );
  });

  it("prints back the number Portuguese only shows as list numbering, and takes its stray 71 for a paragraph", () => {
    const fixture = buildFixture();
    const result = imported(importOf(fixture, fixture.translationHtml("list")));

    expect(result.beads).toEqual({ "1:1": 310 });
    expect(segmentWith(result.segments, "S5P1")?.html).toMatch(/^5\. S5P1/);
    // Section 70's second paragraph is list item 71 in the document; there is no section 71.
    expect(segmentWith(result.segments, "S70P2")?.html).toMatch(/^S70P2/);
    expect(segmentWith(result.segments, "S72P1")?.html).toMatch(/^72\. S72P1/);
  });

  it("does not take a numbered paragraph or a list item inside a section for the next section", () => {
    const fixture = buildFixture();
    const html = fixture
      .translationHtml()
      .replace("S20P2", "3. S20P2")
      .replace(/<p>\s+S30P2/, '<ol type="1"><li><p>\n  S30P2')
      .replace(/(S30P2[\s\S]*?<\/p>)/, "$1</li></ol>");
    const result = imported(importOf(fixture, html));

    expect(result.beads).toEqual({ "1:1": 310 });
    expect(segmentWith(result.segments, "3. S20P2")?.n).toBe(
      fixture.segmentsOf.get(20)?.[1],
    );
    expect(segmentWith(result.segments, "S30P2")?.n).toBe(
      fixture.segmentsOf.get(30)?.[1],
    );
  });

  it("joins the paragraphs that land in one segment, and leaves a segment with nothing absent", () => {
    // Section 5: our segment 9 holds both Hebrew paragraphs. Section 6: three
    // Hebrew paragraphs but two translated, the second as long as the last two.
    const fixture = buildFixture({
      5: { cuts: [2] },
      6: { hebrew: [8, 12, 12], translated: [12, 36] },
    });
    const result = imported(importOf(fixture));

    const five = fixture.segmentsOf.get(5) as number[];
    expect(five).toHaveLength(1);
    expect(result.segments.find((s) => s.n === five[0])?.html).toBe(
      `<span class="tes-para">5) S5P1 ${filler(11)}</span><span class="tes-para">S5P2 ${filler(17)}</span>`,
    );

    const six = fixture.segmentsOf.get(6) as number[];
    expect(result.beads["2:1"]).toBe(1);
    expect(result.segments.some((s) => s.n === six[0])).toBe(true);
    expect(result.segments.some((s) => s.n === six[1])).toBe(true);
    expect(result.segments.some((s) => s.n === six[2])).toBe(false);
  });

  it("attaches translation that has no Hebrew of its own to the segment before it", () => {
    // Section 30: one Hebrew paragraph against five translated ones. It takes
    // three (the widest split); the last two, too short to be anyone's, belong
    // to what came before them, not to section 31 that follows.
    const fixture = buildFixture({
      30: { hebrew: [10], translated: [5, 5, 5, 2, 2] },
    });
    const result = imported(importOf(fixture));

    expect(result.beads["1:3"]).toBe(1);
    expect(result.beads["0:1"]).toBe(2);
    const thirty = fixture.segmentsOf.get(30) as number[];
    const labels = [
      ...(result.segments.find((s) => s.n === thirty[0])?.html ?? "").matchAll(
        /S30P\d/g,
      ),
    ].map((match) => match[0]);
    expect(labels).toEqual(["S30P1", "S30P2", "S30P3", "S30P4", "S30P5"]);
  });

  it("keeps translation that opens a section with no Hebrew of its own inside that section", () => {
    // Russian 129: an opening sentence and three one-line list items, then the
    // long remainder, all for the one Hebrew paragraph. The sentence and the
    // first item are unpaired, and must not slip into section 29's last segment.
    const fixture = buildFixture({
      30: { hebrew: [40], translated: [20, 2, 2, 2, 35] },
    });
    const result = imported(importOf(fixture));

    expect(result.beads["0:1"]).toBe(2);
    expect(result.beads["1:3"]).toBe(1);
    const labelsIn = (n: number | undefined): string[] =>
      [
        ...(result.segments.find((s) => s.n === n)?.html ?? "").matchAll(
          /S30P\d/g,
        ),
      ].map((match) => match[0]);
    expect(labelsIn(fixture.segmentsOf.get(29)?.at(-1))).toEqual([]);
    expect(labelsIn(fixture.segmentsOf.get(30)?.[0])).toEqual([
      "S30P1",
      "S30P2",
      "S30P3",
      "S30P4",
      "S30P5",
    ]);
  });

  it("turns a footnote into the tooltip the reader shows, and counts no paragraph for it", () => {
    const fixture = buildFixture();
    const html =
      fixture
        .translationHtml()
        .replace(
          "S3P1\n  lorem",
          'S3P1\n  lorem<a href="#fn1"\n  class="footnote-ref"\n  id="fnref1"><sup>1</sup></a>',
        ) +
      '\n<section class="footnotes"><hr><ol><li id="fn1"><p>See\n  "PARDESS"\n  &amp; more.<a href="#fnref1" class="footnote-back">↩</a></p></li></ol></section>';
    const result = imported(importOf(fixture, html));

    expect(result.paragraphs).toBe(310);
    expect(result.beads).toEqual({ "1:1": 310 });
    expect(segmentWith(result.segments, "S3P1")?.html).toContain(
      '<span class="tes-footnote" title="See &quot;PARDESS&quot; &amp; more.">*</span>',
    );
    expect(JSON.stringify(result.segments)).not.toContain("footnote-back");
  });

  it("accepts a section under half as long as usual, as the Zohar's Aramaic sections are", () => {
    // The real Russian and Turkish section 31 measure 0.4977 and 0.4954 of
    // their median: the Hebrew prints the Aramaic AND its gloss, they only
    // the meaning. This one is 0.44.
    const fixture = buildFixture({ 31: { translated: [5, 8] } });

    expect(importOf(fixture).ok).toBe(true);
  });

  it("places an abridged section whole under its first segment, with a warning, and skips the DP for it", () => {
    // Section 40: four Hebrew paragraphs, but a translation under half as long.
    const fixture = buildFixture({
      40: { hebrew: [8, 8, 8, 8], translated: [3, 3, 3] },
    });
    const result = imported(importOf(fixture));

    const forty = fixture.segmentsOf.get(40) as number[];
    expect(result.segments.find((s) => s.n === forty[0])?.html).toMatch(
      /^<span class="tes-para">40\) S40P1 .*<\/span><span class="tes-para">S40P2 .*<\/span><span class="tes-para">S40P3 .*<\/span>$/,
    );
    for (const n of forty.slice(1)) {
      expect(result.segments.some((s) => s.n === n)).toBe(false);
    }
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("section 40 is abridged");
    // The abridged section pairs nothing: no bead, no untranslated Hebrew.
    expect(result.beads["1:0"]).toBeUndefined();
  });

  describe("refuses", () => {
    it("a document whose sections do not run 1 to 156 without 71 — including one with no paragraph of its own", () => {
      const fixture = buildFixture();

      expect(
        importOf(
          fixture,
          fixture.translationHtml().replace(/100\)\s+S100P1/, "S100P1"),
        ),
      ).toEqual({
        ok: false,
        status: "structure-unsupported",
        reason: "found 98 of 155 numbered sections — section 100 never opens",
      });
      // A section left out altogether is the same refusal: the next opener is
      // not the number expected, so nothing after it is recognised.
      expect(
        importOf(
          fixture,
          fixture
            .translationHtml()
            .replace(
              /<p>\s+100\)\s+S100P1[\s\S]*?<\/p>\s*<p>\s+S100P2[\s\S]*?<\/p>/,
              "",
            ),
        ),
      ).toMatchObject({ ok: false, status: "structure-unsupported" });
    });

    it("a section far longer than its Hebrew: duplicated or misnumbered text", () => {
      const result = importOf(buildFixture({ 40: { translated: [150, 200] } }));

      expect(result).toMatchObject({ ok: false, status: "unmatched" });
      expect(result.ok ? "" : result.reason).toMatch(
        /longer than 2× this language's median — sections 40 \(\d+\.\d\d×\)/,
      );
    });

    it("a language whose Hebrew is left without translation beyond 5% of its paragraphs", () => {
      // Six Hebrew paragraphs against one translated: the widest bead merges
      // three, so each such section leaves three Hebrew paragraphs bare.
      const bare = { hebrew: [8, 8, 8, 8, 8, 8], translated: [72] };
      const many = Object.fromEntries(
        [41, 42, 43, 44, 45, 46, 47, 48].map((section) => [section, bare]),
      );

      const refused = importOf(buildFixture(many));
      expect(refused).toMatchObject({ ok: false, status: "unmatched" });
      expect(refused.ok ? "" : refused.reason).toContain(
        "24 of 342 Hebrew paragraphs have no translated counterpart",
      );

      // One such section is 3 of 314 paragraphs: well inside the allowance.
      const few = imported(importOf(buildFixture({ 41: bare })));
      expect(few.beads["1:0"]).toBe(3);
      expect(few.beads["3:1"]).toBe(1);
    });

    it("every language when the Hebrew document is not our Hebrew", () => {
      const fixture = buildFixture();
      const other = buildFixture({ 3: { hebrew: [8, 400] } });

      expect(
        buildKmHebrewReference(other.hebrewHtml, fixture.segments),
      ).toMatchObject({ ok: false, status: "unmatched" });
    });
  });
});
