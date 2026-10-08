/**
 * Inner Observation (Histaklut Pnimit) pages: Baal HaSulam's own essay, one
 * page per part, aligned to the corpus's `inner-observation-NN` chapters.
 *
 * The page numbers its items — `1.` on most parts, `1)` on part 1 — and
 * Sefaria's Hebrew segments follow the same items in the same order: each
 * Hebrew segment is one item, carrying whatever comes before the item's
 * numeral on the page (the part title, a `Chapter N` heading, the chapter's
 * synopsis, the item's sub-heading — the Hebrew renders that last one as
 * `<small>…</small><br>`). So the page splits at item numerals into units,
 * each unit = the blocks since the previous item + the item's own text,
 * and units pair with Hebrew segments in order.
 *
 * Numbering runs either straight through the part or restarts at each
 * chapter; both are accepted, nothing else is. An item numeral that is out
 * of sequence (an enumeration inside an item: `1. … 2. …`) stays text.
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type { SourceSegment } from "../../shared/types/content.ts";
import { unboldKiHtml } from "./ki-chapter-page.ts";
import type { KiBlock } from "./ki-page.ts";
import { similarityScorer, vectorSpace } from "./ki-similarity-align.ts";

const ITEM_NUMERAL_RE = /^\s*(\d+)\s*[.)](?!\d)\s*/;
const ITEM_NUMERAL_HTML_RE =
  /^((?:\s|<[^>]+>)*)\d(?:(?:<[^>]+>)*\d)*((?:<[^>]+>)*)\s*[.)](?!\d)\s*/;
const CHAPTER_HEADING_RE = /^chapter\s+[a-z]+/i;

export interface KiObservationUnit {
  /** The item numeral as printed. */
  n: number;
  /** Blocks between the previous item and this one (headings, synopsis). */
  preamble: KiBlock[];
  /** The item's own blocks; the first opens with the numeral. */
  body: KiBlock[];
}

export const parseKiObservationUnits = (
  blocks: KiBlock[],
): KiObservationUnit[] => {
  const units: KiObservationUnit[] = [];
  let preamble: KiBlock[] = [];
  let sawChapterHeading = false;

  for (const block of blocks) {
    const match = ITEM_NUMERAL_RE.exec(block.text);
    const n = match ? Number(match[1]) : undefined;
    const last = units.at(-1);
    const opens =
      n !== undefined &&
      ((last === undefined && n === 1) ||
        (last !== undefined &&
          (n === last.n + 1 || (n === 1 && sawChapterHeading))));

    if (opens) {
      units.push({ n: n as number, preamble, body: [block] });
      preamble = [];
      sawChapterHeading = false;
      continue;
    }
    if (CHAPTER_HEADING_RE.test(block.text)) sawChapterHeading = true;

    // A heading belongs to the next item; plain text after an item is its
    // continuation (a plain sub-heading is moved later, by the Hebrew).
    if (last && !isHeadingBlock(block) && preamble.length === 0) {
      last.body.push(block);
    } else {
      preamble.push(block);
    }
  }
  return units;
};

const isHeadingBlock = (block: KiBlock): boolean =>
  block.bold || /^h[1-6]$/.test(block.tag);

interface RenderContext {
  /** Blocks that open an item: their numeral is dropped. */
  itemHeads: Set<KiBlock>;
  /** Plain blocks the Hebrew shows to be sub-headings. */
  subtitles: Set<KiBlock>;
}

const renderBlocks = (blocks: KiBlock[], context: RenderContext): string =>
  sanitizeHtml(
    blocks
      .map((block) => {
        if (isHeadingBlock(block) || context.subtitles.has(block)) {
          return `<small>${unboldKiHtml(block.html)}</small>`;
        }
        return context.itemHeads.has(block)
          ? block.html.replace(ITEM_NUMERAL_HTML_RE, "$1$2").trim()
          : block.html;
      })
      .join("<br>"),
  )
    .replace(/ {2,}/g, " ")
    .replace(/\s*<br>\s*/g, "<br>")
    .trim();

