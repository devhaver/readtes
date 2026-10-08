---
name: tes-import-kabbalah-info
description: How scripts/import-kabbalah-info.ts imports Bnei Baruch's web edition of TES (kabbalah.info) as the en-bb-kabbalah-info version — page dialects, Hebrew-guided chapter alignment, whole-part Ohr Pnimi alignment by structure + similarity to en-ai, the refusals and the corrupt part-8 page. Use when running, debugging, or modifying the kabbalah.info importer.
---

# kabbalah.info import

`pnpm import:kabbalah-info (--part <N> | --all) [--dry-run]`

Bnei Baruch publishes the same official English as its KabbalahMedia
documents at `https://www.kabbalah.info/en/<slug>/`, and there it is far
more complete: the Ohr Pnimi (Inner Light) of parts 1-8 and 16, part 4's
chapters, part 8's seifim. It is imported as **`en-bb-kabbalah-info`**
(`source: "kabbalah-info"`), written **only for a chapter layer `en-bb`
does not have** — the two never compete for a layer, and the reader's
English chain is `en-bb` → `en-bb-kabbalah-info` → … → `en-ai`, so the AI
badge disappears wherever this version lands. A separate version id also
keeps the KabbalahMedia importer's stale sweep (which owns every
`source: "kabbalahmedia"` file) from ever deleting these.

## Pages and dialects

The ToC is read from any article page's sidebar; titles are classified by
keyword (`ki-page.ts`). Article text is a flat run of `p`/`h*`/`li` blocks;
**bold = the Ari's text** (≥95% of letters inside `strong`, because the
editor splits words across runs), and `Inner Light`/`Ohr Pnimi` marker
blocks open commentary.

- **Per-chapter pages, parts 1-4** (`ki-chapter-page.ts`). The markup is
  too irregular to parse alone — numbered synopses before seif 1, plain or
  bold seif heads, headings in any tag, a seif numeral glued to the end of
  the previous heading. So the walk is **guided by the Hebrew**: the next
  seif opens only on its numeral _and_ the printed marker of its first
  anchor; the next note only on its printed numeral (gematria of its Hebrew
  letter) once every note of the current seif is seen. Matching is
  sequential, so the alphabet restarting after ת is not ambiguous.
  Unnumbered blocks inside a seif are held until what follows decides
  (marker → tail; next seif → heading, unless long and the seif is still
  short of its Hebrew).
- **Whole-part pages, parts 5-8, 16** (`ki-whole-part.ts`,
  `ki-whole-part-align.ts`). Source: seif K → `chapter-K`, plausibility
  band 0.9-3x the Hebrew. Ohr Pnimi: Sefaria's Ohr Penimi chapter K is
  (nearly always) the notes on seif K, but its items carry no printed
  numeral, so notes are placed by **structure** (same count under seif K)
  and by **content** (`ki-similarity-align.ts`: monotone DP, tf-idf cosine
  against `en-ai`, within ±2 seifim). Where `en-ai` exists, content must
  place every note and structure can only veto; with no `en-ai` (part 16),
  structure decides.

## Refusals (all reported in COVERAGE.md, nothing partial is written)

- Chapters with unanchored Hebrew notes (part 2 ch 1, part 3 ch 8).
- Any chapter whose seifim/notes are not all matched, or a seif outside
  0.9-3x its Hebrew.
- **Part 8's page is a draft from seif 47**: it repeats seif 47's text as
  48 and one placeholder note under a dozen seifim, then "64 – 95
  (Translation in process)". `truncateAtRepeatedText` cuts the page at the
  first repeated text, so seifim 47+ are never offered.
- Inner Observation, the Q&A tables, Cause and Consequence and part 5's
  Additional Explanation are reported as not imported yet.

Verification done on the first import (2026-10-08): independent reviewers
compared all 638 notes against `en-ai`/Hebrew (0 mismatches) and all 159
source seifim by beginning and end (one boundary bug, fixed).

Shared invariants (idempotent output, HTTP hygiene, cache in
`.superpowers/import-cache/`, `writeTocSplitFiles`, `validateContent` after
writing; only `--all` rewrites its COVERAGE.md section) are the same as the
other importers — see `.claude/rules/importers.md`.
