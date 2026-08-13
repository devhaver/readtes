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

export interface TranslatableChapter {
  chapterId: string;
  /** Items present in the source version but not yet in the target version. */
  items: CommentaryItem[];
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
 * on `anchorId`.
 *
 * Partial chapters are normal and supported: `checkTranslatedVersionIntegrity`
 * explicitly allows a translated commentary file to be a subset, so a batch may
 * top up a chapter that an earlier run half-finished.
 */
export const untranslatedItems = (
  sourceItems: CommentaryItem[],
  targetItems: readonly CommentaryItem[],
): CommentaryItem[] => {
  const covered = new Set(targetItems.map((item) => item.anchorId));
  return sourceItems
    .filter((item) => !covered.has(item.anchorId))
    .sort((a, b) => a.order - b.order);
};

/**
 * Packs chapters into batches of at most `budgetChars` of source prose,
 * preserving input order so batch ids stay stable across runs.
 *
 * A chapter larger than the whole budget gets a batch to itself rather than
 * being split or silently dropped — the caller sees it in the manifest's own
 * `chars` figure and can lower the budget for that run if a model chokes.
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

    // Close the open batch first when this chapter would overflow it, so the
    // oversize-chapter case below lands in a batch of its own rather than
    // being appended to whatever was already accumulating.
    if (current.length > 0 && currentChars + chapterChars > budgetChars)
      flush();

    current.push(chapter);
    currentChars += chapterChars;

    if (currentChars >= budgetChars) flush();
  }

  flush();
  return batches;
};
