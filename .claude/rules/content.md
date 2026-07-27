---
paths:
  - "content/**"
  - "shared/types/content.ts"
  - "app/utils/toc.ts"
  - "app/composables/useLocalizedParts.ts"
  - "app/composables/useLocalizedVolumes.ts"
  - "app/composables/useChapterContent.ts"
  - "scripts/validate-content.ts"
  - "scripts/lib/toc-splits.ts"
---

# Content model — invariants

**Load the `tes-content-model` skill before changing anything here.** It has
the full schema, the split-ToC design, and the prefetch-stripping rationale.

The three that silently produce wrong output:

- **`app/` must never import `content/toc.json`.** It's 2.9MB and Nuxt
  serializes it into every page payload. Use `content/toc.volumes.json` and
  `content/toc.parts/part-<NN>.json` instead. Guarded by
  `tests/unit/no-full-toc-import.spec.ts`.
- **Anchor ids are `op-<order>`**, where `order` is `data-order` from
  Sefaria's inline `<i data-commentator="Ohr Penimi">` markers — not the
  visible label.
- **One file = one (chapter, layer, version).** `<layer>.<versionId>.json`,
  and the file's own `chapterId`/`layer`/`versionId` must match its path.

`zod` is a scripts/tests-only dependency — app code may only `import type`
from `shared/types/content.ts`.

Run `pnpm validate:content` after any change under `content/`.
