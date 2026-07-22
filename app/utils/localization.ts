/**
 * Resolving `title`/label `Record<locale, string>` values from `toc.json`
 * (e.g. `TocVolume.title`, `TocPart.title`, `TocChapter.title`) to a single
 * display string for the current locale.
 */

/** A `Record<locale, string>` value, e.g. `{ en: "Volume 1", he: "כרך 1" }`. */
export type LocalizedText = Record<string, string>;

/**
 * Resolves `text[locale]`, falling back to `en`, then `he`, then whatever
 * value happens to be first in the record — so a missing translation never
 * renders as an empty string.
 */
export const localizedText = (text: LocalizedText, locale: string): string =>
  text[locale] ?? text.en ?? text.he ?? Object.values(text)[0] ?? "";
