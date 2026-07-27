---
name: tes-content-model
description: The committed-JSON content model under content/ — file layout, Zod schemas, chapter/anchor id grammar, validate:content integrity checks, and the split-ToC scheme (toc.volumes.json + toc.parts/*.json) that keeps app payloads small. Use when touching anything in content/, shared/types/content.ts, app/utils/toc.ts, the ToC composables, or when a content validation check fails.
---

# Content model

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

## Split ToC (`toc.volumes.json` + `toc.parts/*.json`) — app-facing, `content/toc.json` is build-time only

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

## Content-chunk prefetch-link stripping

`nuxt.config.ts`'s `build:manifest` hook.
`useChapterContent`'s `import.meta.glob("../../content/parts/**/*.json")`
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
