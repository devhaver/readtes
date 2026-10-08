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

- **Inner Observation, and part 6's Cause and Consequence essay**
  (`ki-inner-observation.ts`). Items are numbered (`1.`, or `1)` on part
  1. and Sefaria's Hebrew segments follow them; whatever precedes an item
     (chapter heading, synopsis, sub-heading) belongs to it, rendered as
     `<small>` like the Hebrew. Where item and segment counts agree (parts 1,
  2. they pair in order, each pair scoring best against its own `en-ai`
     reference, not a neighbour's. Elsewhere (parts 2, 3, 6) each segment
     takes a contiguous run of the page's blocks (`splitIntoRuns`: DP on
     similarity to `en-ai` with a length penalty, never crossing a printed
     `Chapter …` heading when there is one per chapter); every run must pass
     an **edge test** — its first and last substantial paragraphs read as
     its own segment rather than the neighbour's — and open with a
     sub-heading exactly where the Hebrew segment does (`<small>`). The
     Hebrew also places sub-headings: part 1 sets them as short plain
     paragraphs that land at the end of the previous item until
     `settleSubtitles` moves them across. On parts 6/7
     `inner-observation-02` is the Cause and Consequence essay and is taken
     only from that essay's page (part 7 has none).

- **Q&A tables** (`ki-qa.ts`). Two shapes: _list_ (all questions, then all
  answers renumbered from the same first numeral — parts 4, 7) and
  _interleaved_ (numbered question, plain answer — parts 1, 3). BB numbers
  a part's two tables straight through (part 4 topics start at 67) where
  the Hebrew restarts at 1, so pairing is positional and only when counts
  agree. Answers are verified against `en-ai` with the neighbour test; an
  isolated weak pair passes (a shift fails consecutive pairs — part 7's
  terminology answers are out of step at 86-87), two in a row or >10%
  refuse the table. Questions are written only when their answers were and,
  on list pages, every answer repeats its question. Split Hebrew answers get
  one item on the first segment's ref, like KabbalahMedia's `en-bb`.

## Refusals (all reported in COVERAGE.md, nothing partial is written)

- Chapters with unanchored Hebrew notes (part 2 ch 1, part 3 ch 8).
- Any chapter whose seifim/notes are not all matched, or a seif outside
  0.9-3x its Hebrew.
- **Part 8's page is a draft from seif 47**: it repeats seif 47's text as
  48 and one placeholder note under a dozen seifim, then "64 – 95
  (Translation in process)". `truncateAtRepeatedText` cuts the page at the
  first repeated text, so seifim 47+ are never offered.
- Inner Observation chapters failing the edge or sub-heading test (part 3
  ch 5 and 7, both part-6 chapters) and part 7's page, which is far
  shorter than its Hebrew.
- Q&A tables whose counts disagree with the Hebrew (part 1 questions 54 vs
  55, part 3 topics 136 vs 135, part 7 topics 59 vs 64) or are out of step
  (part 7 terminology).
- The Cause and Consequence Q&A and part 5's Additional Explanation are
  reported as not imported yet.

Verification done on the first import (2026-10-08): independent reviewers
compared all 638 notes against `en-ai`/Hebrew (0 mismatches) and all 159
source seifim by beginning and end (one boundary bug, fixed).

Shared invariants (idempotent output, HTTP hygiene, cache in
`.superpowers/import-cache/`, `writeTocSplitFiles`, `validateContent` after
writing; only `--all` rewrites its COVERAGE.md section) are the same as the
other importers — see `.claude/rules/importers.md`.
