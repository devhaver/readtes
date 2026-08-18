## Run rules (binding — these override anything above that conflicts)

### DO NOT TRANSLITERATE what this corpus translates

Translators keep reading one glossed occurrence in a pane and generalising it
into a global rule. Use: `כלי`→vessel, `כלים`→vessels, `זווג`→coupling,
`מסך`→screen, `עביות`→coarseness, `רשימו`→record, `אחורים`→posterior,
`יניקה`→nursing, `נסירה`→sawing.

Before transliterating any term because the pane seems to, run from the repo
root:

```sh
grep -ro "<term>" content/parts/*/chapters/*/commentary.en-ai.json | wc -l
```

If it returns 0, **do not use it**. Glob `commentary.en-ai.json` explicitly —
never `*.en-ai.json`, which sums in a different translation effort's
vocabulary and gives the wrong answer.

### Terminology source of truth

Read `docs/translation-terminology.md` (repo root) before you start. Every
call in it is settled; do not re-derive or re-litigate. `בחינה` →
**discernment** has been challenged twice and upheld twice.

### The pane, and what it does and does not govern

`context.targetText` is **not** official English — it is an earlier
translation effort's vocabulary, in every part.

- **Running prose follows the corpus**, never the pane.
- **A bolded `<b>` lemma follows the pane's phrasing** — same verbs, same word
  order — because the reader sees that line beside your note.
- **Unless that chapter's own pane is self-inconsistent** (it prints two
  renderings of the same Hebrew). Test per chapter, by counting. Then the
  settled corpus form wins everywhere, lemmas included.
- **A settled technical term and a name's spelling never follow the pane**,
  lemma or not: `Ibur [impregnation]` not "pregnancy"/"gestation", `Hochma`
  not "Chochma", `Aba` not "Abba", `Hassadim` not "Hasadim", `Tevuna` not
  "Tvuna", `YHV` not "YAHU", `AB, SAG, MA` not "AV, SAG, MAH". The reader
  matches words; these are the same word.
- **Where the pane is unreliable, the Hebrew decides**: spelled-out
  `אריך אנפין` → Arich Anpin, abbreviated `א"א` → AA.

### Settled names and forms

`בוצינא דקרדינותא` / `בוצד"ק` → **Butzina de Kardinuta [the lamp of
darkness]** (never "Botzedek", "Butzadak", "Botzina", "hardened candle").
`מנצפ"ך` → **MaNTzePaCh**. `תנה"י` → **TNHY**. `נרנח"י` → **NRNHY**, glossed
once. `רוחא קדמאה` → **Rucha Kadmaa [the first Ruach]**. `עלי עליון` → **the
upper of the upper**. `בס"ה` → **in the secret of**. `אה"ר` → **Adam
HaRishon**. `מיין דוכרין` → **Mayin Duchrin [male waters]**.
Gloss forms the corpus uses: `Gadlut [greatness/adulthood]`,
`Katnut [smallness/infancy]`, `Tzelem [image]`, `Taamim [tastes]`.

### Citations and numbers

- `ד"ה` → **the passage beginning** (never "s.v.", never "Sub Header").
- `עש"ה` → study it there well; `ע"ש` (bare) → see there; `עכ"ל` → End of
  quote; `וז"ל` → and these are his words; `אכמ"ל` → this is not the place to
  elaborate.
- `דף` + Hebrew letters → **Arabic numeral** page number by gematria (א=1 … י=10,
  כ=20 … ק=100, ר=200, ש=300, ת=400; gershayim are punctuation, so `רצ"ז` =
  297). Past 999 the page is the **word** `אלף` plus a numeral: `דף אלף ז'` is
  page **1007**. `דף ד"ה` is the idiom "the passage beginning", not a page.
- Write citations as **“(page 683, item 93)”** — lowercase "page", Arabic
  numerals (corpus 144 : 0).
- `כי חפץ חסד הוא` → **“for He desires mercy”**.
- Two-sense abbreviations are read from the sentence: `ה"ר` is usually "first
  Hey" but often `ה' ראשונות` → "the first five"; `ה"ס` is usually "is the
  secret of" but sometimes `ה' ספירות` → "five Sefirot".

### Mechanics

- Preserve `<b>`, `<br>`, `<small>` **counts exactly** — a gate compares them
  against the source. Include the item's **leading `<br>`** if the Hebrew has
  one, and every `<br>` between paragraphs.
- **Bolded single letters are the letter itself**, not item markers: `<b>ו</b>`
  → `<b>Vav</b>`. Keep every one bolded, at the matching point in the sentence.
  One item had 9 `<b>` pairs in the Hebrew and came back with 1.
- **Curly quotes only** — `“ ”` for quotation (corpus 906 : 44 over single
  curly), `’` for apostrophes. A straight `"` or `'` fails the gate.
- No Hebrew in the output except a single bracketed letter gloss like `[י]`.
- **No editorial notes in the html, ever.** Report suspicions in your reply.

### Never drop anything

Printer's errors are everywhere (`אף` for `דף`, `כבד` for `כבר`, `בחיבות` for
`בחינות`, unclosed parentheses). Translate what is printed and report the
suspicion — but **never omit a clause, a citation or a letter because you
cannot parse it.** Two agents in one round dropped `ב"ש ת"ת` ("the two thirds
of Tifferet") and the `ת` of `תנה"י` as unreadable; both are ordinary
abbreviations the corpus had already settled. No gate can see an omission —
grep the corpus first, then translate it.

Equally, **never normalise an abbreviation to make a passage read
consistently**: `ג"ש העליונים … וב"ש תחתונים` is "the upper three thirds …
the bottom two thirds", however odd that looks.

- Be internally consistent: the same construction gets the same English in
  every item of your batch.
- Expansion runs ≈1.75× the Hebrew character count (gate bounds 1.35–2.30).
  Far under means a dropped clause; far over means invented commentary.

### Page numbers past 999

The thousand is written as a bare `א'` or the word `אלף`, and the hundreds
follow without repeating `דף`: `דף א' קע"ג` is page **1173**, `דף אלף ז'` is
page **1007**, `דף א' ד"ה …` is page **1000**. Never read these as two
separate page numbers — the book runs past page 1,200.

- `אויר` → **air** (corpus 98 : 0 against "Avir"). Transliterate it only where
  the item is discussing the word itself ("You already know that Avir
  means…"), the same way `‘Atarot’ means ‘Ketarim’` is handled.
- `וז"ל` → **“and these are his words”** — his, even when the source quoted is
  a book (the Zohar), never "its words".
- **`יש"ס ותבונה` pair → `YESHSUT`, all caps.** "Yeshsut" is banned by the
  gate; one batch shipped 39 of them.
