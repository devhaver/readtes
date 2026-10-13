import type { LayerKind } from "../types/content";

const QUOTE_MARKS = /["'`׳״‘’“”]/g;
const COMBINING_MARKS = /\p{M}+/gu;
const PUNCTUATION_AND_SYMBOLS = /[\p{P}\p{S}]+/gu;
const HTML_TAGS = /<[^>]*>/g;
const HTML_BREAKS = /<\/?(?:br|p|div|li|h[1-6]|blockquote)\b[^>]*>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });

export const htmlToSearchText = (html: string): string =>
  decodeHtmlEntities(html.replace(HTML_BREAKS, " ").replace(HTML_TAGS, ""))
    .replace(/\s+/g, " ")
    .trim();

export const normalizedSearchText = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLocaleLowerCase()
    .replace(QUOTE_MARKS, "")
    .replace(PUNCTUATION_AND_SYMBOLS, " ")
    .replace(/\s+/g, " ")
    .trim();

export interface SearchDocument {
  id: string;
  chapterId: string;
  layer: LayerKind;
  versionId: string;
  versionTitle?: string;
  language: string;
  chapterTitle: string;
  partTitle: string;
  itemId: string;
  heading?: string;
  text: string;
  normalizedText?: string;
}

export interface SearchOptions {
  query: string;
  language?: string;
  limit: number;
}

export interface SearchResult {
  document: SearchDocument;
  excerpt: string;
  score: number;
}

const excerptFor = (text: string, rawQuery: string): string => {
  const compact = text.replace(/\s+/g, " ").trim();
  const query = rawQuery.trim().toLocaleLowerCase();
  const firstToken = query.split(/\s+/)[0] ?? "";
  const lowered = compact.toLocaleLowerCase();
  const matchIndex = lowered.indexOf(query);
  const tokenIndex = firstToken === "" ? -1 : lowered.indexOf(firstToken);
  const center = matchIndex >= 0 ? matchIndex : tokenIndex;
  const start = Math.max(0, center >= 0 ? center - 70 : 0);
  const end = Math.min(compact.length, start + 220);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < compact.length ? "…" : "";
  return `${prefix}${compact.slice(start, end).trim()}${suffix}`;
};

const scoreDocument = (
  document: SearchDocument,
  normalizedQuery: string,
  tokens: string[],
): number | null => {
  const normalized =
    document.normalizedText ?? normalizedSearchText(document.text);
  if (!tokens.every((token) => normalized.includes(token))) return null;

  let score = normalized.includes(normalizedQuery) ? 100 : 0;
  const normalizedHeading = normalizedSearchText(document.heading ?? "");
  const normalizedTitle = normalizedSearchText(document.chapterTitle);
  if (normalizedHeading.includes(normalizedQuery)) score += 30;
  if (normalizedTitle.includes(normalizedQuery)) score += 20;
  score += tokens.reduce(
    (total, token) => total + (normalized.startsWith(token) ? 3 : 1),
    0,
  );
  return score;
};

export const searchDocuments = (
  documents: SearchDocument[],
  options: SearchOptions,
): SearchResult[] => {
  const normalizedQuery = normalizedSearchText(options.query);
  if (normalizedQuery === "" || options.limit <= 0) return [];
  const tokens = normalizedQuery.split(" ");

  return documents
    .flatMap((document): SearchResult[] => {
      if (options.language && document.language !== options.language) return [];
      const score = scoreDocument(document, normalizedQuery, tokens);
      return score === null
        ? []
        : [
            {
              document,
              excerpt: excerptFor(document.text, options.query),
              score,
            },
          ];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.document.id.localeCompare(right.document.id),
    )
    .slice(0, options.limit);
};
