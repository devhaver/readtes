/**
 * Pure transforms from a parsed KabbalahMedia chapter structure (see
 * `km-chapter-parser.ts`) plus its Hebrew ground truth (see
 * `km-ground-truth.ts`) into `SourceSegment[]` / `CommentaryItem[]`.
 *
 * Every alignment mismatch (a KM item/paragraph with no Hebrew counterpart,
 * or vice versa; an inline marker whose numeral doesn't resolve) is
 * recorded in `warnings` and the affected item is skipped — never guessed.
 */
import { sanitizeHtml } from "../../app/utils/sanitizeHtml.ts";
import type {
  CommentaryItem,
  SourceSegment,
} from "../../shared/types/content.ts";
import { convertAnchorMarkers } from "./km-anchor-markers.ts";
import type {
  KmCommentaryParagraph,
  KmSourceItem,
} from "./km-chapter-parser.ts";
import type { KmChapterGroundTruth } from "./km-ground-truth.ts";

const dedupeInOrder = (ids: string[]): string[] => [...new Set(ids)];

/**
 * Collapses runs of literal spaces left behind when a now-stripped wrapping
 * tag (e.g. `<sub>`, not in `sanitizeHtml`'s allowlist) had its own
 * whitespace-normalized leading space next to the block's own trailing
 * space — e.g. `"Sof, <sub> (8)</sub>"` -> after `<sub>` is stripped,
 * `"Sof,  (8)"` (two spaces). Purely cosmetic (browsers collapse runs of
 * whitespace visually regardless), but kept out of the committed JSON.
 */
const collapseRepeatedSpaces = (html: string): string =>
  html.replace(/ {2,}/g, " ");

export interface KmSourceSegmentsResult {
  segments: SourceSegment[];
  warnings: string[];
}

/**
 * Builds this language's `SourceSegment[]` for one chapter. `sefariaRef` is
 * copied from the Hebrew ground-truth segment with the same `n` — never
 * reconstructed. A KM item whose `n` has no Hebrew counterpart (or a
 * Hebrew segment with no KM counterpart) is reported and skipped, not
 * invented.
 */
export const buildKmSourceSegments = (
  items: KmSourceItem[],
  heSegments: SourceSegment[],
  groundTruth: KmChapterGroundTruth,
): KmSourceSegmentsResult => {
  const warnings: string[] = [];
  const heByN = new Map(heSegments.map((segment) => [segment.n, segment]));
  const matchedNs = new Set<number>();
  const segments: SourceSegment[] = [];

  for (const item of items) {
    const heSegment = heByN.get(item.n);
    if (!heSegment) {
      warnings.push(
        `source item ${item.n}: no matching Hebrew ground-truth segment (n=${item.n} not found in he source) — skipped`,
      );
      continue;
    }
    matchedNs.add(item.n);

    const { html, unmatchedNumerals, converted } = convertAnchorMarkers(
      item.html,
      groundTruth.gematriaToAnchorId,
    );
    for (const numeral of unmatchedNumerals) {
      warnings.push(
        `source item ${item.n}: marker "(${numeral})" has no matching anchor in this chapter's Hebrew ground truth — left as text`,
      );
    }

    segments.push({
      n: item.n,
      sefariaRef: heSegment.sefariaRef,
      html: collapseRepeatedSpaces(sanitizeHtml(html)),
      anchors: dedupeInOrder(converted),
    });
  }

  for (const [n] of heByN) {
    if (!matchedNs.has(n)) {
      warnings.push(
        `source: Hebrew ground-truth segment n=${n} has no matching KabbalahMedia item — skipped`,
      );
    }
  }

  segments.sort((a, b) => a.n - b.n);
  return { segments, warnings };
};

export interface KmCommentaryItemsResult {
  items: CommentaryItem[];
  warnings: string[];
}

/**
 * Builds this language's `CommentaryItem[]` for one chapter.
 * `label`/`sefariaRef`/`targetSeif`/`section` are all copied verbatim from
 * the Hebrew ground-truth item matched by `data-order` (resolved from the
 * paragraph's printed gematria-value numeral) — never reconstructed. A KM
 * paragraph whose numeral has no Hebrew match (or a Hebrew order with no KM
 * counterpart) is reported and skipped.
 */
export const buildKmCommentaryItems = (
  paragraphs: KmCommentaryParagraph[],
  groundTruth: KmChapterGroundTruth,
): KmCommentaryItemsResult => {
  const warnings: string[] = [];
  const matchedOrders = new Set<number>();
  const items: CommentaryItem[] = [];

  for (const para of paragraphs) {
    const order = groundTruth.gematriaToOrder.get(para.numeral);
    const entry =
      order !== undefined ? groundTruth.byOrder.get(order) : undefined;

    if (!entry) {
      warnings.push(
        `commentary paragraph "(${para.numeral})" (after seif ${para.targetSeif}): no matching anchor in this chapter's Hebrew ground truth — skipped`,
      );
      continue;
    }
    if (entry.targetSeif !== para.targetSeif) {
      warnings.push(
        `commentary paragraph "(${para.numeral})" -> ${entry.anchorId}: KabbalahMedia places it after seif ${para.targetSeif} but the Hebrew ground truth targets seif ${entry.targetSeif} — trusting the Hebrew ground truth`,
      );
    }
    matchedOrders.add(entry.order);

    const { html, unmatchedNumerals } = convertAnchorMarkers(
      para.html,
      groundTruth.gematriaToAnchorId,
    );
    for (const numeral of unmatchedNumerals) {
      warnings.push(
        `commentary ${entry.anchorId}: marker "(${numeral})" has no matching anchor in this chapter's Hebrew ground truth — left as text`,
      );
    }

    items.push({
      anchorId: entry.anchorId,
      order: entry.order,
      label: entry.label,
      sefariaRef: entry.sefariaRef,
      targetSeif: entry.targetSeif,
      section: "ohr-pnimi",
      html: collapseRepeatedSpaces(sanitizeHtml(html)),
    });
  }

  for (const [order, entry] of groundTruth.byOrder) {
    if (!matchedOrders.has(order)) {
      warnings.push(
        `commentary: Hebrew ground-truth ${entry.anchorId} (order ${order}) has no matching KabbalahMedia paragraph — skipped`,
      );
    }
  }

  items.sort((a, b) => a.order - b.order);
  return { items, warnings };
};
