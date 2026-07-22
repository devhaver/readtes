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
| `pnpm validate:content` | Validates every file under `content/` (schema + integrity). |
| `pnpm import:sefaria` | Imports content from Sefaria — see "Sefaria import" below. |

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
scripts/                 One-off/import scripts (validate-content, import-sefaria) + scripts/lib/ (their pure helpers)
shared/types/            Types shared between app code and scripts/content tooling
tests/unit/              Vitest unit tests
designs/                 Design source files (untitled.pen) — source of truth for tokens
```

## Content model

Content is committed JSON under `content/`, validated by Zod schemas in
`shared/types/content.ts` (schemas + `z.infer` types; the app must only
`import type` from this file — `zod` is a scripts/tests-only dependency and
must never end up in the client bundle).

```
content/
  versions.json                              ContentVersion[] — the version registry
  toc.json                                    the Toc (volumes -> parts -> chapters)
  parts/part-<NN>/chapters/<chapterSlug>/
    <layer>.<versionId>.json                  one ChapterLayerFile per (chapter, layer, version)
```

- **One file = one (chapter, layer, version).** `layer` is `summary` |
  `source` | `commentary`. Filenames follow `<layer>.<versionId>.json`,
  e.g. `source.he-jerusalem-1956.json`, `summary.en-curated.json`. The
  file's own `chapterId`/`layer`/`versionId` fields must match its location
  and filename — `validate-content` enforces this.
- **Chapter ids** are `<partId>/<chapterSlug>`, e.g. `part-01/chapter-01`,
  `part-01/inner-observation-01`, `part-01/questions-terminology-01`.
- **Anchor id grammar: `op-<order>`.** Sefaria's inline commentary markers
  (`<i data-commentator="Ohr Penimi" data-label="…" data-order="N">`) become
  anchor id `op-N`, where `N` is `data-order` (continuous per chapter). See
  `app/utils/anchors.ts` (`extractAnchors`, `normalizeAnchors`) and
  `app/utils/sanitizeHtml.ts` for the HTML transforms involved.
- **`pnpm validate:content`** (`scripts/validate-content.ts`, run via
  `tsx`) Zod-validates every JSON file under `content/`, then cross-checks
  integrity: every source segment's `anchors[]` has a matching
  `CommentaryItem.anchorId` in some commentary version of the same chapter;
  every `CommentaryItem.targetSeif` exists as a source segment `n`; and
  every `toc.json` `availableVersions` entry has a corresponding file on
  disk, and vice versa. `tests/unit/content-integrity.spec.ts` runs the same
  check over the committed tree as part of `pnpm test`.
- `ContentVersion.source` includes `'ai'` for AI-generated translations
  (the reader UI badges these); `ContentVersion.translatedFrom` optionally
  names the source-language `versionId` an AI/human translation was made
  from.

## Sefaria import

`pnpm import:sefaria (--part <N> | --all) [--dry-run]` (`scripts/import-sefaria.ts`,
run via `tsx`) imports *Talmud Eser HaSefirot* from the Sefaria API into
`content/`, one part (Sefaria "Section") at a time. It resolves each part's
main-text node and sibling nodes straight from `GET /api/v2/index/...` (chapter
counts come from the shape of the fetched text itself — never probed/guessed),
builds `SourceSegment`/`CommentaryItem` items via the pure transforms in
`scripts/lib/`, writes one file per (chapter, layer, version), rewrites that
part's `toc.json` entry, and runs the same integrity checks as
`pnpm validate:content` (imported from `scripts/validate-content.ts`, not
duplicated) before exiting.

- **HTTP hygiene**: a descriptive User-Agent, ≥600ms between real requests,
  retries with backoff on 5xx/429, fails fast on other 4xx. An on-disk
  response cache keyed by request URL lives at `.superpowers/import-cache/`
  (gitignored, resumable — a re-run of unchanged data costs zero real
  requests). Fetches whole nodes (not per-chapter) where the API allows it,
  to keep total request counts low.
- **Idempotent**: stable key ordering and 2-space JSON formatting mean
  re-running the importer against unchanged upstream data produces a
  byte-identical tree — `git diff` is empty after a second run.
- **Never touches summary files.** `availableVersions`/`availableLayers` in
  the rewritten `toc.json` chapters are derived from an on-disk directory
  listing (unioned with what the current run wrote), so curated summaries
  (`summary.en-curated.json`) are preserved automatically without the
  importer needing to know about them.
- **Unknown sibling nodes are reported, never guessed.** Sefaria's sibling
  node set (Histaklut Penimit / Questions / Answers lists) varies slightly
  per section (e.g. Section VI adds "List of Questions/Answers on Cause and
  Effect", which have no `ChapterKind` yet) — an unmapped node title is
  logged as a warning and skipped entirely, not silently imported under a
  guessed kind.
- **Coverage report**: `content/COVERAGE.md`, rewritten (and printed to the
  console) at the end of every non-dry-run import — per part × layer ×
  version, how many of the part's resolved chapters got text, and how many
  total segments/commentary items. Commit it alongside the imported content.

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
