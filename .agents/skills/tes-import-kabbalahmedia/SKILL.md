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
- **Hebrew-guided fallback (non-English only)**: a leaf chapter document
  the styled dialect does not parse — every Russian one — goes through
  `alignKiChapterPage` (`ki-chapter-page.ts`, shared with the kabbalah.info
  importer): seif by seif and note by note against the Hebrew, numerals
  `N.`/`N)`/`(N)`, the "Ор пними" marker, all-or-nothing per chapter, notes
  labelled with the numeral their own language prints. English is excluded:
  these documents set some headings as plain sentences, and kabbalah.info's
  English (bold headings) is the better source. A `ua` document must
  actually be Ukrainian (і/ї/є/ґ frequency) — one part 3 "Ukrainian" file
  is Russian.
- **The Introduction is a stand-alone article.** `part-01/introduction-01` is
  not in the collection tree: Bnei Baruch publish it as article `OqZMFGHu`,
  one docx per language beside a Hebrew one, so the importer fetches it by
  that id whenever part 1 is in scope (`scripts/lib/km-introduction.ts`;
  Italian is skipped, it is not in `KM_EXPECTED_LANGUAGES`). The numbered
  sections (`1)` … `156)`, 71 missing from the manuscript) are the anchor. The
  Hebrew document's words are diffed against our 443 segments, so each of its
  paragraphs lands in the first segment its words fall in; each language's
  paragraphs are then paired with the Hebrew's section by section on character
  length, and a segment that receives several joins them as `tes-para` spans.
  An opener counts only when it carries the number expected _next_ (Portuguese
  prints none — list numbering, with a stray "71" paragraph — and other
  documents number in-text items). A language is refused, and its committed
  file kept, when its sections are not that sequence, the Hebrew document is
  not our Hebrew, more than 5% of the Hebrew is left untranslated, or a
  section is over 2× the language's median length (duplicated or misnumbered).
  A section under 0.4× is Bnei Baruch's own abridgement — de, pt and tr
  shorten section 156 (0.16–0.19×) — so it skips the DP: the whole
  translation goes under the section's first segment, with a warning. The
  floor is 0.4 because the Aramaic Zohar sections (31, 35) legitimately
  measure about 0.5 in Russian and Turkish. Measured 2026-10-09: en, ru, es,
  fr, uk, de, pt and tr all import.
- **Safe boundaries**: whole-part Ohr Pnimi/commentary is intentionally not
  written — there is no reliable Hebrew/Sefaria commentary target for it.
  Inner Observation is reported and skipped, never guessed. Parts 9–15 have
  no non-Hebrew KabbalahMedia files and remain explicit coverage absences.
- **A refusal never deletes.** The stale-output sweep removes committed
  KabbalahMedia files this run did not produce — but "did not produce" also
  covers every refusal (an alignment it could not verify, a dialect it does
  not parse, a language whose file was missing today), and treating those as
  stale deleted committed English whenever one happened (issue #111). The
  sweep now skips any chapter for which this run recorded a non-`imported`
  outcome, and says so.
- **Q&A answers align per answer, not per chapter or per item.** Issue #91
  folded every answer of a kind into one chapter whose items carry the
  answer number as `n`, with the rare split answer sharing an `n`. The
  importer aligns a document's blocks against
  `firstSegmentPerAnswer` (`scripts/lib/qa-consolidation.ts`) — counting
  chapters instead (always 1 post-#91) made every part's Q&A unimportable.
- **Cause and Consequence** is Bnei Baruch's name for Sefaria's Cause and
  Effect. The Q&A tables map to `questions-cause-effect`/
  `answers-cause-effect`; the _essay_ of that name is Sefaria's
  `Histaklut Penimit 2`, already in the corpus as `inner-observation-02`,
  and carries a role of its own so it is reported rather than re-imported.
- **Output and validation**: a non-dry run updates layer files,
  `versions.json`, `toc.json`, and derived ToC splits, then runs
  `validateContent`. Only `--all` rewrites the KabbalahMedia-owned section of
  `content/COVERAGE.md`; a scoped `--part` run prints its coverage but leaves
  the committed full-corpus report intact. `--dry-run` performs
  discovery/parsing and prints coverage without writing or validating a
  changed tree.

The content shapes this writes are described in the `tes-content-model`
skill; read that first if you need the schema or the split-ToC rules.
