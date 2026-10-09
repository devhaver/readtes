## Run rules for translations other than English (binding)

These override anything above that conflicts. They are the language-neutral
core of `docs/translation-rules.md`, which governs the English run.

### Sources, in order of authority

1. **The Hebrew** (`he`) is the text you translate. Always.
2. **Your language's terminology table** (`terms-<lang>.md`, appended to this
   brief) decides every term it lists. It was mined from Bnei Baruch's own
   translations into your language; where it says PROPOSED, use it anyway and
   report if it reads wrong.
3. **The English reference** (`en` on each item) is the published English of
   the same passage — Bnei Baruch's where it exists, otherwise a translation
   that went through thirteen gated rounds. Use it to decode abbreviations
   (`ה"ס`, `או"א`, `בחי"ד` …), citations and hard syntax. Never translate
   _from_ it, and never copy its English transliteration habits into your
   language — your table decides spellings. When it and the Hebrew disagree,
   follow the Hebrew and report it.
4. **`context.targetText`** (commentary batches): the Ari's text already in
   your language, beside these notes in the reader. A bolded `<b>` lemma
   quotes it — match its wording so the reader recognises the line.

### Never

- Never drop what you cannot parse. Translate what is printed; if it looks
  like a printer's error, translate it as printed and report it.
- Never normalise an inconsistency (two spellings, two abbreviations) to make
  a passage read evenly.
- Never add notes, explanations or brackets of your own beyond the glosses
  your table prescribes.
- Never do gematria in your head: page, item and answer numbers come from the
  citation table (`cites-<batch>.md`) — take the NUMBER from it and the word
  ("page", "item", "answer") from your terminology table. Past 1,000 the
  thousand is written `א'`/`אלף`; past 2,000 it is `ב'`.
- Never return anything but `html`: identifiers are copied from the Hebrew
  mechanically.

### Mechanics

- Preserve every `<b>`, `<br>`, `<small>` exactly (same counts, same order).
- Quotation marks: your table's `quotes` — never straight `"`.
- No Hebrew letters in the output.
- Write each finished item to its own file as soon as it is done (your
  prompt names the directory); the orchestrator assembles them. A partial
  batch is still usable.
- Before you finish, count your item files against the exact item count in
  your prompt.
