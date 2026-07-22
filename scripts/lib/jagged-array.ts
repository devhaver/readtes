/**
 * Pure helpers for reshaping Sefaria's JaggedArray text payloads.
 *
 * Sefaria's `/api/v3/texts/{ref}` returns `versions[].text` shaped by the
 * node's own `depth`/`sectionNames` — and, critically, arrays are trimmed
 * only from the *tail*: a version missing translations for the last N
 * items of a chapter (or the last N chapters of a whole-node fetch) omits
 * them entirely, but a gap in the *middle* is padded with `""`. Positional
 * zipping is safe as long as short arrays are treated as right-padded with
 * `""`, never assumed length-equal to a sibling version's array.
 */
import type { SefariaJaggedText } from "./sefaria-api-types.ts";

export interface JaggedNodeShape {
  /** Address depth of the node (1 = flat list, 2 = chapters of items). */
  depth?: number;
  /** e.g. `['Chapter', 'Seif']`, `['Paragraph']`, `['Siman', 'Paragraph']`, `['Chapter']`. */
  sectionNames?: string[];
}

const asLeaf = (value: SefariaJaggedText): string =>
  typeof value === "string" ? value : "";

/**
 * Reshapes a raw `versions[].text` array into a uniform `chapters[][]`
 * shape — one array of item strings per chapter — regardless of the
 * node's real depth/section-name convention:
 *
 * - depth 2 (`[Chapter, Seif]` / `[Siman, Paragraph]`): already
 *   chapter-of-items; passed through.
 * - depth 1, `sectionNames[0] === 'Chapter'` (Sections V+ main text):
 *   each flat item IS a whole chapter (no further subdivision) — wrapped
 *   as its own single-item "chapter".
 * - depth 1, otherwise (e.g. `[Paragraph]` sibling lists): the whole node
 *   is one implicit chapter containing every item.
 */
export const normalizeToChapterItemLists = (
  node: JaggedNodeShape,
  text: SefariaJaggedText[],
): string[][] => {
  const depth = node.depth ?? 1;

  if (depth >= 2) {
    return text.map((chapter) =>
      Array.isArray(chapter) ? chapter.map(asLeaf) : [],
    );
  }

  const flat = text.map(asLeaf);

  if ((node.sectionNames ?? [])[0] === "Chapter") {
    return flat.map((item) => [item]);
  }

  return [flat];
};

/**
 * Pads `secondary` (e.g. an English translation's chapter/item lists) to
 * `primary`'s shape (e.g. the Hebrew source, which is always complete),
 * filling any missing chapter or item with `""` rather than assuming
 * matching lengths.
 */
export const alignJaggedArrays = (
  primary: string[][],
  secondary: string[][] | undefined,
): string[][] =>
  primary.map((chapterItems, chapterIndex) => {
    const secondaryChapter = secondary?.[chapterIndex] ?? [];
    return chapterItems.map(
      (_, itemIndex) => secondaryChapter[itemIndex] ?? "",
    );
  });
