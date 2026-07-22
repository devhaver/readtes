/**
 * Pure version-default-selection rule for the reader (`useReaderVersions`).
 *
 * Rule: Hebrew UI + a Hebrew version available -> Hebrew. Otherwise, the
 * best English version available -> `en-sefaria-community`, then `en-ai`,
 * then any other English-language version (covers `en-curated`, the only
 * version the summary layer ever has). Falls back to Hebrew if no English
 * version is available at all, then to whatever is first in the list.
 */
import type { ContentVersion } from "~~/shared/types/content";

const ENGLISH_PRIORITY_ORDER = ["en-sefaria-community", "en-ai"];

export type VersionsById = Map<string, ContentVersion>;

export const buildVersionsById = (versions: ContentVersion[]): VersionsById =>
  new Map(versions.map((version) => [version.id, version]));

export const resolveDefaultVersion = (
  available: string[],
  uiLocale: string,
  versionsById: VersionsById,
): string | null => {
  if (available.length === 0) return null;

  const isLanguage = (id: string, language: string) =>
    versionsById.get(id)?.language === language;

  if (uiLocale === "he") {
    const hebrew = available.find((id) => isLanguage(id, "he"));
    if (hebrew) return hebrew;
  }

  for (const preferred of ENGLISH_PRIORITY_ORDER) {
    if (available.includes(preferred)) return preferred;
  }

  const anyEnglish = available.find((id) => isLanguage(id, "en"));
  if (anyEnglish) return anyEnglish;

  const anyHebrew = available.find((id) => isLanguage(id, "he"));
  if (anyHebrew) return anyHebrew;

  return available[0] ?? null;
};
