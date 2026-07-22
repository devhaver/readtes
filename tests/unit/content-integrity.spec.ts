import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { validateContent } from '../../scripts/validate-content.ts'

const contentDir = join(process.cwd(), 'content')

describe('content integrity', () => {
  it('validates every committed content file with no errors', () => {
    const { errors } = validateContent(contentDir)

    expect(errors).toEqual([])
  })
})
