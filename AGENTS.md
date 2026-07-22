# Read TES — Agent Notes

Read TES is a static (SSG) web app for reading _Talmud Eser Sefirot_ as three
aligned text layers (summary / source / commentary), multilingual including
Hebrew RTL, fully self-contained — no runtime APIs, everything ships as a
prerendered static site.

## Commands

This repo has a `Taskfile.yaml` (go-task v3) that wraps the pnpm scripts
below — prefer it day to day:

| Task                     | What it does                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `task dev`               | `setup` then `pnpm dev` — dev server at http://localhost:6217 (see "Dev server ports").        |
| `task setup`             | `pnpm install --frozen-lockfile`, cached on `package.json`/`pnpm-lock.yaml`.                   |
| `task qa`                | `pnpm lint && pnpm format:check` — run before committing.                                      |
| `task test`              | `pnpm test`.                                                                                   |
| `task generate`          | `pnpm generate`.                                                                               |
| `task import -- <flags>` | `pnpm import:sefaria <flags>` — flags after `--` pass through, e.g. `task import -- --part 1`. |
| `task clean`             | Remove `.nuxt`, `.output`, `coverage`, `node_modules`, `.task`.                                |

`task --list-all` shows every task with its `desc`/`summary`. `task` requires
go-task; if it isn't installed, use the underlying pnpm scripts directly.

Run `pnpm install` first if not using `task setup`. On the very first
install, pnpm will print `ERR_PNPM_IGNORED_BUILDS` and stop package build
scripts short — see the gotcha below before assuming something is broken.

