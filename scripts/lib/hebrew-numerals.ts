/**
 * Converts a positive integer to a Hebrew "gematria" numeral string, with
 * geresh/gershayim punctuation (e.g. 1 -> "א׳", 15 -> "ט״ו", 21 -> "כ״א").
 *
 * Used to derive chapter titles for content the Sefaria index doesn't
 * itself title (numbered chapters/simanim within a JaggedArray node).
 *
 * Standard rules applied: 15 and 16 avoid the two-letter forms that would
 * spell divine-name fragments (יה/יו), using ט"ו / ט"ז instead. Hundreds
 * above 400 repeat ת (תת = 800, etc.) rather than using non-standard
 * letter forms — sufficient for the numbers this corpus ever produces
 * (chapter/siman/paragraph counts stay well under 1000).
 */

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

const letterSequence = (n: number): string => {
  if (n <= 0)
    throw new RangeError(
      `hebrewNumeral: expected a positive integer, got ${n}`,
    );

  let remaining = n;
  let letters = "";

  while (remaining >= 400) {
    letters += "ת";
    remaining -= 400;
  }

  const hundreds = Math.floor(remaining / 100);
  remaining %= 100;
  letters += HUNDREDS[hundreds] ?? "";

  if (remaining === 15) {
    letters += "טו";
  } else if (remaining === 16) {
    letters += "טז";
  } else {
    const tens = Math.floor(remaining / 10);
    const ones = remaining % 10;
    letters += TENS[tens] ?? "";
    letters += ONES[ones] ?? "";
  }

  return letters;
};

const withPunctuation = (letters: string): string => {
  if (letters.length <= 1) return `${letters}׳`;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
};

/** Converts a positive integer to a punctuated Hebrew numeral, e.g. `hebrewNumeral(15) === 'ט״ו'`. */
export const hebrewNumeral = (n: number): string =>
  withPunctuation(letterSequence(n));

/**
 * Standard gematria (numeric) value of each Hebrew letter, final forms
 * included (a final letter has the same value as its regular form).
 *
 * Used to decode the KabbalahMedia importer's inline commentary markers:
 * the ARI's "Jerusalem, 1956-1966" commentary numbers its footnote-style
 * anchors by *sequential Hebrew letter* (א, ב, ג, … י, כ, ל, … ק, ר, ש, ת —
 * the 22-letter alphabet used as an ordinal sequence, see
 * `commentary.he-jerusalem-1956.json`'s `label.he`), but KabbalahMedia's
 * English/Russian/etc. translations print that same marker as the letter's
 * *gematria value* (1, 2, 3 … 10, 20, 30 … 100, 200, 300, 400), not its
 * ordinal position. Order 1-9 coincide with their own gematria value
 * (letters א–ט), which is why this only becomes visible from order 10 on.
 */
const GEMATRIA_LETTER_VALUES: Record<string, number> = {
  א: 1,
  ב: 2,
  ג: 3,
  ד: 4,
  ה: 5,
  ו: 6,
  ז: 7,
  ח: 8,
  ט: 9,
  י: 10,
  כ: 20,
  ך: 20,
  ל: 30,
  מ: 40,
  ם: 40,
  נ: 50,
  ן: 50,
  ס: 60,
  ע: 70,
  פ: 80,
  ף: 80,
  צ: 90,
  ץ: 90,
  ק: 100,
  ר: 200,
  ש: 300,
  ת: 400,
};

/**
 * Sums the gematria value of every recognized Hebrew letter in `label`
 * (non-letter characters — geresh/gershayim, spaces, punctuation — are
 * ignored). Throws if `label` contains no recognized Hebrew letter at all,
 * since that almost certainly means the caller passed the wrong field.
 */
export const hebrewGematriaValue = (label: string): number => {
  let total = 0;
  for (const char of label) {
    total += GEMATRIA_LETTER_VALUES[char] ?? 0;
  }
  if (total === 0) {
    throw new RangeError(
      `hebrewGematriaValue: no recognized Hebrew letter in "${label}"`,
    );
  }
  return total;
};
