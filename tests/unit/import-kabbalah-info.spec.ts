import { describe, expect, it } from "vitest";
import type { CommentaryItem, SourceSegment } from "~~/shared/types/content";
import {
  alignKiChapterPage,
  dropLeakedHeadings,
} from "../../scripts/lib/ki-chapter-page.ts";
import {
  alignObservation,
  kiObservationUnitHtml,
  parseKiObservationUnits,
  splitIntoRuns,
} from "../../scripts/lib/ki-inner-observation.ts";
import {
  classifyKiPage,
  parseKiBlocks,
  parseKiToc,
} from "../../scripts/lib/ki-page.ts";
import {
  alignQaEntries,
  kiQaEntryHtml,
  parseKiQaTable,
  questionsWithoutEcho,
} from "../../scripts/lib/ki-qa.ts";
import {
  acceptedPairs,
  alignBySimilarity,
} from "../../scripts/lib/ki-similarity-align.ts";
import {
  alignWholePartCommentary,
  alignWholePartSource,
} from "../../scripts/lib/ki-whole-part-align.ts";
import {
  kiDibburHtml,
  parseKiWholePart,
  truncateAtRepeatedText,
} from "../../scripts/lib/ki-whole-part.ts";
import { parseKmArgs } from "../../scripts/lib/km-cli.ts";

const page = (body: string): string =>
  `<html><body><nav>Table of content</nav><div class="body-read__content">${body}</div><script>window.bookData = {}</script><footer><li>Download The Zohar</li></footer></body></html>`;

describe("parseKiBlocks", () => {
  it("reads the article body only, stopping before the page script", () => {
    const blocks = parseKiBlocks(
      page("<p><strong>1. Seif</strong></p><p>Body</p>"),
    );
    expect(blocks.map((block) => block.text)).toEqual(["1. Seif", "Body"]);
  });

  it("treats a block as bold despite a marker or a split word outside the run", () => {
    const [block] = parseKiBlocks(
      page(
        "<h5><strong>2. When it arose in His simple will <sub>(30)</sub> to bring the perfect</strong>i<strong>on of His deeds to light.</strong></h5>",
      ),
    );
    expect(block?.bold).toBe(true);
  });

  it("does not treat a heading-plus-body note paragraph as bold", () => {
    const [block] = parseKiBlocks(
      page(
        "<p><strong>30. Arose in His simple will:</strong> We need not wonder how there is a desire in Ein Sof.</p>",
      ),
    );
    expect(block?.bold).toBe(false);
  });

  it("decodes entities and turns non-breaking spaces into spaces", () => {
    const [block] = parseKiBlocks(page("<p>He&#8217;arah&nbsp;&amp; Ohr</p>"));
    expect(block?.text).toBe("He’arah & Ohr");
  });
});

describe("parseKiToc / classifyKiPage", () => {
  const toc = parseKiToc(
    `<div>Table of content<a href="https://x/a/">The Study of the Ten Sefirot</a><a href="https://x/b/">Part 4- Chapter Four</a><a href="https://x/c/">Part 2 - Inner Observation</a><a href="https://x/d/">Part 7 - The Seven Melachim that Died</a><a href="https://x/e/">Part 4 - Table of Questions and for the Meaning of the Words</a><a href="https://x/b/">Part 4- Chapter Four</a></div><div class="body-read__content"></div>`,
  );

  it("keeps Part entries once each, in order", () => {
    expect(toc.map((entry) => entry.title)).toEqual([
      "Part 4- Chapter Four",
      "Part 2 - Inner Observation",
      "Part 7 - The Seven Melachim that Died",
      "Part 4 - Table of Questions and for the Meaning of the Words",
    ]);
  });

  it("classifies irregular titles by keyword", () => {
    expect(
      toc.map(classifyKiPage).map((ref) => [ref?.kind, ref?.chapter]),
    ).toEqual([
      ["chapter", 4],
      ["inner-observation", undefined],
      ["whole-part", undefined],
      ["qa-terminology", undefined],
    ]);
  });
});

