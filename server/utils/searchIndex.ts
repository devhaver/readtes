import toc from "../../content/toc.json";
import versions from "../../content/versions.json";
import type {
  ParsedChapterLayerFile,
  Toc,
  VersionsFile,
} from "../../shared/types/content";
import type { SearchDocument } from "../../shared/utils/fullTextSearch";
import { buildSearchDocuments } from "./searchCorpus";

let searchDocumentsPromise: Promise<SearchDocument[]> | undefined;

export const isSearchContentKey = (key: string): boolean =>
  /(?:^|[:/])(?:source|commentary|summary)\.[^:/]+\.json$/.test(key);

const parsedContentFile = (value: unknown): ParsedChapterLayerFile | null => {
  if (typeof value === "string") {
    return JSON.parse(value) as ParsedChapterLayerFile;
  }
  if (value && typeof value === "object") {
    return value as ParsedChapterLayerFile;
  }
  return null;
};

const loadSearchDocuments = async (): Promise<SearchDocument[]> => {
  const storage = useStorage("assets:search-content");
  const keys = (await storage.getKeys()).filter(isSearchContentKey);
  const files = (
    await Promise.all(
      keys.map(async (key) => parsedContentFile(await storage.getItem(key))),
    )
  ).filter((file): file is ParsedChapterLayerFile => file !== null);
  return buildSearchDocuments(files, toc as Toc, versions as VersionsFile);
};

export const useSearchDocuments = (): Promise<SearchDocument[]> => {
  searchDocumentsPromise ??= loadSearchDocuments();
  return searchDocumentsPromise;
};
