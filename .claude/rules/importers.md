---
paths:
  - "scripts/import-sefaria.ts"
  - "scripts/import-kabbalahmedia.ts"
  - "scripts/lib/**"
  - "scripts/emit-toc-splits.ts"
---

# Import scripts

Load **`tes-import-sefaria`** or **`tes-import-kabbalahmedia`** before
changing either importer — each documents its CLI contract, caching, and the
alignment boundaries it deliberately refuses to cross.

Shared invariants:

- **Idempotent.** Stable key ordering and 2-space JSON — a second run against
  unchanged upstream data must leave `git diff` empty.
- **Report, never guess.** An unmapped node or unverified alignment is logged
  and skipped, not imported under an assumed kind.
- **HTTP hygiene**: descriptive User-Agent, ≥600ms between real requests,
  backoff on 5xx/429, fail fast on other 4xx. Cache in
  `.superpowers/import-cache/` (gitignored).
- Both importers call `writeTocSplitFiles` after rewriting `toc.json` — the
  split files can never be left stale.

See the `tes-content-model` skill for the shapes they write.
