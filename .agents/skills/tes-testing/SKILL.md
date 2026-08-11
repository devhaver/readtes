---
name: tes-testing
description: How tests are written and run in this repo — Vitest under the @nuxt/test-utils nuxt environment, mountSuspended for components, and the guardrail specs that enforce content integrity and the no-full-ToC-import rule. Use when adding or fixing tests, or when a spec under tests/unit/ fails.
---

# Testing

Tests live in `tests/unit/**/*.spec.ts` and run under Vitest with the
`@nuxt/test-utils` `nuxt` environment — auto-imports and Nuxt context are
available in tests. Use `mountSuspended` from `@nuxt/test-utils/runtime` to
mount components (plain `@vue/test-utils` `mount` will not resolve Nuxt
auto-imports or async setup).

Run the suite with `task test` (or `pnpm test`, which is `vitest run`).

## Guardrail specs

Some specs exist to enforce architectural rules rather than to test a unit.
Don't delete or weaken these to make a change pass — fix the change:

- `tests/unit/content-integrity.spec.ts` — runs the full
  `validate-content` integrity check over the committed `content/` tree, so
  a bad content commit fails `pnpm test` and not just
  `pnpm validate:content`. See the `tes-content-model` skill.
- `tests/unit/no-full-toc-import.spec.ts` — greps `app/**/*.{ts,vue}` for a
  quoted import of `content/toc.json` and fails if one appears. `app/` code
  must use the split ToC files instead; see `tes-content-model`.
- `tests/unit/glossary-payload.spec.ts` — keeps the 307KB glossary out of
  `app/`, both split files behind a dynamic `import()`, and the 216KB
  citations chunk behind `loadCitations()`. See `tes-content-model`.
- `tests/unit/glossary-page.spec.ts` — among the behavioural assertions it
  also walks the page's heading levels in document order. The term rows are
  `h3`s in one component and the section headings are `h2`s in another, so
  `eslint-plugin-vuejs-accessibility` cannot see the outline; this spec is
  the only thing that catches an h1 → h3 jump.
- `tests/unit/glossary-page-weight.spec.ts` — budgets the rendered size of
  `/glossary` and of one collapsed term row. The row's byte discipline
  (namespaced unscoped CSS instead of utility classes) is invisible in
  review; re-adding a long `class` string looks like an improvement and is
  multiplied by 125. See `tes-content-model`.
- `tests/unit/glossary-convention-list.spec.ts` — the house rules are
  English prose rendered inside a page that is `dir="rtl"` under `/he`;
  this asserts every topic, rule and evidence string carries
  `dir="ltr" lang="en"`.
- `tests/unit/sitemap.spec.ts` — covers the pure URL-list builder in
  `shared/utils/sitemap.ts`. See the `tes-seo-ssg` skill.
- `tests/unit/manifest-prefetch.spec.ts` — covers
  `stripContentChunkPrefetchHints` in `shared/utils/manifestPrefetch.ts`,
  the fix that keeps generated pages from carrying thousands of prefetch
  links. See `tes-content-model`.
- `tests/unit/volume-grouping.spec.ts` — pins the volume -> part grouping in
  `content/toc.volumes.json` to Bnei Baruch's published edition. The
  expectation is not written into the spec: it is derived from
  `tests/fixtures/km-tree/tes-collection.json` (a trimmed slice of Bnei
  Baruch's own `kabbalahmedia.info/backend/sqdata` VOLUME -> PART tree) via
  `extractKmTesTree`, so the test checks the committed data against the
  publisher rather than against itself. Sefaria groups the same parts
  differently and we shipped that by accident once; regroup
  `content/toc.json` and re-run `pnpm emit:toc-splits` rather than editing
  either side. The fixture is a snapshot — its regeneration command and the
  limits of what it proves are in the spec's own docblock.

## Definition of done

Tests passing is not sufficient on its own. The full gate is `task check`
— see the "Definition of done" section in `AGENTS.md`.
