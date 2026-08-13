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
for exactly that.
