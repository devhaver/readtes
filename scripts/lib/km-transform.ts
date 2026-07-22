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

/**
 * Discriminated warning kind, so callers (the coverage report's
 * `unmatchedNumerals` metric in particular) can filter warnings by *what
 * kind* of alignment mismatch they are instead of substring-matching
 * human-readable `message` text — two different mismatch kinds can easily
 * share overlapping wording ("no matching anchor"/"no matching …
 * counterpart") without meaning the same thing.
 */
export type KmWarningKind =
  | "orphan-km-source-item"
  | "orphan-he-source-segment"
  | "unmatched-marker"
  | "orphan-km-commentary-paragraph"
  | "orphan-he-commentary-item"
  | "target-seif-mismatch";

export interface KmWarning {
  kind: KmWarningKind;
  message: string;
}

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
  warnings: KmWarning[];
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
  const warnings: KmWarning[] = [];
  const heByN = new Map(heSegments.map((segment) => [segment.n, segment]));
  const matchedNs = new Set<number>();
  const segments: SourceSegment[] = [];

  for (const item of items) {
    const heSegment = heByN.get(item.n);
    if (!heSegment) {
      warnings.push({
        kind: "orphan-km-source-item",
        message: `source item ${item.n}: no matching Hebrew ground-truth segment (n=${item.n} not found in he source) — skipped`,
      });
      continue;
    }
    matchedNs.add(item.n);

    const { html, unmatchedNumerals, converted } = convertAnchorMarkers(
      item.html,
      groundTruth.gematriaToAnchorId,
    );
    for (const numeral of unmatchedNumerals) {
      warnings.push({
        kind: "unmatched-marker",
        message: `source item ${item.n}: marker "(${numeral})" has no matching anchor in this chapter's Hebrew ground truth — left as text`,
      });
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
      warnings.push({
        kind: "orphan-he-source-segment",
        message: `source: Hebrew ground-truth segment n=${n} has no matching KabbalahMedia item — skipped`,
      });
    }
  }

  segments.sort((a, b) => a.n - b.n);
  return { segments, warnings };
};

export interface KmCommentaryItemsResult {
  items: CommentaryItem[];
  warnings: KmWarning[];
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
  const warnings: KmWarning[] = [];
  const matchedOrders = new Set<number>();
  const items: CommentaryItem[] = [];

  for (const para of paragraphs) {
    const order = groundTruth.gematriaToOrder.get(para.numeral);
    const entry =
      order !== undefined ? groundTruth.byOrder.get(order) : undefined;

    if (!entry) {
      warnings.push({
        kind: "orphan-km-commentary-paragraph",
        message: `commentary paragraph "(${para.numeral})" (after seif ${para.targetSeif}): no matching anchor in this chapter's Hebrew ground truth — skipped`,
      });
      continue;
    }
    if (entry.targetSeif !== para.targetSeif) {
      warnings.push({
        kind: "target-seif-mismatch",
        message: `commentary paragraph "(${para.numeral})" -> ${entry.anchorId}: KabbalahMedia places it after seif ${para.targetSeif} but the Hebrew ground truth targets seif ${entry.targetSeif} — trusting the Hebrew ground truth`,
      });
    }
    matchedOrders.add(entry.order);

    const { html, unmatchedNumerals } = convertAnchorMarkers(
      para.html,
      groundTruth.gematriaToAnchorId,
    );
    for (const numeral of unmatchedNumerals) {
      warnings.push({
        kind: "unmatched-marker",
        message: `commentary ${entry.anchorId}: marker "(${numeral})" has no matching anchor in this chapter's Hebrew ground truth — left as text`,
      });
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
      warnings.push({
        kind: "orphan-he-commentary-item",
        message: `commentary: Hebrew ground-truth ${entry.anchorId} (order ${order}) has no matching KabbalahMedia paragraph — skipped`,
      });
    }
  }

  items.sort((a, b) => a.order - b.order);
  return { items, warnings };
};
