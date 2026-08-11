/**
 * Renders a plain `YYYY-MM-DD` provenance date in the reader's own language.
 *
 * One `Intl.DateTimeFormat` per language tag, built on first use and kept in
 * a module-level cache — constructing a formatter is the expensive part, so
 * it must never happen inside a render (see `.claude/rules/frontend.md`).
 *
 * Fixed to UTC on both ends: the dates this formats are calendar dates with
 * no time in them, and `new Date("2026-07-27")` is midnight UTC, so a reader
 * west of Greenwich would otherwise be shown the day before.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (languageTag: string): Intl.DateTimeFormat => {
  const cached = formatters.get(languageTag);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(languageTag, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  formatters.set(languageTag, formatter);
  return formatter;
};

/** `("2026-07-27", "he-IL")` → `"27 ביולי 2026"`. Unparseable input is returned as-is. */
export const formatIsoDate = (iso: string, languageTag: string): string => {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return formatterFor(languageTag).format(parsed);
};

export const useFormattedDate = () => {
  const { locale, locales } = useI18n();

  /** `"he"` → `"he-IL"`, so the formatter gets a real BCP-47 tag. */
  const languageTag = computed(
    () =>
      locales.value.find((entry) => entry.code === locale.value)?.language ??
      locale.value,
  );

  const formatDate = (iso: string): string =>
    formatIsoDate(iso, languageTag.value);

  return { formatDate };
};
