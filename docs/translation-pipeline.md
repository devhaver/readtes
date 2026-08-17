# Translation pipeline

How to get a language translated, whoever (or whatever) does the translating.

The pipeline is deliberately **model-agnostic and offline**. `translate:export`
writes self-contained JSON manifests; anything that can read JSON and write JSON
can do the work — this session, another Claude, a different vendor's model, or a
human. `translate:apply` takes the results back.

## The safety property

**Only the translated `html` ever passes through a model.** Every other field on
a commentary item — `anchorId`, `order`, `label`, `sefariaRef`, `section`,
`targetSeif` — is copied byte-for-byte from the Hebrew source by
`translate-apply.ts`.

This is not fussiness. `validate:content` checks neither `section` nor
`sefariaRef`, and checks `label` only for anchored items, so a model quietly
altering one of those would pass every gate and ship. Keeping them out of the
model's reach is what makes it safe to hand a batch to a model nobody here has
evaluated.

## 1. Register the language (once per language)

`content/versions.json` needs an AI version for the target language. English
already has one. For a new language, add:

```json
{
  "id": "bg-ai",
  "language": "bg",
  "direction": "ltr",
  "title": "Български (AI translation)",
  "license": "CC0",
  "source": "ai",
  "translatedFrom": "he-jerusalem-1956"
}
```

`direction` is `"rtl"` for Hebrew and Persian (`fa`), `"ltr"` for everything
else. `source: "ai"` is what makes the reader badge it **AI translated** — that
badge is automatic and must not be removed.

`translate:export` refuses to run without this and prints the exact JSON to add.

## 2. Export the batches

```sh
pnpm translate:export --lang en                 # everything outstanding
pnpm translate:export --lang bg --part part-05  # one part
pnpm translate:export --lang de --budget 12000  # smaller batches
```

Manifests land in `.translation/<lang>/` (git-ignored). Each is standalone:
instructions, the binding glossary, per-chapter context, and the items.

Batches are packed by **source-prose characters**, never item count — items run
from 29 to 37,057 characters. Default budget 20,000. A chapter is never split
across batches; one larger than the whole budget gets a batch to itself.

Re-running is safe and idempotent in the sense that matters: it only ever
exports what no version in that language already covers, so a half-finished
language picks up where it left off.

## 3. Translate

Hand each manifest to whatever is doing the work. The manifest's own
`instructions` field states the contract; the short version:

- Translate only `chapters[].items[].he`. Return one entry per item.
- `glossary.entries` is binding — use `canonicalEn` for every occurrence unless
  the entry's `note` carves out a sense distinction.
- `chapters[].context` is the Ari's text these notes gloss. **Not for
  translation** — it is there so terminology matches the pane the reader sees
  beside the notes, especially `targetText` where it exists.
- Preserve inline HTML (`<b>`, `<br>`, `<small>`) exactly.

Expected result shape:

```json
{
  "batch": "en-060",
  "targetVersionId": "en-ai",
  "translations": [
    { "chapterId": "part-12/chapter-177", "anchorId": "op-1", "html": "…" }
  ]
}
```

## 4. Apply

```sh
pnpm translate:apply --file result.json --dry-run   # see what would happen
pnpm translate:apply --file result.json
```

It refuses the whole file — writing nothing — if any item is missing, duplicated,
empty, unknown to the Hebrew source, already translated, or still mostly Hebrew
(untranslated passthrough). Then it writes the files, adds the version to each
chapter's ToC entry, and re-derives the split ToC files.

## 5. Gate

```sh
pnpm validate:content
task check
```

Commit one part at a time, matching the existing history
(`feat(content): translate part N Ohr Pnimi commentary to <language>`). No AI
attribution in the commit — the `en-ai`-style badge in the UI is the one place
AI authorship is declared, and the version registry already handles it.

## Scale

Measured 2026-08-13, English:

```
chapters      783
items       1,255
source    2,106,747 characters
batches       121 at a 20,000-character budget
```

Every other language starts from zero — 2,088 source chapters and 1,654
commentary items each — so English is the smallest of the thirteen.

## Quality note

The glossary was mined from parts 1, 2, 3, 5 and 6, but **99.5% of the
untranslated commentary lives in parts 7–16**. Its 125 terms are binding
everywhere, but it has not seen the vocabulary of the parts being translated.

Translate one part, review it against the Hebrew, then scale. `--part` exists
for exactly that. Two supplements to the manifest glossary are binding for
English and live in this repo:

- **`docs/translation-terminology.md`** — every terminology call settled since
  the run began. Read it before translating; append new decisions after.
- **`scripts/translation-gates/`** — mechanical verification scripts (below).

## Running a session — the orchestration playbook

