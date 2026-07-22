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

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת']

const letterSequence = (n: number): string => {
  if (n <= 0) throw new RangeError(`hebrewNumeral: expected a positive integer, got ${n}`)

  let remaining = n
  let letters = ''

  while (remaining >= 400) {
    letters += 'ת'
    remaining -= 400
  }

  const hundreds = Math.floor(remaining / 100)
  remaining %= 100
  letters += HUNDREDS[hundreds] ?? ''

  if (remaining === 15) {
    letters += 'טו'
  }
  else if (remaining === 16) {
    letters += 'טז'
  }
  else {
    const tens = Math.floor(remaining / 10)
    const ones = remaining % 10
    letters += TENS[tens] ?? ''
    letters += ONES[ones] ?? ''
  }

  return letters
}

const withPunctuation = (letters: string): string => {
  if (letters.length <= 1) return `${letters}׳`
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`
}

/** Converts a positive integer to a punctuated Hebrew numeral, e.g. `hebrewNumeral(15) === 'ט״ו'`. */
export const hebrewNumeral = (n: number): string => withPunctuation(letterSequence(n))
