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
  sefaria-index-offsets.json                  SefariaOffsetNodesFile — the nodes that don't start at 1, see below
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
- **Chapter kinds have one reading order**, in
  `shared/utils/chapterKinds.ts` (`CHAPTER_KIND_ORDER`): `chapter`,
  `inner-observation`, then the questions lists by subject
  (`terminology`, `topics`, `cause-effect`), then the answers lists in the
  same subject order. `app/`, `scripts/` and `nuxt.config.ts` all import
  it — it used to be copied into four modules with "keep in sync"
  comments. A kind added to `chapterKindSchema` without a position there
  sorts to the front of every part silently (`indexOf` returns -1);
  `tests/unit/chapter-kinds.spec.ts` is what catches that. A new
  `answers-*` kind must also join `CONSOLIDATED_QA_KINDS`
  (`scripts/lib/qa-consolidation.ts`), or the importer writes one chapter
  per answer and undoes #91.
- **Anchor id grammar: `op-<order>`.** Sefaria's inline commentary markers
  (`<i data-commentator="Ohr Penimi" data-label="…" data-order="N">`) become
  anchor id `op-N`, where `N` is `data-order` (continuous per chapter). See
  `app/utils/anchors.ts` (`extractAnchors`, `normalizeAnchors`) and
  `app/utils/sanitizeHtml.ts` for the HTML transforms involved.
