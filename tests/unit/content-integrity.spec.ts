import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { validateContent } from '../../scripts/validate-content.ts'

const contentDir = join(process.cwd(), 'content')
const fixturesDir = join(process.cwd(), 'tests/fixtures/content-integrity')

describe('content integrity', () => {
  it('validates every committed content file with no errors', () => {
    const { errors } = validateContent(contentDir)

    expect(errors).toEqual([])
  })
})

describe('content integrity — negative fixtures', () => {
  it('fires when a source anchor has no matching commentary anchorId', () => {
    const { errors } = validateContent(join(fixturesDir, 'anchor-commentary-mismatch'))

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/source.v1.json: anchor "op-2" (seif 1) has no matching CommentaryItem.anchorId in any commentary version of chapter "part-01/chapter-01"',
    )
  })

  it('fires when a commentary targetSeif has no matching source segment', () => {
    const { errors } = validateContent(join(fixturesDir, 'target-seif-mismatch'))

    expect(errors).toContain(
      'parts/part-01/chapters/chapter-01/commentary.v1.json: anchor "op-1" targets seif 99, which does not exist in any source version of chapter "part-01/chapter-01"',
    )
  })

  it('fires when toc.json declares an availableVersions entry with no file on disk', () => {
    const { errors } = validateContent(join(fixturesDir, 'toc-missing-file'))

    expect(errors).toContain(
      'toc.json: chapter "part-01/chapter-01" declares availableVersions.source "v1" but no file content/parts/part-01/chapters/chapter-01/source.v1.json exists',
    )
  })

  it('fires when a file on disk is not declared in toc.json availableVersions', () => {
    const { errors } = validateContent(join(fixturesDir, 'toc-orphan-file'))

    expect(errors).toContain(
      'content/parts/part-01/chapters/chapter-01/source.v1.json: exists on disk but is not listed in toc.json\'s availableVersions.source for chapter "part-01/chapter-01"',
    )
  })
})
