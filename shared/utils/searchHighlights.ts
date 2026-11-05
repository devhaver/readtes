import { normalizedSearchText } from "./fullTextSearch";

export interface HighlightedExcerptPart {
  highlighted: boolean;
  text: string;
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Match like search does, then map normalized offsets back to untouched text. */
export const highlightedSearchExcerpt = (
  excerpt: string,
  query: string,
): HighlightedExcerptPart[] => {
  const phrase = normalizedSearchText(query);
  const normalized = normalizedSearchText(excerpt);
  if (!phrase || !normalized) return [{ highlighted: false, text: excerpt }];

  const offsets: { start: number; end: number }[] = [];
  for (const { segment, index } of graphemes.segment(excerpt)) {
    const end = index + segment.length;
    // Excerpts are short. Normalizing prefixes reuses the exact search rules,
    // including contextual lowercasing, without maintaining a second normalizer.
    // The sentinel prevents trim() from losing separators at the prefix's end.
    const length = normalizedSearchText(`${excerpt.slice(0, end)}a`).length - 1;
    while (offsets.length < length) offsets.push({ start: index, end });
  }

  const terms = normalized.includes(phrase)
    ? [phrase]
    : [...new Set(phrase.split(" "))];
  const ranges: { start: number; end: number }[] = [];
  for (const term of terms) {
    let from = 0;
    let match = normalized.indexOf(term, from);
    while (match !== -1) {
      const start = offsets[match];
      const end = offsets[match + term.length - 1];
      if (start && end) ranges.push({ start: start.start, end: end.end });
      from = match + term.length;
      match = normalized.indexOf(term, from);
    }
  }
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: typeof ranges = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const parts: HighlightedExcerptPart[] = [];
  let cursor = 0;
  for (const { start, end } of merged) {
    if (start > cursor) {
      parts.push({ highlighted: false, text: excerpt.slice(cursor, start) });
    }
    parts.push({ highlighted: true, text: excerpt.slice(start, end) });
    cursor = end;
  }
  if (cursor < excerpt.length) {
    parts.push({ highlighted: false, text: excerpt.slice(cursor) });
  }
  return parts;
};
