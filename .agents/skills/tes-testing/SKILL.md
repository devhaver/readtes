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
- `tests/unit/sitemap.spec.ts` — covers the pure URL-list builder in
  `shared/utils/sitemap.ts`. See the `tes-seo-ssg` skill.
- `tests/unit/manifest-prefetch.spec.ts` — covers
  `stripContentChunkPrefetchHints` in `shared/utils/manifestPrefetch.ts`,
  the fix that keeps generated pages from carrying thousands of prefetch
  links. See `tes-content-model`.

## Definition of done

Tests passing is not sufficient on its own. The full gate is `task check`
— see the "Definition of done" section in `AGENTS.md`.