const heItem = (
  order: number,
  he: string,
  en: string,
  targetSeif: number,
): CommentaryItem => ({
  anchorId: `op-${order}`,
  order,
  label: { he, en },
  sefariaRef: `Ohr Penimi 1:1:${order}`,
  targetSeif,
  section: "ohr-pnimi",
  html: "<b>כותרת:</b> טקסט עברי ארוך מספיק כדי שהיחס יהיה סביר",
});

const heSeif = (n: number, anchors: string[], length = 60): SourceSegment => ({
  n,
  sefariaRef: `Section 1:${n}`,
  html: "א".repeat(length),
  anchors,
});

describe("alignKiChapterPage", () => {
  const hebrew = [heSeif(1, ["op-1", "op-2"]), heSeif(2, ["op-3"])];
  const items = [
    heItem(1, "א", "1", 1),
    heItem(2, "ב", "2", 1),
    heItem(3, "ג", "3", 2),
  ];
  const seifText = (n: number, markers: string): string =>
    `${n}. The Ari's words for this seif ${markers} running long enough to be a real translation of it.`;

  it("skips a numbered synopsis and aligns seifim and notes to the Hebrew", () => {
    const blocks = parseKiBlocks(
      page(
        [
          "<p><strong>1. Synopsis line one.</strong></p>",
          "<p><strong>2. Synopsis line two.</strong></p>",
          "<h4><strong>A heading</strong></h4>",
          `<h5><strong>${seifText(1, "(1) and (2)")}</strong></h5>`,
          "<h6><strong>Inner Light</strong></h6>",
          "<p><strong>1. First words:</strong> First note.</p>",
          "<p><strong>2. Second words:</strong> Second note.</p>",
          "<p>Second note, continued.</p>",
          "<h4><strong>Another heading</strong></h4>",
          `<h5>${seifText(2, "(3)")}</h5>`,
          "<h6><strong>Inner Light</strong></h6>",
          "<p><strong>3. Third words:</strong> Third note.</p>",
        ].join(""),
      ),
    );
    const result = alignKiChapterPage(blocks, hebrew, items);

    expect(result.problems).toEqual([]);
    expect(result.segments.map((s) => s.anchors)).toEqual([
      ["op-1", "op-2"],
      ["op-3"],
    ]);
    expect(result.segments[0]?.html).toContain(
      '<a class="tes-anchor" href="#op-1" data-anchor="op-1">1</a>',
    );
    expect(result.segments[0]?.html).not.toContain("<strong>");
    expect(result.items.map((item) => item.html)).toEqual([
      "<strong>First words:</strong> First note.",
      '<span class="tes-para"><strong>Second words:</strong> Second note.</span><span class="tes-para">Second note, continued.</span>',
      "<strong>Third words:</strong> Third note.",
    ]);
  });

  it("matches a numeral that repeats after the alphabet restarts to the later note", () => {
    const many = [heSeif(1, ["op-1", "op-2"])];
    const restarting = [heItem(1, "א", "1", 1), heItem(2, "א", "1", 1)];
    const blocks = parseKiBlocks(
      page(
        [
          `<p><strong>${seifText(1, "(1) then (1)")}</strong></p>`,
          "<p><strong>Inner Light</strong></p>",
          "<p>1. Earlier note.</p>",
          "<p>1. Later note.</p>",
        ].join(""),
      ),
    );
    const result = alignKiChapterPage(blocks, many, restarting);

    expect(result.problems).toEqual([]);
    expect(result.segments[0]?.anchors).toEqual(["op-1", "op-2"]);
    expect(result.items.map((item) => item.anchorId)).toEqual(["op-1", "op-2"]);
  });

  it("reports an incomplete match instead of producing a partial chapter silently", () => {
    const blocks = parseKiBlocks(
      page(`<p><strong>${seifText(1, "(1) and (2)")}</strong></p>`),
    );
    const result = alignKiChapterPage(blocks, hebrew, items);
    expect(result.problems.join(" ")).toContain("matched 1 of 2 Hebrew seifim");
    expect(result.problems.join(" ")).toContain("matched 0 of 3 Hebrew items");
  });

  it("refuses a chapter whose Hebrew notes are unanchored", () => {
    const { anchorId, order, label, section, html } = heItem(1, "א", "1", 1);
    const result = alignKiChapterPage([], hebrew, [
      { anchorId, order, label, section, html },
    ]);
    expect(result.problems).toEqual(["Hebrew commentary has unanchored items"]);
  });
});

