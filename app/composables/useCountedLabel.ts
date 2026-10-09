/**
 * Messages that depend on a count — "1 chapter" / "2 chapters", and the
 * three-and-four-form languages (Russian, Ukrainian) that `one | other`
 * cannot express.
 *
 * A message with plural forms is stored as one key per CLDR category
 * (`volumes.chapterCount.one`, `.few`, `.many`, `.other`); the category for
 * the count comes from `Intl.PluralRules`, falling back to `.other` when a
 * language does not write that category out. One `Intl.PluralRules` per
 * language tag, built on first use and cached (see `useFormattedDate`).
 *
 * `Intl.NumberFormat` is cached the same way, so the count itself is shown
 * with its language's digit grouping ("1,448", "1 448", "1.448").
 */
const pluralRules = new Map<string, Intl.PluralRules>();
const numberFormats = new Map<string, Intl.NumberFormat>();

const pluralRulesFor = (languageTag: string): Intl.PluralRules => {
  const cached = pluralRules.get(languageTag);
  if (cached) return cached;

  const rules = new Intl.PluralRules(languageTag);
  pluralRules.set(languageTag, rules);
  return rules;
};

const numberFormatFor = (languageTag: string): Intl.NumberFormat => {
  const cached = numberFormats.get(languageTag);
  if (cached) return cached;

  const format = new Intl.NumberFormat(languageTag);
  numberFormats.set(languageTag, format);
  return format;
};

/** `(1448, "en-US")` → `"1,448"`. */
export const formatCount = (count: number, languageTag: string): string =>
  numberFormatFor(languageTag).format(count);

/** The plural category a count falls in for a language: `"one"`, `"few"`, … */
export const pluralCategory = (
  count: number,
  languageTag: string,
): Intl.LDMLPluralRule => pluralRulesFor(languageTag).select(count);

export const useCountedLabel = () => {
  const { locale, locales, t, te } = useI18n();

  const languageTag = computed(
    () =>
      locales.value.find((entry) => entry.code === locale.value)?.language ??
      locale.value,
  );

  /** `(base, count)` → the `base.<category>` message with `{count}` already grouped; extra `params` pass through. */
  const countedLabel = (
    base: string,
    count: number,
    params: Record<string, string | number> = {},
  ): string => {
    const category = pluralCategory(count, languageTag.value);
    const key = te(`${base}.${category}`)
      ? `${base}.${category}`
      : `${base}.other`;
    return t(key, { ...params, count: formatCount(count, languageTag.value) });
  };

  const formatNumber = (count: number): string =>
    formatCount(count, languageTag.value);

  return { countedLabel, formatNumber };
};
