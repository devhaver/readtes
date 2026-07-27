---
name: tes-import-kabbalahmedia
description: How scripts/import-kabbalahmedia.ts imports official Bnei Baruch translations as <language>-bb versions — collection walking, strict CLI, supported document dialects, the alignment boundaries it refuses to cross, and coverage/validation behaviour. Use when running, debugging, or modifying the KabbalahMedia importer.
---

# KabbalahMedia import

`pnpm import:kabbalahmedia (--part <N> | --all) [--dry-run]`
(`scripts/import-kabbalahmedia.ts`, run via `tsx`) imports official Bnei
Baruch translations as `<language>-bb` versions. It walks the TES collection
from KabbalahMedia's verified `sqdata` collection root, rather than keeping a
per-chapter uid list. The CLI is deliberately strict: one of `--part` or
`--all` is required; unknown, duplicate, conflicting, and valueless flags
fail before any network request.

- **HTTP hygiene**: it uses the shared cached client and the same descriptive
  User-Agent, ≥600ms real-request interval, and retry/fail-fast policy as the
  Sefaria importer. Cache entries live in `.superpowers/import-cache/`.
- **Supported document dialects**: numbered per-chapter leaves are aligned to
  Hebrew source/commentary ground truth; whole-part chapter documents are
  positionally split into source-only chapter files; combined terminology and
  topics Q&A tables write question and answer chapters positionally. Source
  and commentary are written only when the relevant alignment is verified.
- **Safe boundaries**: whole-part Ohr Pnimi/commentary is intentionally not
  written — there is no reliable Hebrew/Sefaria commentary target for it.
  Inner Observation and unmapped Cause/Consequence-style leaves are reported
  and skipped, never guessed. Parts 9–15 have no non-Hebrew KabbalahMedia
  files and remain explicit coverage absences.
- **Output and validation**: a non-dry run updates layer files,
  `versions.json`, `toc.json`, and derived ToC splits, then runs
  `validateContent`. Only `--all` rewrites the KabbalahMedia-owned section of
  `content/COVERAGE.md`; a scoped `--part` run prints its coverage but leaves
  the committed full-corpus report intact. `--dry-run` performs
  discovery/parsing and prints coverage without writing or validating a
  changed tree.

The content shapes this writes are described in the `tes-content-model`
skill; read that first if you need the schema or the split-ToC rules.
