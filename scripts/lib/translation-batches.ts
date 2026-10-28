/**
 * Pure batching logic for the translation pipeline (issue #87 and the twelve
 * languages after it).
 *
 * Kept free of the filesystem so the two things that decide correctness — WHAT
 * is missing, and HOW it is grouped — are unit-testable without a corpus.
 * `scripts/translate-export.ts` supplies the data and writes the manifests.
 *
 * Two facts from the corpus drive the design:
 *
 *  - **Batch by characters, never by item count.** Commentary items run from
 *    29 to 37,057 characters — a 1,278x spread. Ten items can be a paragraph
 *    or a small book.
 *  - **Never split a chapter.** The emitted artifact is one file per chapter;
 *    splitting one across batches would mean two half-files racing to write
 *    the same path, for no benefit. A chapter that exceeds the budget on its
 *    own becomes its own batch instead.
 */
import type {
  CommentaryItem,
  SourceSegment,
} from "../../shared/types/content.ts";

/** Tags stripped — budgeting on markup would charge for `<b>` and mis-size every batch. */
export const proseLength = (html: string): number =>
  html.replace(/<[^>]+>/g, "").length;

/**
 * What a batch carries per translatable unit. A commentary item is identified
 * by its `anchorId`, a source segment by its `n` — the two layers number
 * themselves differently, and neither identity is ever produced by a model
 * (see `translate-apply.ts`).
 */
export type TranslatableItem = CommentaryItem | SourceSegment;

/** The stable identity of a translatable item, whichever layer it came from. */
export const itemKey = (item: TranslatableItem): string =>
  "anchorId" in item ? item.anchorId : `seif-${item.n}`;

/**
 * Aligns edition text to the authoritative source by key AND occurrence.
 *
 * Source chapters occasionally contain legitimate repeated segment numbers
 * (Part 1's topical answers end with answer 51 and a separately sourced
 * colophon that is also numbered 51). A plain `Map<key, html>` collapses those
 * records and gives both export items the same English crib. Each successive
 * edition is better than the previous one and overlays only the occurrences
 * it actually contains, leaving the lower-priority fallback for the rest.
 */
export const alignEditionHtml = (
  sourceItems: readonly TranslatableItem[],
  editionsWorstFirst: readonly (readonly TranslatableItem[])[],
): Map<TranslatableItem, string> => {
  const sourceByKey = new Map<string, TranslatableItem[]>();
  for (const item of sourceItems) {
    const key = itemKey(item);
    sourceByKey.set(key, [...(sourceByKey.get(key) ?? []), item]);
  }

  const aligned = new Map<TranslatableItem, string>();
  for (const edition of editionsWorstFirst) {
    const occurrences = new Map<string, number>();
    for (const item of edition) {
      const key = itemKey(item);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      const sourceItem = sourceByKey.get(key)?.[occurrence];
      if (sourceItem) aligned.set(sourceItem, item.html);
    }
  }
  return aligned;
};

/** Reading-order position: a commentary item's `order`, a source segment's `n`. */
const readingPosition = (item: TranslatableItem): number =>
  "order" in item ? item.order : item.n;

export interface TranslatableChapter {
  chapterId: string;
  /** Items present in the source version but not yet in the target version. */
  items: TranslatableItem[];
  /** The chapter's source text in the source language — context, never translated. */
  sourceSegments: SourceSegment[];
  /** The same text in the target language where it exists, so terminology matches the pane beside it. */
  targetSegments: SourceSegment[] | null;
}

export interface TranslationBatch {
  /** Stable, ordered id — `<lang>-<partId>-<nnn>`, so a rerun overwrites rather than duplicates. */
  id: string;
  chapters: TranslatableChapter[];
  /** Source-language characters of prose in this batch, tags excluded. */
  chars: number;
  items: number;
}

/**
 * The items of `sourceItems` that `targetItems` does not already cover, matched
 * on `itemKey` — `anchorId` for commentary, `n` for source segments.
 *
 * Partial chapters are normal while a run is in progress: commentary may stay
 * a subset, while source batches top up the same AI edition until its chapter
 * is complete. Whether a sibling edition counts as coverage is decided by
 * `itemsForTranslation`, not here.
 *
 * Ordered by `order` where the layer has one (commentary) and by `n` otherwise,
 * so batches follow the reading order of the text either way.
 */
