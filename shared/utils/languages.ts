/**
 * Native names for every language the site can present, in the language
 * itself — "עברית", never "Hebrew".
 *
 * Deliberately NOT i18n message keys: a native name is the same string in
 * every UI locale, so putting it in `i18n/locales/{en,he}.json` would mean
 * maintaining N identical copies of "עברית" (and N more per phase-2
 * locale) with nothing to translate. One table here instead.
 *
 * Deliberately NOT `Intl.DisplayNames`: this site prerenders in Node and
 * hydrates in the browser, and the two carry independent ICU/CLDR
 * versions — a name that differs between them is a hydration mismatch in
 * the pane header. A fixed table renders identically everywhere.
 *
 * Two consumers, one table: `nuxt.config.ts` labels the UI-locale
 * switcher from it, and `app/utils/readerVersions.ts` labels the reader's
 * per-pane language `<select>` from it. The two sets are not the same —
 * a language can have content long before its UI locale exists — but the
 * name of a language is the same fact for both, so it is stored once.
 *
 * Contents: the spec's phase-2 target set (docs/specs/2026-08-11-reader-
 * language-switching.md). Adding a language means adding a row here;
 * unknown codes fall back to the raw code rather than throwing.
 */
export const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  he: "עברית",
  en: "English",
  bg: "Български",
  de: "Deutsch",
  ru: "Русский",
  fr: "Français",
  es: "Español",
  tr: "Türkçe",
  hi: "हिन्दी",
};

export const nativeLanguageName = (language: string): string =>
  NATIVE_LANGUAGE_NAMES[language] ?? language;