describe("parseKiWholePart", () => {
  const blocks = parseKiBlocks(
    page(
      [
        "<p><strong>42.* Know that the first seif begins here.</strong></p>",
        "<p><strong>And continues in a second bold paragraph.</strong></p>",
        "<p><strong>42. Quoted words of the first note.</strong></p>",
        "<p>Body of the first note.</p>",
        "<p><strong>43. The second seif.</strong></p>",
        "<p><em>Ohr Pnimi</em></p>",
        "<h5>43. Quoted words.</h5>",
        "<p>Its body.</p>",
        "<p><strong>More quoted words.</strong></p>",
        "<p>Second body.</p>",
      ].join(""),
    ),
  );
  const { seifim, unplaced } = parseKiWholePart(blocks);

  it("starts at the page's first seif and keeps seifim consecutive", () => {
    expect(seifim.map((seif) => seif.n)).toEqual([42, 43]);
    expect(unplaced).toEqual([]);
  });

  it("reads a repeated seif numeral as the start of its notes, marker or not", () => {
    expect(seifim[0]?.paragraphs).toHaveLength(2);
    expect(seifim[0]?.dibburim.map(kiDibburHtml)).toEqual([
      "<strong>Quoted words of the first note.</strong> Body of the first note.",
    ]);
  });

  it("opens a note at every heading, bold or h5", () => {
    expect(seifim[1]?.dibburim.map((d) => d.headHtml)).toEqual([
      "Quoted words.",
      "More quoted words.",
    ]);
  });
});

describe("truncateAtRepeatedText", () => {
  it("cuts at the first seif whose note the page prints again", () => {
    const seif = (n: number, text: string, head: string) => ({
      n,
      paragraphs: [text],
      dibburim: [{ seif: n, headHtml: head, bodyHtml: [] }],
    });
    const { kept, cutAt } = truncateAtRepeatedText([
      seif(
        1,
        "The first seif's own text, long enough.",
        "First note heading here",
      ),
      seif(
        2,
        "The second seif's own text, long enough.",
        "A placeholder heading text",
      ),
      seif(
        3,
        "The third seif's own text, long enough.",
        "A placeholder heading text",
      ),
    ]);
    expect(cutAt).toBe(2);
    expect(kept.map((s) => s.n)).toEqual([1]);
  });
});

describe("alignBySimilarity / acceptedPairs", () => {
  it("pairs units with their reference in order and skips an extra unit", () => {
    const targets = [
      "The shells cling to Zeir Anpin and Nukva alone",
      "Aba and Ima were face to face from the beginning",
      "The seven kings died and fell to Beria",
    ];
    const units = [
      "The Klipot cling solely to Zeir Anpin and Nukva",
      "An inserted unrelated sentence about walking dogs",
      "Aba and Ima were Panim be Panim from the beginning",
      "The seven Melachim died and fell to Beria",
    ];
    const steps = alignBySimilarity(targets, units);
    expect([...acceptedPairs(steps)]).toEqual([
      [0, 0],
      [1, 2],
      [2, 3],
    ]);
  });

  it("never pairs a target that has no reference", () => {
    const steps = alignBySimilarity([null], ["anything at all"]);
    expect(acceptedPairs(steps).size).toBe(0);
  });
});

