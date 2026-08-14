# Read TES — Agent Notes

Read TES is a static (SSG) web app for reading _Talmud Eser Sefirot_ in its
three-part study structure: the Ari's source text, Baal HaSulam's _Ohr Pnimi_
(Inner Light) explanation, and _Histaklut Pnimit_ (Inner Observation) as the
deeper part-level explanation. It is multilingual including Hebrew RTL and
fully self-contained — no runtime APIs, everything ships as a prerendered
static site.

## Operating brief — read this first

This file is the always-loaded instruction source for every agent. Keep it
short: detail belongs in a skill (see "Skills" below), not here.

Claude is the default implementer. Other agents are occasional, so assume you
are starting cold:

- **Git is allowed when explicitly requested** — branch, stage, commit, push,
  open a PR. Never bypass branch protection or required review, and never
  commit work nobody asked you to commit; when the brief doesn't mention git,
  leave the changes in the working tree and stop. A `workspace-write` sandbox
  may be unable to write `.git` at all — if so, say so rather than silently
  skipping the commit.
- **No AI attribution anywhere** — no `Co-Authored-By` trailers, no
  "generated with" footers, no "written by" notes in code, comments, or docs.
  The single exception is the `en-ai` translation version, which **must** be
  badged "AI translated" in the UI.
- **Docker is available** — verified reachable from an agent shell on
  2026-07-27 (`docker run` and `docker compose` both work; Compose v5.3.0).
  An earlier version of this file claimed the socket was unreachable; that is
  no longer true. Build and run containers rather than handing them over
  untested. If a sandbox _does_ block it, say so instead of assuming.
- **Run the gates.** Don't claim a change is done without `task check`
  passing (see "Definition of done").
- **Flag mismatches, never guess.** If this file disagrees with the code, or
  a brief asks for something the repo can't support, say so explicitly in
  your summary instead of silently picking an interpretation.
- **Stay in scope.** Don't refactor product code beyond the brief. If you
  believe an out-of-scope change is genuinely required, make it separately
  and call it out so it can be split into its own commit.
- Conventions in "Code conventions" are not suggestions.

## Skills — load on demand

