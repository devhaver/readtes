import { searchDocuments } from "../../../shared/utils/fullTextSearch";
import { useSearchDocuments } from "../../utils/searchIndex";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

const stringQueryValue = (value: unknown): string =>
  typeof value === "string" ? value : "";

const readerUrl = (
  language: string,
  chapterId: string,
  itemId: string,
): string => {
  const prefix = language === "en" ? "" : `/${language}`;
  return `${prefix}/read/${chapterId}#${itemId}`;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const rawQuery = stringQueryValue(query.q).slice(0, MAX_QUERY_LENGTH).trim();
  const language = stringQueryValue(query.lang).trim() || undefined;
  const requestedLimit = Number.parseInt(stringQueryValue(query.limit), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  setHeader(event, "content-type", "application/vnd.api+json");
  if (rawQuery.length < 2) {
    return { data: [], meta: { count: 0, query: rawQuery } };
  }

  const documents = await useSearchDocuments();
  const results = searchDocuments(documents, {
    query: rawQuery,
    ...(language ? { language } : {}),
    limit,
  });

  return {
    data: results.map(({ document, excerpt, score }) => ({
      type: "search-result",
      id: document.id,
      attributes: {
        chapterId: document.chapterId,
        chapterTitle: document.chapterTitle,
        excerpt,
        itemId: document.itemId,
        language: document.language,
        layer: document.layer,
        partTitle: document.partTitle,
        score,
        versionId: document.versionId,
        versionTitle: document.versionTitle ?? document.versionId,
      },
      links: {
        reader: readerUrl(
          document.language,
          document.chapterId,
          document.itemId,
        ),
      },
    })),
    meta: { count: results.length, query: rawQuery },
  };
});