Proven shape (2026-08-15): an orchestrator fans batches out to **4–6
translator agents concurrently**, gates every returned batch, then applies,
checks and ships once per round. 267 items merged in one such session versus
97 sequential. If a single AI is doing the work alone the same gates and rules
apply — only the fan-out disappears.

Each round:

1. `git checkout main && git pull --ff-only`, then re-export. **Batch ids are
   not stable** — the export recomputes what is untranslated, so after every
   apply everything renumbers. Always take `en-001..N` fresh; never assume
   "batch N" still means anything.
2. Split each manifest before handing it over: extract `chapters` into its own
   file and put the `instructions` + `glossary` into a shared brief written
   once. **Never hand a translator the raw manifest** — it is ~3,300 lines and
   the glossary alone consumes a whole read budget.
3. Give each translator: the brief, its chapters file, its **exact item
   count**, and the part-specific pane guidance (below). Require the output
   file to be **rewritten every 3–5 items** — agents die mid-batch (server
   errors, session limits) and incremental writes are what makes a partial
   batch recoverable. A partial batch is shippable; the exporter re-lists
   whatever is missing next round.
4. Gate every returned batch (next section). Fix what the gates flag.
5. Apply all batches, run `task check` **once**, one PR per round, merge,
   re-export.

### The four gates

`task check` cannot see a wrong word. These can — run all four on every batch:

1. **`scripts/translation-gates/driftcheck.py`** — item-set equality and
   order, tag counts (`<b>`/`<br>`/`<small>`) against the source, straight
   quotes, Hebrew leakage outside bracketed glosses, banned terms, required
   citation renderings, and the expansion ratio. The ratio bounds
   (1.35–2.30, median ≈1.79) were **measured over the merged corpus** — if
   they ever need adjusting, recalibrate from real data, don't guess. Run as
   `TX_SCRATCH=<dir> python3 scripts/translation-gates/driftcheck.py en-001 …`
   where `<dir>` holds `chs-<batch>.json` (the extracted chapters) and
   `out-<batch>.json` (the returned translations).
2. **Independent gematria recomputation** — verify every `דף X` page number
   and every letter marker against the English with your own letter table,
   not the translator's. Across ~200 checks this has caught zero translator
   errors and one genuine source lacuna — it is cheap and keeps everyone
   honest.
3. **`scripts/translation-gates/lemmacheck.py`** — n-gram overlap of each
   bolded lemma against the pane line it quotes (`context.targetText`).
   Catches lemma drift nothing else can see.
4. **Corpus arbitration** — before settling any disputed term, count it in
   both layers (`grep -ro … *.en-ai.json | wc -l` vs `*.en-bb.json`, from the
   repo root) and let the corpus decide. Record the outcome in
   `docs/translation-terminology.md`.

### The prose/lemma rule — the central editorial decision

Some parts' `source.en-ai` pane came from an earlier translation effort with
different vocabulary than this commentary corpus.

- **Running prose follows the corpus** — the commentary must read as one work.
- **A bolded `<b>` lemma follows the pane**, because a lemma quotes the Ari
  and the reader matches those words against the adjacent pane.
- **Unless the pane is self-inconsistent** (part 8 always is — it writes
  Chochma/Hochma, Abba/Aba, smallness/Katnut in adjacent chapters). Then use
  the settled corpus form everywhere, lemmas included.
- **Where the pane is unreliable, the Hebrew decides**: spelled-out
  `אריך אנפין` → Arich Anpin, abbreviated `א"א` → AA — same rule for every
  name.
- **`targetText` is never the official English.** `translate-export.ts` reads
  `source.<targetVersionId>.json`, so for an `en-ai` run the pane is the
  `en-ai` source layer — the earlier translation effort — in every part. An
  earlier version of this line claimed part 9 onward carried official `en-bb`
  text and it is wrong; a round-7 ruling was argued from it before the code
  was checked. The pane still governs lemmas, but because the **reader sees
  it beside the note**, not because it is authoritative.
- **Test self-inconsistency per chapter, not per part.** Part 9's panes print
  both "Nesirah" and "sawing" inside the _same_ chapter, and part 10's mix
  `Ibur` (26) with "pregnancy" (8) — in both cases the exception fires and
  the corpus form wins in the lemma too.

### Standing translator instructions

- **Printer's errors are everywhere in parts 7–9** (`אף` for `דף`, `כבד` for
  `כבר`, unclosed parentheses). Never silently emend — translate what is
  printed and report the suspected error.
- Two-sense abbreviations are read from the sentence, never applied blindly:
  `ה"ר` is usually "first Hey" but in part 8 often `ה' ראשונות` → "the first
  five"; `ה"ס` is usually "is the secret of" but sometimes `ה' ספירות` →
  "five Sefirot".
- Expansion runs ≈1.75× the Hebrew character count — every abbreviation
  Baal HaSulam compresses expands to a full English phrase. The run is
  generation-bound; bigger batch budgets save nothing, only parallelism helps.
