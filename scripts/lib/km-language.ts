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
  fr: "Français",
};

/** `"Bnei Baruch (KabbalahMedia)"` for English, `"… — <native name>"` for everything else. */
export const kmVersionTitle = (kmLanguage: string): string => {
  if (kmLanguage === "en") return "Bnei Baruch (KabbalahMedia)";
  const native = NATIVE_LANGUAGE_NAMES[kmLanguage] ?? kmLanguage;
  return `Bnei Baruch (KabbalahMedia) — ${native}`;
};

export const kmVersionId = (kmLanguage: string): string =>
  `${bcp47ForKmLanguage(kmLanguage)}-bb`;

/**
 * The full set of KabbalahMedia language codes this importer expects a
 * chapter to *potentially* have a docx file for (the task brief's set,
 * `he` excluded — Hebrew is the ground truth already on disk, never
 * re-imported from KabbalahMedia). Reconciling a chapter's actual files
 * against this list is what lets a genuine absence (e.g. no `pt` file for
 * either chapter, verified against the live API) show up explicitly in
 * the coverage report as checked-and-absent, rather than silently vanish
 * because nothing was ever iterated for it.
 */
export const KM_EXPECTED_LANGUAGES: readonly string[] = [
  "en",
  "ru",
  "tr",
  "de",
  "es",
  "ua",
  "pt",
  "fr",
];

/**
 * The subset of `expected` not present in `present`, in `expected`'s order.
 * Pure set-difference — used to find which expected KabbalahMedia
 * languages had no docx file for a given chapter.
 */
export const missingKmLanguages = (
  expected: readonly string[],
  present: readonly string[],
): string[] => {
  const presentSet = new Set(present);
  return expected.filter((language) => !presentSet.has(language));
};