/** One unit as segment HTML: headings as `<small>`, then the item's text. */
export const kiObservationUnitHtml = (unit: KiObservationUnit): string =>
  renderBlocks([...unit.preamble, ...unit.body], {
    itemHeads: new Set([unit.body[0] as KiBlock]),
    subtitles: new Set(),
  });

export interface ObservationTarget {
  chapterId: string;
  segment: SourceSegment;
  /** The segment's `en-ai` html, the reference the pairing is checked against. */
  reference: string | null;
}

export interface ObservationVerdict {
  chapterId: string;
  status: "imported" | "refused";
  segments: SourceSegment[];
  reason?: string;
}

const plainLength = (html: string): number =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim().length;

/** Outside this band a unit is not a translation of its Hebrew segment. */
const SEGMENT_RATIO_BAND = [0.6, 3.5] as const;
/** A pairing must score at least this against its own reference. */
const MIN_SIMILARITY = 0.1;
/** Longest plain paragraph that can be a sub-heading. */
const SUBTITLE_MAX_CHARS = 300;

const opensWithSubtitle = (segment: SourceSegment): boolean =>
  segment.html.trimStart().startsWith("<small>");

/**
 * The Hebrew says which segments open with a sub-heading (`<small>`), and
 * the page's sub-headings sit just before the text they head — so a split
 * one block too early leaves the heading at the end of the previous run.
 * Where a segment should open with a sub-heading and its run does not,
 * the previous run's trailing headings (or, failing those, one short plain
 * paragraph, which is how part 1 sets its sub-headings) move across.
 */
const settleSubtitles = (
  runs: KiBlock[][],
  targets: ObservationTarget[],
  context: RenderContext,
): void => {
  for (let i = 1; i < runs.length; i += 1) {
    const run = runs[i] as KiBlock[];
    const previous = runs[i - 1] as KiBlock[];
    const target = targets[i] as ObservationTarget;
    const first = run[0];
    if (!opensWithSubtitle(target.segment)) continue;
    if (first && (isHeadingBlock(first) || context.subtitles.has(first))) {
      continue;
    }
    const moved: KiBlock[] = [];
    while (previous.length > 1 && isHeadingBlock(previous.at(-1) as KiBlock)) {
      moved.unshift(previous.pop() as KiBlock);
    }
    if (moved.length === 0) {
      const last = previous.at(-1);
      if (
        last &&
        previous.length > 1 &&
        !context.itemHeads.has(last) &&
        last.text.length <= SUBTITLE_MAX_CHARS
      ) {
        previous.pop();
        context.subtitles.add(last);
        moved.push(last);
      }
    }
    run.unshift(...moved);
  }
};

/**
 * Settles sub-headings, renders, and checks every run: plausible length
 * for its Hebrew; opening with a sub-heading exactly where the Hebrew
 * does; and **both edges** reading as its own segment rather than a
 * neighbour's — the first substantial paragraph scores higher against this
 * segment's reference than the previous one's, the last higher than the
 * next one's. A chapter is written whole or not at all.
 */
