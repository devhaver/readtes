import { describe, expect, it } from 'vitest'

describe('sanitizeHtml — allowlist behavior', () => {
  it('keeps allowed inline tags', () => {
    const html = '<p><b>bold</b> <i>italic</i> <em>em</em> <strong>strong</strong> <small>small</small> <big>big</big></p>'

    expect(sanitizeHtml(html)).toBe(
      '<b>bold</b> <i>italic</i> <em>em</em> <strong>strong</strong> <small>small</small> <big>big</big>',
    )
  })

  it('normalizes br to a bare void tag', () => {
    expect(sanitizeHtml('line one<br/>line two<br />line three<br>end')).toBe(
      'line one<br>line two<br>line three<br>end',
    )
  })

  it('strips disallowed tags but keeps their text content', () => {
    expect(sanitizeHtml('<div>keep me</div>')).toBe('keep me')
    expect(sanitizeHtml('<p>a <blink>b</blink> c</p>')).toBe('a b c')
  })

  it('removes script/style tags along with their content', () => {
    expect(sanitizeHtml('before<script>alert(1)</script>after')).toBe('beforeafter')
    expect(sanitizeHtml('before<style>.x{color:red}</style>after')).toBe('beforeafter')
  })
})

describe('sanitizeHtml — attribute stripping', () => {
  it('strips onclick and style attributes from allowed tags', () => {
    const html = '<span onclick="alert(1)" style="color:red" class="ok">text</span>'

    expect(sanitizeHtml(html)).toBe('<span class="ok">text</span>')
  })

  it('keeps only the allowlisted attributes for <a>', () => {
    const html = '<a href="#op-1" class="tes-anchor" data-anchor="op-1" id="x" target="_blank">א</a>'

    expect(sanitizeHtml(html)).toBe('<a href="#op-1" class="tes-anchor" data-anchor="op-1">א</a>')
  })

  it('drops javascript: hrefs', () => {
    const html = '<a href="javascript:alert(1)" class="ok">click</a>'

    expect(sanitizeHtml(html)).toBe('<a class="ok">click</a>')
  })

  it('strips all attributes from tags with no allowlisted attributes', () => {
    expect(sanitizeHtml('<b class="x" style="color:red">bold</b>')).toBe('<b>bold</b>')
  })

  it('keeps title on span but not on sup', () => {
    expect(sanitizeHtml('<span title="tip">t</span>')).toBe('<span title="tip">t</span>')
    expect(sanitizeHtml('<sup title="tip" class="x">1</sup>')).toBe('<sup class="x">1</sup>')
  })
})

describe('sanitizeHtml — footnote conversion', () => {
  it('converts a footnote-marker/footnote pair into a tes-footnote span', () => {
    const html = '<sup class="footnote-marker">*</sup><i class="footnote">This is the footnote text.</i>'

    expect(sanitizeHtml(html)).toBe(
      '<span class="tes-footnote" title="This is the footnote text.">*</span>',
    )
  })

  it('strips nested markup inside the footnote text before using it as a title', () => {
    const html = '<sup class="footnote-marker">*</sup><i class="footnote">See <b>Zohar</b>, part 1.</i>'

    expect(sanitizeHtml(html)).toBe(
      '<span class="tes-footnote" title="See Zohar, part 1.">*</span>',
    )
  })

  it('converts a footnote pair embedded within surrounding text', () => {
    const html = 'Text before<sup class="footnote-marker">1</sup><i class="footnote">Note.</i>text after'

    expect(sanitizeHtml(html)).toBe(
      'Text before<span class="tes-footnote" title="Note.">*</span>text after',
    )
  })
})

describe('sanitizeHtml — nested/malformed tags', () => {
  it('handles well-nested allowed tags', () => {
    expect(sanitizeHtml('<b><i>bold italic</i></b>')).toBe('<b><i>bold italic</i></b>')
  })

  it('handles improperly-nested (crossed) allowed tags without crashing', () => {
    expect(sanitizeHtml('<b><i>text</b></i>')).toBe('<b><i>text</b></i>')
  })

  it('handles an unclosed allowed tag without crashing', () => {
    expect(sanitizeHtml('<p><b>bold text')).toBe('<b>bold text')
  })

  it('handles a disallowed tag nested inside an allowed one', () => {
    expect(sanitizeHtml('<span class="x"><div>inner</div></span>')).toBe('<span class="x">inner</span>')
  })
})