- **Commentary items are anchored or unanchored** (issue #79). An item
  _with_ `targetSeif` is anchored — attached to a specific seif via a
  Sefaria Links entry. An item _without_ `targetSeif` is **unanchored**:
  its chapter is known (from the Ohr Penimi ref structure) but its seif is
  not, because Sefaria has no link data for most of the book. Unanchored
  items carry digit labels (`"1"`, `"2"`, … in both languages — the printed
  Hebrew letters restart per seif, which is unknowable), keep the
  `op-<order>` anchorId as identity, render in reading order with a
  "not yet aligned" note, and never participate in per-seif affordances or
  anchor sync. A chapter may mix both. Upgrading unanchored → anchored (via
  a KabbalahMedia-derived mapping, issue #81) is an in-place edit.
- **`pnpm validate:content`** (`scripts/validate-content.ts`, run via
  `tsx`) Zod-validates every JSON file under `content/`, then cross-checks
  integrity: every source segment's `anchors[]` has a matching **anchored**
  `CommentaryItem.anchorId` in some commentary version of the same chapter
  (an unanchored item must never be named by a source anchor); every
  **anchored** item's `targetSeif` exists as a source segment `n`; every
  item, anchored or not, has `anchorId === "op-<order>"` (the id is bound
  as DOM id and Vue key, and for unanchored items no round-trip check can
  catch a malformed one), unique per-file `order`, and non-empty `html`;
  every `toc.json` `availableVersions` entry has a corresponding file on
  disk, and vice versa; and (see "Split ToC" below) `toc.volumes.json` +
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
  volume's parts (2-4 of them, see "Volume grouping" below).

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

## Sefaria index offsets — why a map is committed

Some Sefaria nodes do not start numbering at 1: Section VI's topics tables
start at 31, Section I's Histaklut Penimit chapter 2 starts at paragraph 10.
Sefaria publishes that as `index_offsets_by_depth` on the node, and
`scripts/lib/sefaria-refs.ts` applies it when composing a `sefariaRef`.

That field only exists while an importer holds a freshly fetched index.
`validate-content.ts` has neither network nor index, so it could not tell a
ref that applied its offset from one that dropped it — which is how issue
#103's whole corpus of 404ing refs went unnoticed.
**`content/sefaria-index-offsets.json`** is the fix: 37 nodes, keyed by ref
base, each with its `depth`/`sectionNames` (which decide _which_ address
component an offset lands on) and the offsets themselves. Nodes that start
at 1 are absent.

- `import-sefaria.ts` merges it from the index on every run, so it cannot go
  stale; `pnpm emit:sefaria-offsets` refreshes it alone (one cached request).
  Both merge rather than replace, so `--part N` never narrows it.
- `checkSefariaRefsApplyIndexOffsets` in `validate-content.ts` fails any
  committed ref addressing an item below the first index its node publishes.
- `pnpm migrate:sefaria-refs` is the one-off repair. It **recomposes from
  position**, never from the stored ref — the offset and un-offset numbering
  ranges overlap on half the sections, so a value alone cannot say whether a
  ref has been migrated. It only rewrites a ref it has first reproduced
  byte-for-byte from position, and reports anything it cannot.

## Volume grouping — Bnei Baruch's, not Sefaria's

The sixteen parts are fixed; how they group into six volumes is an editorial
choice and the two upstreams disagree. This site reproduces the **Bnei
Baruch** edition:

| Volume | 1          | 2       | 3        | 4      | 5      | 6      |
| ------ | ---------- | ------- | -------- | ------ | ------ | ------ |
| Parts  | 1, 2, 3, 4 | 5, 6, 7 | 8, 9, 10 | 11, 12 | 13, 14 | 15, 16 |

Sefaria groups the same parts differently (Vol 1 = parts 1-3, …) and we
shipped its arrangement by accident until #85. The grouping lives **only**
in `content/toc.json`'s volume nesting — part ids, chapter ids and every
`/read/...` URL are independent of it. Change it there and re-run `pnpm
emit:toc-splits`; never hand-edit the derived files.

`tests/unit/volume-grouping.spec.ts` pins it, checked against
`tests/fixtures/km-tree/tes-collection.json` — a trimmed slice of Bnei
Baruch's own `kabbalahmedia.info/backend/sqdata` COLLECTION -> VOLUME ->
PART tree, read through `extractKmTesTree` (`scripts/lib/km-tree.ts`), the
same walker the KabbalahMedia importer uses. The spec's docblock carries the
regeneration command and states what the fixture does and does not prove.

**No redirects were added for the #85 regroup, deliberately.** All six
`/volumes/volume-N` URLs exist both before and after; none was added,
removed or renamed. Only the _contents_ of those pages changed, and the
change is not a rename in disguise — old volume 3 held parts 7 and 8, which
now sit in volumes 2 and 3 respectively, so no old volume URL has a single
new home to point at. Redirecting `/volumes/volume-3` anywhere would break a
URL that is still valid and still the right destination. Verified
2026-08-11 (`curl -sSL -o /dev/null -w '%{http_code}'
https://readtes.com/volumes/volume-1` -> `200`, and the fetched HTML still
listed Parts 1, 2, 3): the site **is** live, and its `robots.txt` serves
`User-agent: *` / `Allow: /` and advertises the sitemap (only AI-training
crawlers are disallowed). So this is not an "it isn't published yet, so it
doesn't matter" argument. Whether search engines have actually indexed the
volume URLs was **not** determined — the conclusion above does not depend on
it, because what a stale index costs here is a recrawl, not a broken link.

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

## Glossary (`content/glossary/`) — same split-then-verify scheme

`content/glossary/tes-en.json` is the canonical terminology artifact: 125
terms mined from the 737 chapters where a `he-jerusalem-1956` file and an
`en-bb` file could be aligned item-by-item, each with the canonical English,
the renderings the official edition actually used (with counts), and
Hebrew/English citation pairs. It carries `generatedFrom`, `usage`,
`conventions`, `inconsistencies`, `knownGaps` and `revisions` alongside
`entries`. Schemas: `glossaryFileSchema` and friends in
`shared/types/content.ts`.

It is 307KB, and ~72% of that is `citations` — so it is **build-time only**,
exactly like `toc.json`, and `app/` code must never import it. Two derived,
app-facing files are committed beside it:

- **`tes-en.index.json`** (77KB on disk, 50KB minified) — `meta` (flattened provenance),
  every entry minus its citations plus a `citationCount`, `conventions`, and
  `knownGaps`. Loaded up front by `useGlossaryIndex()`. `inconsistencies`,
  `usage` and `revisions` are deliberately dropped: apparatus for the
  translation run, not for a reader.
- **`tes-en.citations.json`** (216KB on disk, 150KB minified) — the citation pairs keyed by entry
  id. Loaded by `useGlossaryCitations()`'s `loadCitations()` on the first
  time a reader opens a term, never with the page.

Both are direct `await import()` of statically bundled JSON — **no
`useAsyncData`**, same reasoning as `useLocalizedVolumes`. Both are matched
by `isContentChunkId` (`shared/utils/manifestPrefetch.ts`) so neither is
prefetch-eligible on any page, including `/glossary` itself.

**Who emits them**: `scripts/lib/glossary-splits.ts`
(`deriveGlossaryIndexFile`/`deriveGlossaryCitationsFile`, pure;
`writeGlossarySplitFiles`, I/O), run standalone by
`pnpm emit:glossary-splits` (`scripts/emit-glossary-splits.ts`). Unlike the
ToC splits, no importer regenerates these — the canonical glossary is
hand-audited, so run the emit script yourself after editing it.
`scripts/validate-content.ts`'s `checkGlossary` re-derives both files and
structurally compares them against what is on disk, so they can never
silently go stale; it also fails if any `chapterId` cited by an entry or
quoted by a convention is absent from `toc.json` (those become links on
`/glossary`).

Guardrails: `tests/unit/glossary-payload.spec.ts` (no `app/` import of the
canonical file, no static import of either split file, citations stay behind
`loadCitations()`), `tests/unit/glossary-splits.spec.ts` (the derivation).

**`/glossary` is the site's heaviest HTML document, deliberately.** All 125
terms and all 13 house rules are server-rendered: a glossary that browser
find-in-page cannot search, or that needs JavaScript to read, is not a
reference. The cost is paid in markup discipline instead — the row and the
attestation strip are styled from namespaced, _unscoped_ CSS rather than
utility classes, because every character of a `class` attribute and every
`data-v-…=""` scope marker is multiplied by 125 in the prerendered file.
Measured with `wrapper.html()` over the mounted page, comments stripped:
342,276 chars before that change, 190,618 after (per row 2,008 → 880).
`tests/unit/glossary-page-weight.spec.ts` is that measurement, kept as a
budget. If you add markup to `GlossaryEntryRow.vue`, add it to the style
block, not to a `class` attribute.