const finish = (
  targets: ObservationTarget[],
  runs: KiBlock[][],
  context: RenderContext,
): ObservationVerdict[] => {
  settleSubtitles(runs, targets, context);
  const html = runs.map((run) => renderBlocks(run, context));
  const score = similarityScorer([
    ...html,
    ...targets.flatMap((t) => (t.reference ? [t.reference] : [])),
  ]);
  const problems = new Map<string, string>();
  const flag = (chapterId: string, reason: string): void => {
    if (!problems.has(chapterId)) problems.set(chapterId, reason);
  };

  targets.forEach((target, i) => {
    const he = target.segment;
    const rendered = html[i] as string;
    const ratio = plainLength(rendered) / Math.max(1, plainLength(he.html));
    if (ratio < SEGMENT_RATIO_BAND[0] || ratio > SEGMENT_RATIO_BAND[1]) {
      flag(
        target.chapterId,
        `segment ${he.n}: English is ${ratio.toFixed(2)}x its Hebrew`,
      );
      return;
    }
    if (opensWithSubtitle(he) && !rendered.startsWith("<small>")) {
      flag(
        target.chapterId,
        `segment ${he.n}: the Hebrew opens with a sub-heading, the page's text does not`,
      );
      return;
    }
    const own = target.reference;
    if (own === null) return;
    if (score(own, rendered) < MIN_SIMILARITY) {
      flag(target.chapterId, `segment ${he.n}: does not read as its Hebrew`);
      return;
    }
    const body = (runs[i] as KiBlock[]).filter((b) => b.text.length >= 80);
    const first = body[0];
    const last = body.at(-1);
    const previous = targets[i - 1]?.reference;
    const next = targets[i + 1]?.reference;
    if (
      first &&
      previous &&
      score(previous, first.html) > score(own, first.html)
    ) {
      flag(
        target.chapterId,
        `segment ${he.n}: its first paragraph reads as the previous segment's`,
      );
    }
    if (last && next && score(next, last.html) > score(own, last.html)) {
      flag(
        target.chapterId,
        `segment ${he.n}: its last paragraph reads as the next segment's`,
      );
    }
  });

  const chapterIds = [...new Set(targets.map((t) => t.chapterId))];
  return chapterIds.map((chapterId) => {
    const problem = problems.get(chapterId);
    if (problem) {
      return { chapterId, status: "refused", segments: [], reason: problem };
    }
    return {
      chapterId,
      status: "imported",
      segments: targets.flatMap((target, i) =>
        target.chapterId === chapterId
          ? [
              {
                n: target.segment.n,
                ...(target.segment.sefariaRef
                  ? { sefariaRef: target.segment.sefariaRef }
                  : {}),
                html: html[i] as string,
                anchors: [],
              },
            ]
          : [],
      ),
    };
  });
};

const refuseAll = (
  targets: ObservationTarget[],
  reason: string,
): ObservationVerdict[] =>
  [...new Set(targets.map((t) => t.chapterId))].map((chapterId) => ({
    chapterId,
    status: "refused",
    segments: [],
    reason,
  }));

/**
 * Pairs the page's numbered items with Hebrew segments in order — only
 * when the counts are equal, since an item missing on either side shifts
 * every pairing after it.
 */
export const alignObservation = (
  targets: ObservationTarget[],
  units: KiObservationUnit[],
): ObservationVerdict[] => {
  if (units.length !== targets.length) {
    return refuseAll(
      targets,
      `page has ${units.length} items, the Hebrew ${targets.length} segments`,
    );
  }
  return finish(
    targets,
    units.map((unit) => [...unit.preamble, ...unit.body]),
    {
      itemHeads: new Set(units.map((unit) => unit.body[0] as KiBlock)),
      subtitles: new Set(),
    },
  );
};

/** Longest run of blocks one Hebrew segment may take. */
const MAX_RUN = 40;
/** Weight of the length-mismatch penalty against the reference. */
const LENGTH_WEIGHT = 0.25;
/** Bonus for a run that starts where the page itself starts something. */
const BOUNDARY_BONUS = 0.05;

/**
 * Splits `blocks` into `references.length` contiguous runs, one per Hebrew
 * segment, maximizing similarity of each run to its segment's reference
 * text with a penalty for implausible length. Every block is assigned.
 * Returns the start index of each run, or `null` if no split exists.
 */