| Command                     | What it does                                                                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`              | Install dependencies.                                                                                                                                                                                                                    |
| `pnpm dev`                  | Start the Nuxt dev server (port 6217).                                                                                                                                                                                                   |
| `pnpm build`                | Production SSR build (not the deploy target — see `generate`).                                                                                                                                                                           |
| `pnpm generate`             | Static site generation — this is what gets deployed.                                                                                                                                                                                     |
| `pnpm preview`              | Preview the last `build`/`generate` output locally.                                                                                                                                                                                      |
| `pnpm lint`                 | `eslint .`                                                                                                                                                                                                                               |
| `pnpm lint:fix`             | `eslint . --fix`                                                                                                                                                                                                                         |
| `pnpm format`               | `prettier --write .` — formats everything except `.prettierignore` entries.                                                                                                                                                              |
| `pnpm format:check`         | `prettier --check .` — CI/pre-commit check, no writes.                                                                                                                                                                                   |
| `pnpm test`                 | `vitest run`                                                                                                                                                                                                                             |
| `pnpm typecheck`            | `nuxi typecheck` (app/, via `vue-tsc -b`) **and** `vue-tsc -p tsconfig.scripts.json` (`scripts/`, `tests/`, `shared/`, which sit outside Nuxt's own project references).                                                                 |
| `pnpm validate:content`     | Validates every file under `content/` (schema + integrity).                                                                                                                                                                              |
| `pnpm emit:toc-splits`      | Regenerates `content/toc.volumes.json` + `content/toc.parts/*.json` from `content/toc.json` (see "Content model"). Both importers call this automatically after writing `toc.json` — run by hand only after a manual edit to `toc.json`. |
| `pnpm import:sefaria`       | Imports content from Sefaria — see "Sefaria import" below.                                                                                                                                                                               |
| `pnpm import:kabbalahmedia` | Imports the Bnei Baruch/KabbalahMedia English edition (`scripts/import-kabbalahmedia.ts`).                                                                                                                                               |

## Dev server ports

`nuxt.config.ts` pins `devServer.port` to **6217** and Vite's HMR websocket
to **6218** (`vite.server.ws.port`), instead of the Nuxt defaults (3000 /
same port as the dev server). This repo runs alongside other local Nuxt dev
servers (e.g. `weburz` on 3000) — 6217/6218 don't collide with any of them.
Keep using these two ports if you ever need to reference the dev server
directly (proxies, browser automation, etc.) rather than re-guessing 3000.

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
- **Prettier owns formatting, ESLint owns correctness.** `eslint.config.mjs`
  has `stylistic` off and appends `eslint-config-prettier` last, so ESLint
  never fights Prettier on style. Run `pnpm format` (or `task qa`, which
  checks but doesn't write) instead of hand-formatting; `.prettierrc.json`
  mirrors weburz's config (double quotes, trailing commas, plugin
  `prettier-plugin-organize-imports`). `content/` is excluded via
  `.prettierignore` — the Sefaria importer owns that formatting, see
  "Content model".
- **Accessibility lint is on and error-level.** `eslint-plugin-vuejs-accessibility`'s
  `flat/recommended` preset is appended in `eslint.config.mjs`, plus explicit
  `error`-level rules for `alt-text`, `anchor-has-content`,
  `click-events-have-key-events`, `form-control-has-label`,
  `heading-has-content`, and `label-has-for` (nesting or `id`). Fix real
  violations rather than disabling the rule inline.

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
  composables/           useX composables (includes useLocalizedSeo — per-page SEO meta)
  utils/                 Plain helper functions (non-composable)
  layouts/               Nuxt layouts (default, reader)
  pages/                 Nuxt file-based routes
server/routes/           Nitro server routes — sitemap.xml.ts, robots.txt.ts (both prerendered
                         into the static output; see "SSG / SEO" below)
content/                 Source content (schema + data), committed JSON — see "Content model"
i18n/locales/            Translation message files (en.json/he.json) for @nuxtjs/i18n
scripts/                 One-off/import scripts (validate-content, import-sefaria,
                         import-kabbalahmedia) + scripts/lib/ (their pure helpers)
shared/types/            Types shared between app code and scripts/content tooling
shared/utils/            Pure helpers shared between app and server code (e.g. the sitemap
                         URL-list builder) — no Nuxt/Nitro runtime context, so directly
                         unit-testable
tests/unit/              Vitest unit tests
designs/                 Design source files — untitled.pen (design tokens) and og-card.html
                         (the source markup the committed public/images/og-card.png social
                         card was rendered from; do not modify either without regenerating
                         the PNG)
```

## Content model

Content is committed JSON under `content/`, validated by Zod schemas in
`shared/types/content.ts` (schemas + `z.infer` types; the app must only
`import type` from this file — `zod` is a scripts/tests-only dependency and
must never end up in the client bundle).

```
content/
  versions.json                              ContentVersion[] — the version registry
  toc.json                                    the canonical Toc (volumes -> parts -> chapters) — BUILD-TIME ONLY, see below
  toc.volumes.json                            TocVolumesFile — volumes -> parts skeleton, no chapter lists (~17KB)
  toc.parts/part-<NN>.json                    TocPartFile — one part's full TocChapter[] + its own/parent-volume identity
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
  every `CommentaryItem.targetSeif` exists as a source segment `n`; every
  `toc.json` `availableVersions` entry has a corresponding file on disk, and
  vice versa; and (see "Split ToC" below) `toc.volumes.json` +
  `toc.parts/*.json` are exactly derivable from `toc.json`.
  `tests/unit/content-integrity.spec.ts` runs the same check over the
  committed tree as part of `pnpm test`.
- `ContentVersion.source` includes `'ai'` for AI-generated translations
  (the reader UI badges these); `ContentVersion.translatedFrom` optionally
  names the source-language `versionId` an AI/human translation was made
  from.

### Split ToC (`toc.volumes.json` + `toc.parts/*.json`) — app-facing, `content/toc.json` is build-time only

At full-corpus scale `content/toc.json` is 2.9MB+ (16 parts, 5,148+
chapters). Loading it in `app/` code (the pre-T11 shape) meant Nuxt
serialized the _entire_ ToC into every page's inlined payload — 391KB
reader pages, 9-11s/route prerender times, hour-scale `pnpm generate` runs.
**`app/` code must never import `content/toc.json` directly** — a unit test
guardrail (`tests/unit/no-full-toc-import.spec.ts`) greps `app/**/*.{ts,vue}`
for a quoted import of it and fails the suite if one appears. `toc.json`
stays the single canonical file for everything build-time: the importers,
`scripts/validate-content.ts`, `nuxt.config.ts`'s prerender route list, and
`server/routes/sitemap.xml.ts` (a Nitro server route, not `app/` — prerendered
once per build, not shipped as a client-facing payload) all still read it
directly.

Instead, `app/` loads two smaller, derived files:

- **`content/toc.volumes.json`** (`TocVolumesFile`, ~17KB total) — every
  volume's parts, _without_ chapter lists. Each part carries `chapterCount`,
  `kindsPresent`, `firstChapterId`/`lastChapterId` +
  `firstChapterTitle`/`lastChapterTitle` (in the same kind-then-number
  reading order as `orderedPartChapters`, below), and a precomputed
  `availableSummary: { he, en }` (`LanguageAvailability` — `"none" |