Detailed reference lives in [Agent Skills](https://agentskills.io) under
`.agents/skills/`, loaded only when a task needs them. Read the matching
skill before working in these areas:

| Skill                      | Read it when working on                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `tes-content-model`        | `content/`, schemas, ToC/glossary splits, anchors, `validate:content` |
| `tes-import-sefaria`       | `scripts/import-sefaria.ts`                                           |
| `tes-import-kabbalahmedia` | `scripts/import-kabbalahmedia.ts`                                     |
| `tes-seo-ssg`              | SEO, sitemap, canonical, prerender, fonts, contrast tokens            |
| `tes-testing`              | `tests/unit/`, Vitest setup, guardrail specs                          |
| `tes-pnpm-setup`           | A fresh clone or install failing                                      |

`.claude/skills/` holds symlinks to these same directories, because Claude
Code reads only `.claude/skills/`. Edit the file under `.agents/skills/` —
never replace a symlink with a copy.

## Commands

`Taskfile.yaml` (go-task v3) wraps the pnpm scripts — prefer it day to day.
`task --list-all` shows every task. Without go-task, use the pnpm script of
the same name.

| Task                     | What it does                                                    |
| ------------------------ | --------------------------------------------------------------- |
| `task dev`               | Dev server in Docker — http://localhost:6217                    |
| `task dev:host`          | Dev server on the host, no container — same ports               |
| `task setup`             | `pnpm install --frozen-lockfile`                                |
| `task check`             | The full gate — see "Definition of done"                        |
| `task qa`                | `pnpm lint && pnpm format:check`                                |
| `task test`              | `vitest run`                                                    |
| `task test:e2e`          | Playwright against the generated production artifact            |
| `task generate`          | Static site generation — this is what gets deployed             |
| `task import -- <flags>` | `pnpm import:sefaria <flags>`, e.g. `task import -- --part 1`   |
| `task clean`             | Remove `.nuxt`, `.output`, `coverage`, `node_modules`, `.task`  |
| `task docker:prod`       | Build + serve the static output via nginx — :6219               |
| `task docker:build`      | Build both images without starting anything                     |
| `task docker:clean`      | Remove this project's containers, volumes, images               |
| `task prod`              | Build the SSR bundle + serve with the Nitro Node server — :6219 |

Other pnpm scripts: `build` (SSR build, not the deploy target — needs
`NODE_OPTIONS=--max-old-space-size=8192`, the full-corpus SSR bundle exceeds
V8's default heap; `task prod` sets this), `preview`, `start` (run the built
`.output/server/index.mjs`), `lint:fix`, `format`, `typecheck` (`nuxi
typecheck` **and** `vue-tsc -p tsconfig.scripts.json` for
`scripts/`/`tests/`/`shared/`), `validate:content`, `emit:toc-splits`,
`emit:glossary-splits`, `emit:sefaria-offsets`, `import:kabbalahmedia`,
`migrate:sefaria-refs`, `migrate:commentary-labels`,
`migrate:translated-markers`.

A first `pnpm install` in a fresh clone prints `ERR_PNPM_IGNORED_BUILDS` and
stops build scripts short — that's expected; see the `tes-pnpm-setup` skill.

## Dev server ports

`nuxt.config.ts` pins `devServer.port` to **6217** and Vite's HMR websocket to
**6218** (`vite.server.ws.port`), instead of the Nuxt defaults, so it never
collides with another local dev server. Use these ports when referencing the
dev server directly (proxies, browser automation) rather than guessing 3000.

## Docker

`Dockerfile` is multi-stage: `base` (node 24 + pnpm pinned to the
`packageManager` field) → `deps` → `development` / `build` → `production`.

- **`deps` installs with `--ignore-scripts`.** This package's postinstall is
  `nuxt prepare`, which needs `nuxt.config.ts` and the source tree; neither
  exists at that layer. Every downstream stage runs `nuxt prepare` itself.
- **`PNPM_HOME=/pnpm` is load-bearing.** pnpm's store goes to
  `$PNPM_HOME/store`, which is what the `--mount=type=cache` targets. Without
  it the cache mount is a silent no-op and every build re-downloads.
- **`production` is nginx, not node.** `nuxt generate` emits static files with
  no server entrypoint, so there is nothing for `node .output/server/index.mjs`
  to run. `docker/nginx.conf` handles the 404 status, immutable asset caching,
  and gzip. (The static image is for verifying the _deploy artifact_; to run
  the actual Nitro Node server instead — the weburz production shape — use
  `task prod`, which builds the SSR bundle with an 8GB heap and runs
  `node .output/server/index.mjs` on :6219.)
- **`NUXT_PUBLIC_SITE_URL` is a build arg**, baked into every absolute URL. A
  static site has no runtime config to correct it afterwards.
- Dev bind-mounts the whole repo root with anonymous volumes shadowing
  `node_modules` and `.nuxt` — the host's are glibc, the container is
  alpine/musl.

## Code conventions

- **Arrow functions only.** `const doThing = () => { ... }`, including
  composables and inner helpers — never `function doThing() {}`.
- **Composable naming: `useAdjectiveX`**, not `useVerbX` — e.g.
  `useFormattedDate`, not `useFormatDate`. The inner formatter function can
  stay verb-shaped (`formatDate`).
- **`computed()` wrappers for fetch-derived data.** Data derived from
  `useFetch`/`useAsyncData` that feeds a template or a table should be
  wrapped in `computed()` up front.
- **Named unions over `unknown` in generics.** When a shared component's
  generic constraint needs widening, list the concrete value types (e.g.
  `Record<string, string | number | Date>`) — `unknown` blocks typed work
  later (sorting, comparators, formatters).
- **`Intl.DateTimeFormat` instantiated once, reused.** Don't call
  `Date.prototype.toLocaleDateString()` repeatedly.
- **Logical CSS properties/utilities only.** Hebrew RTL is first-class:
  always `ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`, never the physical
  `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`.
- **Design tokens only, never hardcoded hex.** Colours, radii, and font
  families come from `designs/untitled.pen` via the `@theme` block in
  `app/assets/css/main.css`. Components read semantic CSS variables
  (`--surface`, `--surface-raised`, `--text-primary`, `--text-muted`,
  `--border`) for anything that changes between light/dark, and the raw
  `--color-*` / `--radius-*` / `--font-*` tokens as Tailwind utilities
  (`bg-navy-primary`, `rounded-card`, `font-hebrew`) otherwise. Never write
  a literal hex value in a component. Contrast-safe variants: see
  `tes-seo-ssg`.
- **Prettier owns formatting, ESLint owns correctness.** `eslint.config.mjs`
  has `stylistic` off and appends `eslint-config-prettier` last. Run
  `pnpm format` instead of hand-formatting. `content/` is excluded via
  `.prettierignore` — the importers own that formatting.
- **Accessibility lint is on and error-level.**
  `eslint-plugin-vuejs-accessibility`'s `flat/recommended`, plus explicit
  `error`-level `alt-text`, `anchor-has-content`,
  `click-events-have-key-events`, `form-control-has-label`,
  `heading-has-content`, `label-has-for`. Fix real violations rather than
  disabling the rule inline.

## Git / PR rules

- **No AI attribution anywhere** — in commits, PRs, or issues.
- Conventional-commit style subjects (`feat:`, `fix:`, `chore:`, …).

## Layout map

```
app/
  assets/css/main.css   Tailwind v4 entry point + @theme design tokens + light/dark semantic vars
  components/
    app/                App-shell components (header, nav, footer, …)
    ui/                 Generic/presentational primitives (button, card, …)
    library/            Text-library browsing components (index, search, …)
    reader/             Reader components (Ari / Inner Light / Inner Observation)
  composables/          useX composables (includes useLocalizedSeo — per-page SEO meta)
  utils/                Plain helper functions (non-composable)
  layouts/              Nuxt layouts (default, reader)
  pages/                Nuxt file-based routes
server/routes/          Nitro server routes — sitemap.xml.ts, robots.txt.ts (both prerendered)
content/                Source content (schema + data), committed JSON
i18n/locales/           Translation message files (en.json/he.json) for @nuxtjs/i18n
scripts/                Import/validate scripts + scripts/lib/ (their pure helpers)
shared/types/           Types shared between app code and scripts/content tooling
shared/utils/           Pure helpers shared between app and server code — directly unit-testable
tests/unit/             Vitest unit tests
designs/                Design sources — untitled.pen (tokens), og-card.html (social card)
```

## Definition of done

```
task check
```

Runs every gate: `qa` (lint + format:check), `typecheck`, `validate:content`,
`test`, `generate`, and the Playwright browser acceptance suite. Without
go-task:

```
pnpm lint && pnpm format:check && pnpm typecheck && pnpm validate:content && pnpm test && pnpm generate && pnpm test:e2e
```

All of it must pass before committing.

GitHub Actions runs the same gate for every pull request and push to `main`.
Successful `main` builds retain `.output/public` as a seven-day deployment
artifact built with `NUXT_PUBLIC_SITE_URL=https://readtes.com`.

## Instruction files

- **`AGENTS.md`** (this file) — the complete standalone reference, read
  natively by Codex, Cursor, Copilot, Gemini CLI, Zed, Amp and others. Kept
  self-contained so a cold non-Claude run is productive with this file alone.
- **`CLAUDE.md`** — Claude Code reads only this. It does **not** import
  `AGENTS.md`; Claude gets a short always-on rule set plus `.claude/rules/`
  (path-scoped, auto-loading) and `.agents/skills/` on demand. The ~15 lines
  of invariants duplicated between the two files are deliberate: each tool
  needs them always-on, and neither reads the other's file. Change both.
- **`.github/copilot-instructions.md`** — a symlink to this file, kept
  because VS Code Copilot still prefers that path. `GEMINI.md` and
  `.cursorrules` were removed: Gemini CLI and Cursor both read `AGENTS.md`
  natively now, and Cursor has deprecated `.cursorrules` outright. Never
  replace the remaining symlink with a copy.
