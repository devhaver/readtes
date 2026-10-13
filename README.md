<div align="center">

<img src="public/images/og-card.png" alt="Read TES" width="640">

# Read TES

**Read _Talmud Eser Sefirot_ the way it is studied — the Ari's text, Inner Light, and Inner Observation side by side.**

[![Nuxt](https://img.shields.io/badge/Nuxt-4.5-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![pnpm](https://img.shields.io/badge/pnpm-11.15-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Deploy](https://img.shields.io/badge/deploy-Nuxt%20server-0EA5E9)](#deployment)

</div>

---

## What this is

_Talmud Eser Sefirot_ ("The Study of the Ten Sefirot") is Baal HaSulam's
systematic exposition of Kabbalah — six volumes, sixteen parts, **5,148
chapters**. It is hard to read linearly, because each passage of the ARI's
source text is meant to be read alongside its commentary.

Read TES presents the work's three-part study structure at once:

| Layer                 | What it is                                                          |
| --------------------- | ------------------------------------------------------------------- |
| **The Ari's text**    | The numbered source passages explained by Baal HaSulam              |
| **Inner Light**       | _Ohr Pnimi_, Baal HaSulam's explanation anchored to the Ari's words |
| **Inner Observation** | _Histaklut Pnimit_, the deeper systematic explanation for the part  |

Anchors between the Ari's text and Inner Light are bidirectional: tap a marker
in either pane and its counterpart scrolls into view. Inner Observation is a
continuous, part-level study text and therefore reads independently.

**Hebrew is first-class, not an afterthought.** RTL layout, Hebrew display and
reading faces with proper glyph subsets, and logical CSS properties throughout —
the interface mirrors rather than breaks.

---

## Quick start

### With Docker

```bash
task dev                 # http://localhost:6217
```

Hot reload against your working tree, with `node_modules` kept container-local.

### Without Docker

```bash
task dev:host            # http://localhost:6217
```

Requires **pnpm 11** and **Node 24+**. Without [go-task](https://taskfile.dev),
use the underlying `pnpm` scripts of the same name.

> **Ports are deliberately odd.** The dev server is **6217** and Vite's HMR
> socket is **6218**, not the Nuxt defaults, so this never collides with another
> local project.

---

## Commands

| Task                   | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `task dev`             | Dev server in Docker, hot reload                                  |
| `task check`           | **The full gate** — lint, format, typecheck, content, test, build |
| `task test`            | Vitest suite (47 spec files)                                      |
| `task generate`        | Static site generation — this is the deploy artifact              |
| `task dev:host`        | Dev server on the host, no container                              |
| `task prod`            | Build the SSR bundle + serve with the Nitro Node server (`:6219`) |
| `task docker:prod`     | Build + serve the real static output via nginx (`:6219`)          |
| `task import -- --all` | Re-import the corpus from Sefaria                                 |
| `task clean`           | Remove build artifacts and dependencies                           |

`task --list-all` shows everything.

---

## The corpus

|               |                                      |
| ------------- | ------------------------------------ |
| **Volumes**   | 6                                    |
| **Parts**     | 16                                   |
| **Chapters**  | 5,148                                |
| **Languages** | Hebrew (complete), English (partial) |

### Text versions and licensing

Every passage is attributed. The reader lets you switch between versions and
shows which one you're reading.

| Version                | Lang | Source        | License              |
| ---------------------- | ---- | ------------- | -------------------- |
| `he-jerusalem-1956`    | he   | Sefaria       | Public Domain        |
| `en-sefaria-community` | en   | Sefaria       | CC0                  |
| `en-curated`           | en   | Read TES      | CC-BY                |
| `en-bb`                | en   | KabbalahMedia | Used with permission |
| `en-ai`                | en   | Machine       | CC0                  |

> **`en-ai` is machine-translated and always carries a visible "AI translated"
> badge in the interface.** Where an official Bnei Baruch translation exists it
> is preferred; `en-ai` only fills gaps, and never silently.

---

## Architecture

**Zero runtime APIs.** Every page is prerendered. All content is committed JSON
under `content/`, validated by Zod schemas — the import scripts are build-time
tooling, and the shipped site makes no network calls for text.

**The ToC is split three ways.** `content/toc.json` is 2.9 MB, and loading it in
app code put the entire table of contents into every page's payload — 391 KB
reader pages and hour-scale builds. App code reads `toc.volumes.json` (~17 KB)
and one `toc.parts/part-NN.json` at a time instead. A unit test fails the suite
if anything under `app/` imports the full file again.

**The glossary is split the same way.** `content/glossary/tes-en.json` — 125
terms of TES with the English the official edition uses for each, read off the
737 chapters where the Hebrew and English align — is 307 KB, roughly seventy
percent of it citation excerpts. `/glossary` loads a derived 77 KB index up
front and fetches the 216 KB of excerpts only when a reader opens a term.
Neither chunk is prefetchable, so no other page pays for it.

```
app/           Components, composables, pages, layouts
content/       Committed JSON corpus + schemas
i18n/locales/  en.json / he.json
scripts/       Import + validation tooling (build-time only)
server/routes/ Prerendered sitemap.xml and robots.txt
shared/        Types and pure helpers used by both app and scripts
tests/unit/    Vitest specs, including architectural guardrails
designs/       Design tokens and the social-card source
```

---

## Testing

```bash
task test
```

47 spec files. Four of them are **guardrails rather than unit tests** — they
enforce the no-full-ToC-import rule, content integrity across the committed
tree, sitemap generation, and the build-manifest prefetch fix. If one fails,
the change is wrong, not the test.

---

## Deployment

Production is the Nuxt/Nitro Node image published to GHCR and run by Coolify.
Reader pages render on request, so all nine locales have real indexable pages
without a static host's artifact limits. HTML responses carry shared-cache
headers for an optional CDN. No database or runtime content API is required.

Run the production shape locally with:

```bash
task prod                # http://localhost:6219
```

Or build and run the exact container Coolify deploys:

```bash
task docker:server       # http://localhost:6220
```

The full gate still runs `pnpm generate` as an independent static regression
check, followed by browser acceptance tests. It is validation, not the
deployment artifact. See `docs/deploy-coolify.md` for production operations.

---

## Working on this

`CLAUDE.md` and `AGENTS.md` carry the conventions, and `.agents/skills/` holds
task-specific reference that loads on demand. The short version:

- Arrow functions only; composables are `useAdjectiveX`
- Logical CSS properties only — never `ml-`/`mr-`/`left-`/`right-`
- Design tokens only, never a literal hex
- `task check` passes before every commit

---

## License

The code in this repository is licensed under the **MIT License** — see
`LICENSE`. Text content is licensed per version; see the table above. The Bnei
Baruch / KabbalahMedia translations are used with permission and are not
covered by the repository-wide license.
