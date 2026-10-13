import type {
  ParsedChapterLayerFile,
  Toc,
  VersionsFile,
} from "../../shared/types/content";
import {
  htmlToSearchText,
  normalizedSearchText,
  type SearchDocument,
} from "../../shared/utils/fullTextSearch";

type LocalizedText = Record<string, string>;

const localizedText = (values: LocalizedText, language: string): string =>
  values[language] ?? values.en ?? values.he ?? Object.values(values)[0] ?? "";

interface ChapterIdentity {
  chapterTitle: LocalizedText;
  partTitle: LocalizedText;
}

const chapterIdentities = (toc: Toc): Map<string, ChapterIdentity> => {
  const identities = new Map<string, ChapterIdentity>();
  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters) {
        identities.set(chapter.id, {
          chapterTitle: chapter.title,
          partTitle: part.title,
        });
      }
    }
  }
  return identities;
};

const documentText = (heading: string | undefined, html: string): string =>
  [heading, htmlToSearchText(html)].filter(Boolean).join(" ");

export const buildSearchDocuments = (
  files: ParsedChapterLayerFile[],
  toc: Toc,
  versions: VersionsFile,
): SearchDocument[] => {
  const identities = chapterIdentities(toc);
  const versionsById = new Map(
    versions.map((version) => [version.id, version]),
  );
  const documents: SearchDocument[] = [];

  for (const file of files) {
    const identity = identities.get(file.chapterId);
    const version = versionsById.get(file.versionId);
    if (!identity || !version) continue;

    const addDocument = (itemId: string, html: string, heading?: string) => {
      const text = documentText(heading, html);
      documents.push({
        id: `${file.chapterId}:${file.layer}:${file.versionId}:${itemId}`,
        chapterId: file.chapterId,
        layer: file.layer,
        versionId: file.versionId,
        versionTitle: version.title,
        language: version.language,
        chapterTitle: localizedText(identity.chapterTitle, version.language),
        partTitle: localizedText(identity.partTitle, version.language),
        itemId,
        ...(heading ? { heading } : {}),
        text,
        normalizedText: normalizedSearchText(text),
      });
    };

    if (file.layer === "source") {
      for (const item of file.items) {
        addDocument(`seif-${item.n}`, item.html, item.heading);
      }
    } else if (file.layer === "commentary") {
      for (const item of file.items) addDocument(item.anchorId, item.html);
    } else {
      for (const item of file.items) {
        addDocument(item.id, item.html, item.heading);
      }
    }
  }

  return documents.sort((left, right) => left.id.localeCompare(right.id));
};
