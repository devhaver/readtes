# Read TES — Agent Notes

Read TES is a static (SSG) web app for reading *Talmud Eser Sefirot* as three
aligned text layers (summary / source / commentary), multilingual including
Hebrew RTL, fully self-contained — no runtime APIs, everything ships as a
prerendered static site.

## Commands

Run `pnpm install` first. On the very first install, pnpm will print
`ERR_PNPM_IGNORED_BUILDS` and stop package build scripts short — see the
gotcha below before assuming something is broken.

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies. |
| `pnpm dev` | Start the Nuxt dev server. |
| `pnpm build` | Production SSR build (not the deploy target — see `generate`). |
| `pnpm generate` | Static site generation — this is what gets deployed. |
| `pnpm preview` | Preview the last `build`/`generate` output locally. |
| `pnpm lint` | `eslint .` |
| `pnpm lint:fix` | `eslint . --fix` |
| `pnpm test` | `vitest run` |
| `pnpm typecheck` | `nuxi typecheck` (uses `vue-tsc`) |

## pnpm 11 gotchas

- **`allowBuilds` placeholders.** The first `pnpm install` in a fresh clone
  writes an `allowBuilds:` map into `pnpm-workspace.yaml` for any dependency
  with a build script (e.g. `esbuild`, `unrs-resolver`, `@parcel/watcher`,
  `sharp`), with placeholder values `set this to true or false`. Replace each
  placeholder with `true` (or `false` if you don't want the script to run)
  and re-run `pnpm install` — the values are already resolved in this repo's
  `pnpm-workspace.yaml`, this only bites on a from-scratch registry change.
- **Config location.** `pnpm.onlyBuiltDependencies` / `pnpm.allowBuilds` in
  `package.json` are **not** honored by pnpm 11 — only `pnpm-workspace.yaml`
  is read.
- **No `workspaces` field.** This is a single-package repo. Never add a
  top-level `workspaces` field to `package.json` (npm/yarn convention,
  ignored by pnpm) — if the project ever needs a workspace, use `packages:`
  in `pnpm-workspace.yaml`.
- Use `pnpm`, never `npm`/`yarn`.

## Code conventions

- **Arrow functions only.** `const doThing = () => { ... }`, including
  composables and inner helpers — never `function doThing() {}`.
- **Composable naming: `useAdjectiveX`**, not `useVerbX` — e.g.
  `useFormattedDate`, not `useFormatDate`. The inner formatter function can
  stay verb-shaped (`formatDate`).
- **`computed()` wrappers for fetch-derived data.** Data derived from
  `useFetch`/`useAsyncData` that feeds a template or a table should be
  wrapped in `computed()` up front, even before sort/filter/refresh
  consumers exist.
- **Named unions over `unknown` in generics.** When a shared component's
  generic constraint needs widening, list the concrete value types (e.g.
  `Record<string, string | number | Date>`), not `Record<string, unknown>`
  — `unknown` blocks typed work later (sorting, comparators, formatters).
- **`Intl.DateTimeFormat` instantiated once, reused.** Don't call
  `Date.prototype.toLocaleDateString()` repeatedly — create the
  `Intl.DateTimeFormat` instance once (inside the composable) and reuse it.
- **Logical CSS properties/utilities only.** Hebrew RTL is first-class:
  always use `ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end` etc., never
  the physical `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`.
- **Design tokens only, never hardcoded hex.** All colours, radii, and
  font families come from `designs/untitled.pen` via the `@theme` block in
  `app/assets/css/main.css`. Components read semantic CSS variables
  (`--surface`, `--surface-raised`, `--text-primary`, `--text-muted`,
  `--border`) for anything that changes between light/dark, and the raw
  `--color-*` / `--radius-*` / `--font-*` tokens (as Tailwind utilities,
  e.g. `bg-navy-primary`, `rounded-card`, `font-hebrew`) for anything that
  doesn't. Never write a literal hex value in a component.

## Git / PR rules

- **No AI attribution anywhere** — no `Co-Authored-By` trailers, no
  "generated with" footers, in commits, PRs, or issues.
- Conventional-commit style subjects (`feat:`, `fix:`, `chore:`, …).

## Layout map

```
app/
  assets/css/main.css   Tailwind v4 entry point + @theme design tokens + light/dark semantic vars
  components/
    app/                App-shell components (header, nav, footer, …)
    ui/                 Generic/presentational primitives (button, card, …)
    library/             Text-library browsing components (index, search, …)
    reader/              Reader-view components (aligned summary/source/commentary layers)
  composables/           useX composables
  utils/                 Plain helper functions (non-composable)
  layouts/               Nuxt layouts
  pages/                 Nuxt file-based routes
content/                 Source content (schema + data added in a later task)
i18n/locales/            Translation message files (i18n module added in a later task)
scripts/                 One-off/import scripts (e.g. the Sefaria import, added in a later task)
shared/types/            Types shared between app code and scripts/content tooling
tests/unit/              Vitest unit tests
designs/                 Design source files (untitled.pen) — source of truth for tokens
```

## Testing

Tests live in `tests/unit/**/*.spec.ts` and run under Vitest with the
`@nuxt/test-utils` `nuxt` environment (auto-imports and Nuxt context are
available in tests; use `mountSuspended` from `@nuxt/test-utils/runtime` to
mount components).

Definition of done for any change:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm generate
```

All four must pass before committing.
