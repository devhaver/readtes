/**
 * KabbalahMedia language-code / version-title bookkeeping for the importer.
 *
 * KabbalahMedia's `content_units[].files[].language` codes are mostly
 * BCP-47 already, with one confirmed exception: `ua` (their code for
 * Ukrainian) must map to the BCP-47 `uk` for `ContentVersion.language`.
 * Unknown codes pass through unchanged rather than being guessed at.
 */

const KM_LANGUAGE_TO_BCP47: Record<string, string> = {
  ua: "uk",
};

export const bcp47ForKmLanguage = (kmLanguage: string): string =>
  KM_LANGUAGE_TO_BCP47[kmLanguage] ?? kmLanguage;

/** Native-language name for the ContentVersion title, e.g. "Русский" for `ru`. */
const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  ru: "Русский",
  de: "Deutsch",
  es: "Español",
  tr: "Türkçe",
  ua: "Українська",
  pt: "Português",
};

/** `"Bnei Baruch (KabbalahMedia)"` for English, `"… — <native name>"` for everything else. */
export const kmVersionTitle = (kmLanguage: string): string => {
  if (kmLanguage === "en") return "Bnei Baruch (KabbalahMedia)";
  const native = NATIVE_LANGUAGE_NAMES[kmLanguage] ?? kmLanguage;
  return `Bnei Baruch (KabbalahMedia) — ${native}`;
};

export const kmVersionId = (kmLanguage: string): string =>
  `${bcp47ForKmLanguage(kmLanguage)}-bb`;
