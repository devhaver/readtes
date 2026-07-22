import { describe, expect, it } from 'vitest'
import { contentVersionSchema } from '~~/shared/types/content'

describe('contentVersionSchema', () => {
  it('accepts the sefaria/kabbalahmedia/curated/ai source values', () => {
    for (const source of ['sefaria', 'kabbalahmedia', 'curated', 'ai'] as const) {
      const result = contentVersionSchema.safeParse({
        id: 'x',
        language: 'en',
        direction: 'ltr',
        title: 'X',
        license: 'unknown',
        source,
      })

      expect(result.success).toBe(true)
    }
  })

  it('rejects an unknown source value', () => {
    const result = contentVersionSchema.safeParse({
      id: 'x',
      language: 'en',
      direction: 'ltr',
      title: 'X',
      license: 'unknown',
      source: 'machine-translated',
    })

    expect(result.success).toBe(false)
  })

  it('accepts an AI translation carrying translatedFrom', () => {
    const result = contentVersionSchema.safeParse({
      id: 'en-ai',
      language: 'en',
      direction: 'ltr',
      title: 'AI Translation',
      license: 'unknown',
      source: 'ai',
      translatedFrom: 'he-jerusalem-1956',
    })

    expect(result.success).toBe(true)
    expect(result.success && result.data.translatedFrom).toBe('he-jerusalem-1956')
  })

  it('leaves translatedFrom optional for non-translated versions', () => {
    const result = contentVersionSchema.safeParse({
      id: 'he-jerusalem-1956',
      language: 'he',
      direction: 'rtl',
      title: 'Jerusalem',
      license: 'Public Domain',
      source: 'sefaria',
    })

    expect(result.success).toBe(true)
    expect(result.success && result.data.translatedFrom).toBeUndefined()
  })
})
