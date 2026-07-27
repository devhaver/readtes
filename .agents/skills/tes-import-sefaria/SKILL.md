---
name: tes-import-sefaria
description: How scripts/import-sefaria.ts pulls Talmud Eser HaSefirot from the Sefaria API into content/ — CLI flags, HTTP hygiene and caching, idempotency guarantees, what it refuses to guess, and the COVERAGE.md report. Use when running, debugging, or modifying the Sefaria importer or its helpers in scripts/lib/.
---

# Sefaria import

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

The content shapes this writes are described in the `tes-content-model`
skill; read that first if you need the schema or the split-ToC rules.
