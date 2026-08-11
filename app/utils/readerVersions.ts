/**
 * Pure language → version resolution for the reader.
 *
 * The reader picks a LANGUAGE per pane; this module picks the edition.
 * Rule: the official Bnei Baruch translation, else a human translation,
 * else the AI one — and in Hebrew the original (Jerusalem 1956) always
 * wins, because Hebrew is the source language, not a translation.
 *
 * Chains are a preference, not a whitelist: if none of a language's
 * chain ids are available, any version in that language is still better
 * than nothing (covers `en-curated` and any future id naming).
 */
import type { ContentVersion } from "~~/shared/types/content";

/**
 * Re-exported so the pane header can auto-import it alongside the rest of
 * this module. The table itself lives in `shared/` because `nuxt.config.ts`
 * labels the UI-locale switcher from the same data.
 */
export { nativeLanguageName } from "~~/shared/utils/languages";

export type VersionsById = Map<string, ContentVersion>;

/**
 * Per-language edition preference, best first. Languages absent from this
 * map use the generic `<lang>-bb` then `<lang>-ai` chain, which is how
 * every KabbalahMedia language is named — so adding a language needs
 * content, not a code change.
 */
const LANGUAGE_VERSION_CHAINS: Record<string, string[]> = {
  he: ["he-jerusalem-1956", "he-bb"],
  en: ["en-bb", "en-sefaria-community", "en-ai"],
};

/**
 * Languages pinned to the front of every switcher, in this order. Hebrew
 * is the original and English is the most complete translation, so they
 * lead; everything else sorts alphabetically behind them. Pinning keeps
 * the `<select>` order identical from chapter to chapter — deriving it
 * from each chapter's own version list would make options jump around.
 */
const LANGUAGE_DISPLAY_ORDER = ["he", "en"];

export const buildVersionsById = (versions: ContentVersion[]): VersionsById =>
  new Map(versions.map((version) => [version.id, version]));

export const versionChainForLanguage = (language: string): string[] =>
  LANGUAGE_VERSION_CHAINS[language] ?? [`${language}-bb`, `${language}-ai`];

/**
 * The registry is the only authority on what language an id is in — the
 * chain is just a preference order within an already-confirmed language.
 * Matching a chain id by string alone would let this function return an id
 * that `languagesAvailable` (which reads the registry) never offers, and
 * the pane's `<select>` would then be bound to a language with no matching
 * `<option>` — silently displaying a different language than the one in
 * state. `validate:content` already rejects unregistered ids in
 * `availableVersions`, so this is belt-and-braces; it costs one map lookup
 * and removes the divergence as a possibility rather than as a policy.
 */
const isInLanguage = (
  id: string,
  language: string,
  versionsById: VersionsById,
): boolean => versionsById.get(id)?.language === language;

export const resolveVersionForLanguage = (
  available: string[],
  language: string,
  versionsById: VersionsById,
): string | null => {
  for (const preferred of versionChainForLanguage(language)) {
    if (
      available.includes(preferred) &&
      isInLanguage(preferred, language, versionsById)
    )
      return preferred;
  }

  return (
    available.find((id) => isInLanguage(id, language, versionsById)) ?? null
  );
};

export const languagesAvailable = (
  available: string[],
  versionsById: VersionsById,
): string[] => {
  const languages = new Set(
    available
      .map((id) => versionsById.get(id)?.language)
      .filter((language): language is string => language !== undefined),
  );

  return [...languages].sort((a, b) => {
    const aRank = LANGUAGE_DISPLAY_ORDER.indexOf(a);
    const bRank = LANGUAGE_DISPLAY_ORDER.indexOf(b);
    if (aRank !== -1 || bRank !== -1) {
      return (
        (aRank === -1 ? LANGUAGE_DISPLAY_ORDER.length : aRank) -
        (bRank === -1 ? LANGUAGE_DISPLAY_ORDER.length : bRank)
      );
    }
    return a.localeCompare(b);
  });
};

export const resolveDefaultLanguage = (
  available: string[],
  uiLocale: string,
  versionsById: VersionsById,
): string | null => {
  const languages = languagesAvailable(available, versionsById);
  if (languages.length === 0) return null;

  if (languages.includes(uiLocale)) return uiLocale;
  if (languages.includes("en")) return "en";
  if (languages.includes("he")) return "he";
  return languages[0] ?? null;
};