describe("alignWholePartCommentary", () => {
  const he = (order: number): CommentaryItem => ({
    anchorId: `op-${order}`,
    order,
    label: { he: String(order), en: String(order) },
    section: "ohr-pnimi",
    html: "ע".repeat(40),
  });
  const seifim = [
    {
      n: 1,
      paragraphs: ["Seif one."],
      dibburim: [
        {
          seif: 1,
          headHtml: "Zeir Anpin receives Mochin",
          bodyHtml: ["from Aba and Ima through the Yesod of Ima."],
        },
      ],
    },
    {
      n: 2,
      paragraphs: ["Seif two."],
      dibburim: [
        {
          seif: 2,
          headHtml: "The Klipot cling to the Achoraim",
          bodyHtml: ["of Zeir Anpin and not above, as explained."],
        },
      ],
    },
  ];

  it("places notes by structure where the chapter has no en-ai", () => {
    const verdicts = alignWholePartCommentary(
      [
        { chapter: 1, heItems: [he(1)], aiItems: null },
        { chapter: 2, heItems: [he(1)], aiItems: null },
      ],
      seifim,
    );
    expect(verdicts.get(2)).toMatchObject({
      status: "imported",
      items: [{ anchorId: "op-1" }],
    });
  });

  it("refuses a chapter whose en-ai does not vouch for the structural note", () => {
    const ai = (html: string): CommentaryItem => ({ ...he(1), html });
    const verdicts = alignWholePartCommentary(
      [
        {
          chapter: 1,
          heItems: [he(1)],
          aiItems: [ai("The shells cling to the posterior of Zeir Anpin")],
        },
        {
          chapter: 2,
          heItems: [he(1)],
          aiItems: [ai("Zeir Anpin receives Mochin from Aba and Ima Yesod")],
        },
      ],
      seifim,
    );
    expect(verdicts.get(1)?.status).toBe("refused");
    expect(verdicts.get(2)?.status).toBe("refused");
  });
});

describe("alignWholePartSource", () => {
  const seifim = [
    { n: 1, paragraphs: ["x".repeat(60)], dibburim: [] },
    { n: 2, paragraphs: ["y".repeat(5)], dibburim: [] },
  ];
  const verdicts = alignWholePartSource(
    [
      { chapter: 1, heSegments: [heSeif(1, [], 40)] },
      { chapter: 2, heSegments: [heSeif(1, [], 40)] },
    ],
    seifim,
  );

  it("writes seif K to chapter K with the Hebrew's ref", () => {
    expect(verdicts.get(1)).toMatchObject({
      status: "imported",
      items: [{ n: 1, sefariaRef: "Section 1:1", anchors: [] }],
    });
  });

  it("refuses a seif implausibly short for its Hebrew", () => {
    expect(verdicts.get(2)?.status).toBe("refused");
  });
});

describe("parseKmArgs scriptName", () => {
  it("names the calling importer in the usage error", () => {
    expect(() => parseKmArgs([], "import-kabbalah-info")).toThrow(
      "Usage: import-kabbalah-info",
    );
  });
});