export const untranslatedItems = (
  sourceItems: readonly TranslatableItem[],
  targetItems: readonly TranslatableItem[],
): TranslatableItem[] => {
  const covered = new Map<string, number>();
  for (const item of targetItems) {
    const key = itemKey(item);
    covered.set(key, (covered.get(key) ?? 0) + 1);
  }
  return sourceItems
    .filter((item) => {
      const key = itemKey(item);
      const remaining = covered.get(key) ?? 0;
      if (remaining === 0) return true;
      covered.set(key, remaining - 1);
      return false;
    })
    .sort((a, b) => readingPosition(a) - readingPosition(b));
};

/**
 * Selects the items a translation run must produce.
 *
 * Commentary can compose coverage across editions item by item. Source files
 * are selected as whole editions by the reader, and AI source files must be
 * structurally complete. If sibling source editions leave any gap, the AI
 * edition must therefore cover the chapter itself instead of becoming an
 * invalid gap-only file.
 */
export const itemsForTranslation = (
  sourceItems: readonly TranslatableItem[],
  targetItems: readonly TranslatableItem[],
  targetLanguageEditions: readonly (readonly TranslatableItem[])[],
  layer: "commentary" | "source",
  targetExists: boolean,
): TranslatableItem[] => {
  if (layer === "commentary") {
    return untranslatedItems(sourceItems, targetLanguageEditions.flat());
  }
  if (targetExists) return untranslatedItems(sourceItems, targetItems);
  const hasCompleteEdition = targetLanguageEditions.some(
    (edition) => untranslatedItems(sourceItems, edition).length === 0,
  );
  return hasCompleteEdition ? [] : untranslatedItems(sourceItems, []);
};

/**
 * Packs chapters into batches of at most `budgetChars` of source prose,
 * preserving input order so batch ids stay stable across runs.
 *
 * A chapter larger than the whole budget is SPLIT across consecutive batches,
 * carrying its `chapterId` into each. That was originally forbidden — one
 * chapter is one output file, and two batches writing it looked like a race —
 * but `translate-apply.ts` merges into whatever is already on disk and refuses
 * to overwrite an item that is present, so applying the pieces one after
 * another is safe and order-independent.
 *
 * It became necessary with the source layer (issue #133): a commentary item is
 * small, but the Introduction is ONE chapter of 443 segments and 105,000
 * characters. Left unsplit it produced a single 519KB manifest at five times
 * the budget — a batch no model would take, and the budget silently meaningless.
 */
export const packBatches = (
  chapters: TranslatableChapter[],
  budgetChars: number,
  idPrefix: string,
): TranslationBatch[] => {
  const batches: TranslationBatch[] = [];
  let current: TranslatableChapter[] = [];
  let currentChars = 0;

  const flush = () => {
    if (current.length === 0) return;
    batches.push({
      id: `${idPrefix}-${String(batches.length + 1).padStart(3, "0")}`,
      chapters: current,
      chars: currentChars,
      items: current.reduce((sum, chapter) => sum + chapter.items.length, 0),
    });
    current = [];
    currentChars = 0;
  };

  for (const chapter of chapters) {
    const chapterChars = chapter.items.reduce(
      (sum, item) => sum + proseLength(item.html),
      0,
    );

    // Close the open batch first when this chapter would overflow it, so a
    // large chapter starts cleanly rather than being appended to whatever was
    // already accumulating.
    if (current.length > 0 && currentChars + chapterChars > budgetChars)
      flush();

    if (chapterChars <= budgetChars) {
      current.push(chapter);
      currentChars += chapterChars;
      if (currentChars >= budgetChars) flush();
      continue;
    }

    // Oversize: emit it a slice at a time. Each slice keeps the chapter's own
    // id and context, so a translator still sees the text the items sit in.
    let slice: TranslatableItem[] = [];
    let sliceChars = 0;
    for (const item of chapter.items) {
      const itemChars = proseLength(item.html);
      if (slice.length > 0 && sliceChars + itemChars > budgetChars) {
        current.push({ ...chapter, items: slice });
        currentChars += sliceChars;
        flush();
        slice = [];
        sliceChars = 0;
      }
      slice.push(item);
      sliceChars += itemChars;
    }
    if (slice.length > 0) {
      current.push({ ...chapter, items: slice });
      currentChars += sliceChars;
      flush();
    }
  }

  flush();
  return batches;
};
