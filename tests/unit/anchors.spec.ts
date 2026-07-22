import { describe, expect, it } from 'vitest'

describe('extractAnchors', () => {
  it('extracts a single Ohr Penimi marker', () => {
    const html = '<p>לפני הכל <i data-commentator="Ohr Penimi" data-label="א" data-order="1"></i> היה אור.</p>'

    expect(extractAnchors(html)).toEqual([
      { anchorId: 'op-1', label: 'א', order: 1, commentator: 'Ohr Penimi' },
    ])
  })

  it('extracts multiple markers per segment, in order of appearance', () => {
    const html = '<p>א <i data-commentator="Ohr Penimi" data-label="א" data-order="1"></i> ב <i data-commentator="Ohr Penimi" data-label="ל" data-order="12"></i> ג</p>'

    expect(extractAnchors(html)).toEqual([
      { anchorId: 'op-1', label: 'א', order: 1, commentator: 'Ohr Penimi' },
      { anchorId: 'op-12', label: 'ל', order: 12, commentator: 'Ohr Penimi' },
    ])
  })

  it('extracts a marker at the very start of the string', () => {
    const html = '<i data-commentator="Ohr Penimi" data-label="א" data-order="1"></i> תחילת הטקסט.'

    expect(extractAnchors(html)).toEqual([
      { anchorId: 'op-1', label: 'א', order: 1, commentator: 'Ohr Penimi' },
    ])
  })

  it('extracts a marker at the very end of the string', () => {
    const html = 'סוף הטקסט <i data-commentator="Ohr Penimi" data-label="ל" data-order="12"></i>'

    expect(extractAnchors(html)).toEqual([
      { anchorId: 'op-12', label: 'ל', order: 12, commentator: 'Ohr Penimi' },
    ])
  })

  it('returns an empty array when there are no markers', () => {
    const html = '<p>טקסט רגיל ללא סימונים.</p>'

    expect(extractAnchors(html)).toEqual([])
  })

  it('tolerates commentators other than Ohr Penimi, capturing the name for callers to filter', () => {
    const html = '<i data-commentator="Histaklut Pnimit" data-label="א" data-order="1"></i>'

    expect(extractAnchors(html)).toEqual([
      { anchorId: 'op-1', label: 'א', order: 1, commentator: 'Histaklut Pnimit' },
    ])
  })

  it('ignores plain italic tags that carry no data attributes', () => {
    const html = '<p>This is <i>emphasized</i> text.</p>'

    expect(extractAnchors(html)).toEqual([])
  })
})

describe('normalizeAnchors', () => {
  it('replaces a raw marker with the normalized anchor link', () => {
    const html = '<i data-commentator="Ohr Penimi" data-label="א" data-order="1"></i>'

    expect(normalizeAnchors(html)).toBe(
      '<a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a>',
    )
  })

  it('normalizes multiple markers within surrounding text', () => {
    const html = 'לפני <i data-commentator="Ohr Penimi" data-label="א" data-order="1"></i> אמצע <i data-commentator="Ohr Penimi" data-label="ל" data-order="12"></i> אחרי'

    expect(normalizeAnchors(html)).toBe(
      'לפני <a class="tes-anchor" href="#op-1" data-anchor="op-1">א</a> אמצע <a class="tes-anchor" href="#op-12" data-anchor="op-12">ל</a> אחרי',
    )
  })

  it('leaves html with no markers untouched', () => {
    const html = '<p>טקסט ללא סימונים.</p>'

    expect(normalizeAnchors(html)).toBe(html)
  })
})

describe('stripLeadingItemNumber', () => {
  it('strips a single-digit number with no space', () => {
    expect(stripLeadingItemNumber('1.Text')).toEqual({ number: 1, text: 'Text' })
  })

  it('strips a two-digit number followed by a space', () => {
    expect(stripLeadingItemNumber('12. Text')).toEqual({ number: 12, text: 'Text' })
  })

  it('leaves text with no leading number untouched', () => {
    expect(stripLeadingItemNumber('No number')).toEqual({ text: 'No number' })
  })
})