describe("Inner Observation", () => {
  const segment = (n: number, length: number): SourceSegment => ({
    n,
    html: "א".repeat(length),
    anchors: [],
  });
  const blocks = parseKiBlocks(
    page(
      [
        "<h3><strong>Chapter One</strong></h3>",
        "<h5><strong>Circles are regarded as GAR.</strong></h5>",
        "<p>1. The ARI spoke very little of the circles of the Sefirot and Ein Sof.</p>",
        "<p>Conversely the restriction of the vessel shows the circles plainly.</p>",
        "<h5><strong>Straightness is more internal.</strong></h5>",
        "<p>2. In straightness the internal line is more important than the circle.</p>",
      ].join(""),
    ),
  );

  it("splits the page at item numerals, headings travelling with the next item", () => {
    const units = parseKiObservationUnits(blocks);
    expect(units.map((u) => u.n)).toEqual([1, 2]);
    expect(units[0]?.preamble.map((b) => b.text)).toEqual([
      "Chapter One",
      "Circles are regarded as GAR.",
    ]);
    expect(kiObservationUnitHtml(units[1] as (typeof units)[number])).toBe(
      '<span class="tes-para"><small>Straightness is more internal.</small></span><span class="tes-para">In straightness the internal line is more important than the circle.</span>',
    );
  });

  it("pairs items with segments one-to-one and checks each against its neighbours", () => {
    const targets = [
      {
        chapterId: "part-02/inner-observation-01",
        segment: segment(1, 70),
        reference:
          "The ARI spoke little of the circles, Ein Sof and restriction",
      },
      {
        chapterId: "part-02/inner-observation-01",
        segment: segment(2, 50),
        reference: "In straightness the internal line is more important",
      },
    ];
    const [verdict] = alignObservation(
      targets,
      parseKiObservationUnits(blocks),
    );
    expect(verdict?.status).toBe("imported");
    expect(verdict?.segments.map((s) => s.n)).toEqual([1, 2]);
  });

  it("moves a plain sub-heading to the item the Hebrew opens with it", () => {
    const plainSubtitles = parseKiBlocks(
      page(
        [
          "<p>1) The first item speaks of the manna and of bestowal at length.</p>",
          "<p>How the soul is a part of Godliness</p>",
          "<p>2) The soul is a part of Godliness above, as the Kabbalists wrote.</p>",
        ].join(""),
      ),
    );
    const [verdict] = alignObservation(
      [
        {
          chapterId: "part-01/inner-observation-01",
          segment: segment(1, 40),
          reference: "The first item: the manna and bestowal",
        },
        {
          chapterId: "part-01/inner-observation-01",
          segment: {
            ...segment(2, 40),
            html: `<small>כותרת</small><br>${"א".repeat(40)}`,
          },
          reference:
            "How the soul is a part of Godliness: the soul, as the Kabbalists wrote",
        },
      ],
      parseKiObservationUnits(plainSubtitles),
    );
    expect(verdict?.status).toBe("imported");
    expect(verdict?.segments.map((s) => s.html)).toEqual([
      "The first item speaks of the manna and of bestowal at length.",
      '<span class="tes-para"><small>How the soul is a part of Godliness</small></span><span class="tes-para">The soul is a part of Godliness above, as the Kabbalists wrote.</span>',
    ]);
  });

  it("refuses one-to-one pairing when the counts differ", () => {
    const [verdict] = alignObservation(
      [
        {
          chapterId: "part-02/inner-observation-01",
          segment: segment(1, 70),
          reference: "x",
        },
      ],
      parseKiObservationUnits(blocks),
    );
    expect(verdict?.reason).toContain("page has 2 items");
  });

  it("splits blocks into one run per segment by similarity", () => {
    const starts = splitIntoRuns(blocks, [
      "Circles GAR: the ARI spoke little of the circles and Ein Sof; the restriction shows the circles",
      "Straightness internal: in straightness the internal line is more important",
    ]);
    expect(starts).toEqual([0, 4]);
  });

  it("classifies the Cause and Consequence essay apart from its Q&A", () => {
    const kinds = [
      "Part 6 - Cause and Consequence",
      "Part 6 - Questions Regarding Cause and Consequence",
    ].map((title) => classifyKiPage({ url: "u", title })?.kind);
    expect(kinds).toEqual(["cause-and-consequence", "other"]);
  });
});

