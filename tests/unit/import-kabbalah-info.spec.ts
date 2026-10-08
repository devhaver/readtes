import { describe, expect, it } from "vitest";
import type { CommentaryItem, SourceSegment } from "~~/shared/types/content";
import { alignKiChapterPage } from "../../scripts/lib/ki-chapter-page.ts";
import {
  classifyKiPage,
  parseKiBlocks,
  parseKiToc,
} from "../../scripts/lib/ki-page.ts";
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
      "<strong>Second words:</strong> Second note.<br>Second note, continued.",
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