"partial" | "full"`) for the volumes index's language chips. Loaded by
  `useLocalizedVolumes()`.
- **`content/toc.parts/part-<NN>.json`** (`TocPartFile`) — one part's full
  `TocChapter[]` (exactly what `toc.json` holds for that part) plus the
  part's own `{ id, number, title }` and its parent volume's — enough for
  the reader page and a volume's contents page to render breadcrumbs/SEO
  from this one file alone. Loaded by `useLocalizedParts(partIds)`, a lazy
  `import.meta.glob` over `content/toc.parts/*.json` keyed by part id (same
  style as `useChapterContent`'s glob over `content/parts/**`) — a reader
  page loads only its own part; a volume's contents page loads only that
  volume's 2-3 parts.

Both composables do a direct `await import()` of the statically bundled
JSON — **no `useAsyncData`** (same reasoning as `useChapterContent`: server
and client resolve the identical module, there's no fetch to coordinate, and
wrapping it would re-add the payload-serialization cost this split exists to
avoid). `app/utils/toc.ts` holds the pure helpers over these two shapes
(`orderedPartChapters`, `findChapterInPart`, `findVolumeBySlug`,
`volumeHasContent`, `adjacentParts`, `prevNextChapterLinks` — the last
crosses a part boundary using the _adjacent_ part's
`firstChapterId`/`lastChapterId` + title from `toc.volumes.json`, never
loading the neighbor part's full file just to label a nav link).

**Who emits the split files**: `scripts/lib/toc-splits.ts`
(`deriveTocVolumesFile`/`deriveTocPartFiles`, pure; `writeTocSplitFiles`,
I/O — also removes any stale `toc.parts/*.json` for a part id no longer in
`toc.json`). Both importers (`import-sefaria.ts`, `import-kabbalahmedia.ts`)
call `writeTocSplitFiles` immediately after they rewrite `toc.json`, so the
split files are always regenerated in the same run. `pnpm emit:toc-splits`
(`scripts/emit-toc-splits.ts`) runs the same derivation standalone, for
after a manual edit to `toc.json`. `scripts/validate-content.ts`'s
equivalence check re-derives both files from the committed `toc.json` and
structurally compares them against what's on disk — any drift (stale,
missing, or mismatched file) is a validation error, so these files can never
silently go stale.

**Content-chunk prefetch-link stripping (`nuxt.config.ts`'s `build:manifest`
hook).** `useChapterContent`'s `import.meta.glob("../../content/parts/**/*.json")`
(and `useLocalizedParts`'s equivalent over `content/toc.parts/*.json`) gives
every reader page's _built_ (`pnpm generate`/`pnpm build`) output a
`<link rel="prefetch">` for nearly every chapter's content chunk,
regardless of which chapter it is — Rollup's client manifest records every
file a glob matches as a "dynamic import" of the module containing the
glob, and Nitro's renderer (`vue-bundle-renderer`) turns every dynamic
import of an always-touched module into a prefetch link, with no
manifest-side or Nuxt-config opt-out (`experimental.prefetchPreloadTags`
looks related but gates a different, unrelated opt-in feature). Measured
before the fix, on a generated `read/part-05/chapter-01` page: 5,212
prefetch links, 373KB of a 391KB page (95.4%) — the real rendered content
is ~18KB, matching dev mode (unaffected — Vite dev doesn't build this
manifest) almost exactly. This predates the split-ToC change above (the
glob itself is unchanged, only its `useAsyncData` wrapper was removed), and
without a fix, full-corpus `pnpm generate` does not complete under the
default heap (OOM'd at 87% of 10,313 routes in one measured run).

Fix: `nuxt.config.ts`'s `hooks["build:manifest"]` calls
`stripContentChunkPrefetchHints` (`shared/utils/manifestPrefetch.ts`,
unit-tested — `tests/unit/manifest-prefetch.spec.ts`) against the client
manifest before Nitro embeds it for runtime use. For every manifest entry
whose own key/src lives under `content/parts/` or `content/toc.parts/`, it
clears `prefetch`/`preload` so `vue-bundle-renderer` filters it out of any
page's dependency set; and, belt-and-suspenders, strips any reference to
such an id out of every entry's own `dynamicImports` list. Functionality is
untouched — these chunks still load on demand via the glob's own dynamic
`import()` the moment a page actually needs one; they were never
legitimately prefetchable at this scale.

## Sefaria import

`pnpm import:sefaria (--part <N> | --all) [--dry-run]` (`scripts/import-sefaria.ts`,
run via `tsx`) imports _Talmud Eser HaSefirot_ from the Sefaria API into
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

## SSG / SEO (T10)

- **`runtimeConfig.public.siteUrl`** (`nuxt.config.ts`) is the single source
  of truth for every absolute URL the app emits — canonical links, hreflang
  alternates, `og:url`/`og:image`, `sitemap.xml`, `robots.txt`'s `Sitemap:`
  line. Default `https://readtes.org` (no domain is deployed yet);
  override at build time with `NUXT_PUBLIC_SITE_URL` (Nuxt's standard
  public-runtime-config env convention). `i18n.baseUrl` is wired from the
  same value, so `useLocaleHead()` emits absolute alternates.
- **`app.vue`/`error.vue`** forward `useLocaleHead()`'s `link`/`meta`
  arrays into `useHead` (canonical, hreflang + x-default, `og:url`,
  `og:locale`/`og:locale:alternate`) — every page gets these for free.
  Per-page `<title>`/description/`og:title`/`og:description`/`og:type`/
  `og:site_name`/`og:image` (+ dims/alt)/`twitter:card` come from
  `useLocalizedSeo()` (`app/composables/useLocalizedSeo.ts`), called once
  near the top of each page's `<script setup>`; description copy lives
  under the `seo.*` i18n namespace (real English + Hebrew, not
  placeholder). `public/images/og-card.png` (1200×630, rendered from
  `designs/og-card.html`) is the shared `og:image` for every page — don't
  modify either file.
- **`sitemap.xml`/`robots.txt`** are Nitro server routes
  (`server/routes/sitemap.xml.ts`, `robots.txt.ts`), prerendered into the
  static output (both listed in `nitro.prerender.routes`, since nothing
  links to them for the crawler to find). The URL-list logic is a pure,
  unit-tested function (`shared/utils/sitemap.ts`,
  `tests/unit/sitemap.spec.ts`) over `content/toc.json` — the site's route
  universe is a pure function of the ToC, so no heavyweight sitemap/SEO
  module is needed. `public/robots.txt` was deleted (it's now the dynamic
  route, which derives its `Sitemap:` line from `siteUrl`).
- **Hebrew font subsets.** `@nuxt/fonts`' default subset list is
  latin-only and does not include `hebrew` — the three Hebrew faces
  (Frank Ruhl Libre, David Libre, Heebo) each list
  `subsets: ["latin", "hebrew"]` explicitly in `nuxt.config.ts`'s `fonts`
  block. Inter and Taviraj (no Hebrew glyphs) are left alone. If you add a
  new Hebrew-facing font family, give it the same `subsets` entry or it
  will silently render with zero Hebrew glyph coverage.
- **`404.html`.** `pnpm generate`'s static Nitro preset prerenders
  `/404.html` automatically. Its raw HTML is an empty pre-hydration shell
  (`data-ssr="false"` — Nuxt's standard static-hosting fallback: the file
  exists so a static host serves _something_ with a 404 status for an
  unmatched path, and client-side hydration then renders `error.vue`'s
  styled 404 state once JS runs) — this is expected, not a bug. Verify
  with a headless browser (not just `curl`/viewing raw HTML) if you need
  to confirm the rendered state.
- **Accessibility conventions**: every layout (`default`, `reader`,
  `error.vue`) starts with a visually-hidden skip link to `#main-content`
  (localized via `common.skipToContent`), and exactly one `<main
id="main-content">` landmark. The reader page's toolbar carries that
  page's one `<h1>` (`sr-only`, the chapter title — `ReaderToolbar`'s
  `chapterTitle` prop), since nothing else on that page is heading-shaped.
  Interactive elements get a `focus-visible:outline focus-visible:outline-2
focus-visible:outline-teal` (or the token-derived contrast-safe
  variants below) — match this exact utility set rather than inventing a
  new ring style. Four contrast-driven tokens live in `main.css`:
  `--color-teal-strong` (a darkened teal that clears 4.5:1 against every
  light-mode surface and against white text — use for any "white text on
  a teal background" active/selected state) and the theme-aware
  `--accent-text` semantic variable (teal-strong in light mode, the
  bright `--color-teal` in dark mode — use for teal-colored _text_ sitting
  directly on the ambient surface, e.g. `.tes-anchor`); the same pattern
  repeats for orange — `--color-orange-cta-strong` (a darkened orange
  that clears 4.5:1 against every light-mode surface) and the theme-aware
  `--warning-text` semantic variable (orange-cta-strong in light mode,
  the brighter `--color-orange-cta` in dark mode, where the original
  already clears 4.5:1 — use for the "AI translated" badge / missing-
  anchor notice text). Don't reintroduce plain `text-teal`/`bg-teal` or
  `text-orange-cta` for text-on-surface or white-on-teal contexts; all
  measured under WCAG AA's 4.5:1 there. `--color-orange-cta` itself stays
  fine for non-text uses (badge/notice borders, decorative bullets).

## Testing

Tests live in `tests/unit/**/*.spec.ts` and run under Vitest with the
`@nuxt/test-utils` `nuxt` environment (auto-imports and Nuxt context are
available in tests; use `mountSuspended` from `@nuxt/test-utils/runtime` to
mount components).

Definition of done for any change:

```
task qa && pnpm typecheck && pnpm test && pnpm generate
```

(`task qa` runs `pnpm lint && pnpm format:check`; without go-task, run
`pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm generate`
directly.) All of it must pass before committing.
