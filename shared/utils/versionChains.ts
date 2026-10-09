/**
 * Which edition of a language a reader is shown, best first.
 *
 * Shared, not app-only, because two consumers have to agree on it: the
 * reader (`app/utils/readerVersions.ts`) picks the edition a pane displays,
 * and the translation exporter (`scripts/translate-export.ts`) hands
 * translators into other languages the English a reader of that passage
 * would actually see, as a reference beside the Hebrew.
 */

/**
 * Languages absent from this map use the generic `<lang>-bb` then
 * `<lang>-ai` chain, which is how every KabbalahMedia language is named —
 * so adding a language needs content, not a code change.
 */
export const LANGUAGE_VERSION_CHAINS: Record<string, string[]> = {
  he: ["he-jerusalem-1956", "he-bb"],
  // `en-sefaria-sulam` sits below the community translation (CC0 beats an
  // unknown license where both exist) and above `en-ai` (a human
  // translation beats a machine one). In practice it exists for exactly
  // one chapter — the Introduction — where the community translation is
  // absent, so the two never actually compete. See issue #133.
  //
  // `en-bb-kabbalah-info` is the same Bnei Baruch translation as `en-bb`,
  // taken from their web edition at kabbalah.info where KabbalahMedia has no
  // document for a chapter's layer — so it never competes with `en-bb` for
  // the same layer, and outranks everything that is not Bnei Baruch's.
  en: [
    "en-bb",
    "en-bb-kabbalah-info",
    "en-sefaria-community",
    "en-sefaria-sulam",
    "en-ai",
  ],
};

export const versionChainForLanguage = (language: string): string[] =>
  LANGUAGE_VERSION_CHAINS[language] ?? [`${language}-bb`, `${language}-ai`];