describe("Q&A tables", () => {
  const he = (n: number): SourceSegment => ({
    n,
    sefariaRef: `Answers ${n}:1`,
    html: "ת".repeat(120),
    anchors: [],
  });
  const answers = [
    "<strong>67. What is Ohr Makif?</strong>The surrounding light that the vessel cannot receive shines from afar on its outside.",
    "<strong>68. What is Hizdakchut?</strong>The screen refines from phase four to phase three and the level diminishes.",
    "<strong>69. What is Zivug?</strong>The coupling by striking of the upper light on the screen raises reflected light.",
  ];
  const listPage = parseKiBlocks(
    page(
      [
        "<p>67. What is Ohr Makif?</p>",
        "<p>68. What is Hizdakchut?</p>",
        "<p>69. What is Zivug?</p>",
        ...answers.map((a) => `<p>${a}</p>`),
      ].join(""),
    ),
  );
  const references = [
    "Surrounding light: the light the vessel cannot receive shines on its outside from afar",
    "Refinement: the screen refines from phase four to phase three, the level diminishes",
    "Coupling: the upper light strikes the screen and reflected light rises",
  ];

  it("reads a list-shaped table, numbered past the Hebrew's own numbering", () => {
    const table = parseKiQaTable(listPage);
    expect(table?.shape).toBe("list");
    expect(table?.questions.map((q) => q.number)).toEqual([67, 68, 69]);
    expect(table?.answers.map((a) => a.number)).toEqual([67, 68, 69]);
    expect(questionsWithoutEcho(table as NonNullable<typeof table>)).toEqual(
      [],
    );
  });

  it("pairs answers by position with the first segment's ref", () => {
    const table = parseKiQaTable(listPage) as NonNullable<
      ReturnType<typeof parseKiQaTable>
    >;
    const verdict = alignQaEntries(
      table.answers,
      [1, 2, 3].map((n, i) => ({
        segments: [he(n)],
        reference: references[i] as string,
      })),
      true,
    );
    expect(verdict).toMatchObject({
      status: "imported",
      items: [{ n: 1, sefariaRef: "Answers 1:1" }, { n: 2 }, { n: 3 }],
    });
  });

  it("refuses a table whose answers are out of step for two in a row", () => {
    const table = parseKiQaTable(listPage) as NonNullable<
      ReturnType<typeof parseKiQaTable>
    >;
    const shifted = [references[0], references[2], references[1]];
    const verdict = alignQaEntries(
      table.answers,
      [1, 2, 3].map((n, i) => ({
        segments: [he(n)],
        reference: shifted[i] as string,
      })),
      true,
    );
    expect(verdict.status).toBe("refused");
  });

  it("reads an interleaved table: numbered question, plain answer", () => {
    const table = parseKiQaTable(
      parseKiBlocks(
        page(
          "<p>1. What is light</p><p>Everything that exists as existence.</p><p>2. What is darkness</p><p>Its absence.</p>",
        ),
      ),
    );
    expect(table?.shape).toBe("interleaved");
    expect(table?.answers.map(kiQaEntryHtml)).toEqual([
      "Everything that exists as existence.",
      "Its absence.",
    ]);
  });
});

describe("non-English documents", () => {
  it("reads Russian numerals and markers, and keeps a Cyrillic heading out of the seif", () => {
    const hebrew = [heSeif(1, ["op-1"]), heSeif(2, [])];
    const blocks = parseKiBlocks(
      page(
        [
          "<h3>1) Знай, что (1) прежде, чем были созданы создания, простой высший свет заполнял всю реальность.</h3>",
          "<p> - Ор пними –</p>",
          "<p> (1). Форма духовного времени подробно рассматривается далее.</p>",
          "<p><strong>В высшем свете есть сила десяти сфирот</strong></p>",
          "<h3>2) Когда возникло в Его простом желании создать миры и создания.</h3>",
        ].join(""),
      ),
    );
    const result = alignKiChapterPage(
      blocks,
      hebrew,
      [heItem(1, "א", "1", 1)],
      "ru",
    );
    expect(result.problems).toEqual([]);
    expect(result.segments.map((s) => s.html).join(" ")).not.toContain(
      "В высшем свете",
    );
    expect(result.items[0]?.label).toEqual({ he: "א", en: "1", ru: "1" });
  });
});

describe("dropLeakedHeadings", () => {
  const note = (anchorId: string, html: string): CommentaryItem => ({
    ...heItem(1, "א", "1", 1),
    anchorId,
    html,
  });

  it("drops a last paragraph that reads as the next seif, keeps one that reads as the note", () => {
    const leaked = note(
      "op-1",
      '<span class="tes-para">The screen detains the upper light at the Tabur.</span><span class="tes-para">Between Creator and created there is a median phase.</span>',
    );
    const genuine = note(
      "op-2",
      '<span class="tes-para">The screen detains the upper light.</span><span class="tes-para">This detaining of the light by the screen is the Tabur.</span>',
    );
    const { items, removed } = dropLeakedHeadings(
      [leaked, genuine],
      (item) =>
        item.anchorId === "op-1"
          ? "The screen detains the upper light at the Tabur"
          : "The screen detains the upper light; this detaining is the Tabur",
      () =>
        "A median phase between Creator and created, the spirituality in man",
    );
    expect(removed).toHaveLength(1);
    expect(items[0]?.html).toBe(
      "The screen detains the upper light at the Tabur.",
    );
    expect(items[1]?.html).toBe(genuine.html);
  });
});