export const splitIntoRuns = (
  blocks: KiBlock[],
  references: string[],
): number[] | null => {
  const n = references.length;
  const m = blocks.length;
  if (n === 0 || m < n) return null;
  const texts = blocks.map((block) => block.html);
  const space = vectorSpace([...texts, ...references]);
  const blockVectors = texts.map(space.vector);
  const referenceVectors = references.map(space.vector);
  const lengths = blocks.map((block) => block.text.length);
  const refLengths = references.map(plainLength);
  const startsSomething = blocks.map(
    (block) => isHeadingBlock(block) || ITEM_NUMERAL_RE.test(block.text),
  );

  const best: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(Number.NEGATIVE_INFINITY),
  );
  const from: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(-1),
  );
  (best[0] as number[])[0] = 0;

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const base = (best[i] as number[])[j] as number;
      if (base === Number.NEGATIVE_INFINITY) continue;
      // Leave at least one block for each remaining segment.
      const maxEnd = Math.min(m - (n - i - 1), j + MAX_RUN);
      const run = new Map<string, number>();
      let length = 0;
      for (let end = j + 1; end <= maxEnd; end += 1) {
        space.add(run, blockVectors[end - 1] as Map<string, number>);
        length += lengths[end - 1] as number;
        if (i === n - 1 && end !== m) continue;
        const value =
          space.cosine(referenceVectors[i] as Map<string, number>, run) -
          LENGTH_WEIGHT *
            Math.abs(
              Math.log(
                Math.max(1, length) / Math.max(1, refLengths[i] as number),
              ),
            ) +
          (startsSomething[j] ? BOUNDARY_BONUS : 0);
        const row = best[i + 1] as number[];
        if (base + value > (row[end] as number)) {
          row[end] = base + value;
          (from[i + 1] as number[])[end] = j;
        }
      }
    }
  }
  if ((best[n] as number[])[m] === Number.NEGATIVE_INFINITY) return null;
  const starts: number[] = [];
  let end = m;
  for (let i = n; i > 0; i -= 1) {
    const start = (from[i] as number[])[end] as number;
    starts.unshift(start);
    end = start;
  }
  return starts;
};

/**
 * Aligns an Inner Observation page whose items do not map one-to-one onto
 * the Hebrew segments: each segment takes a run of the page's blocks
 * (`splitIntoRuns`). Where the page prints one `Chapter …` heading per
 * Hebrew chapter, runs never cross a chapter.
 */
export const alignObservationByRuns = (
  targets: ObservationTarget[],
  blocks: KiBlock[],
): ObservationVerdict[] => {
  if (targets.some((target) => target.reference === null)) {
    return refuseAll(
      targets,
      "a Hebrew segment has no en-ai reference to align by",
    );
  }
  const chapterIds = [...new Set(targets.map((t) => t.chapterId))];
  const headingAt = blocks
    .map((block, i) => (CHAPTER_HEADING_RE.test(block.text) ? i : -1))
    .filter((i) => i !== -1);
  const regions: { blocks: KiBlock[]; targets: ObservationTarget[] }[] = [];
  if (headingAt.length === chapterIds.length && chapterIds.length > 1) {
    chapterIds.forEach((chapterId, k) => {
      regions.push({
        blocks: blocks.slice(
          k === 0 ? 0 : (headingAt[k] as number),
          headingAt[k + 1] ?? blocks.length,
        ),
        targets: targets.filter((t) => t.chapterId === chapterId),
      });
    });
  } else {
    regions.push({ blocks, targets });
  }

  const runs: KiBlock[][] = [];
  for (const region of regions) {
    const starts = splitIntoRuns(
      region.blocks,
      region.targets.map((t) => t.reference as string),
    );
    if (!starts)
      return refuseAll(targets, "no split of the page fits the Hebrew");
    starts.forEach((start, k) => {
      runs.push(
        region.blocks.slice(start, starts[k + 1] ?? region.blocks.length),
      );
    });
  }
  const itemHeads = new Set(
    parseKiObservationUnits(blocks).map((unit) => unit.body[0] as KiBlock),
  );
  return finish(targets, runs, { itemHeads, subtitles: new Set() });
};
