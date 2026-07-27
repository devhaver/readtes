---
paths:
  - "app/**/*.{vue,ts}"
  - "app/assets/css/*.css"
---

# App code conventions

- **Composable naming: `useAdjectiveX`** (`useFormattedDate`), not `useVerbX`.
  The inner function can stay verb-shaped (`formatDate`).
- **`computed()` wrappers for fetch-derived data.** Anything from
  `useFetch`/`useAsyncData` that feeds a template or table gets wrapped up
  front, before sort/filter/refresh consumers exist.
- **Named unions over `unknown` in generics.** Widening a shared component's
  constraint means listing concrete types (`Record<string, string | number |
  Date>`) — `unknown` blocks sorting, comparators, and formatters later.
- **`Intl.DateTimeFormat` instantiated once, reused.** Never repeated
  `Date.prototype.toLocaleDateString()`.
- **Design tokens.** Semantic vars (`--surface`, `--surface-raised`,
  `--text-primary`, `--text-muted`, `--border`) for anything light/dark
  dependent; raw `--color-*` / `--radius-*` / `--font-*` as Tailwind utilities
  (`bg-navy-primary`, `rounded-card`, `font-hebrew`) otherwise. Tokens come
  from `designs/untitled.pen` via the `@theme` block in
  `app/assets/css/main.css`. Never a literal hex.
- **Accessibility lint is error-level.** `eslint-plugin-vuejs-accessibility`
  `flat/recommended`, plus explicit `alt-text`, `anchor-has-content`,
  `click-events-have-key-events`, `form-control-has-label`,
  `heading-has-content`, `label-has-for`. Fix violations; don't disable inline.
- **Prettier owns formatting.** Run `pnpm format` — never hand-format.

For focus-ring utilities and the contrast-safe token variants, load the
`tes-seo-ssg` skill.
