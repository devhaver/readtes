# Settled terminology — Ohr Pnimi → English (`en-ai`)

Accumulated across the merged translation batches (PRs #131, #138–#151 and
onward). Deviating here is the single most common failure. These are settled
calls; do not re-derive them.

Maintenance rules, learned the hard way:

- **Count before adding an entry.** Check a candidate form against both layers
  from the repo root — `grep -ro "<term>" content/parts/*/chapters/*/*.en-ai.json | wc -l`
  (the pane the reader sees) and the same over `*.en-bb.json` (the official
  English) — and record which won. Six early entries in this file were wrong
  because a part-local convention was written down as global.
- **Append each session's new decisions here** and ship the update with the
  session's last PR. This file plus the manifest's own glossary is the entire
  terminology state — there is no other copy.

## Names / layers

- `הרב` → **the ARI** (never "the Rav"). Phase ordinals as words: **phase
  four**, never "phase 4".
- `מטי`/`לא מטי` → `Mati [reaching]` / `Lo Mati [not reaching]`, glossed once
  then bare.
- `ג"ר` → GAR [first three]; `ו"ק` → VAK [six ends]; `רת"ס` → RTS
  [Rosh-Toch-Sof]; `מ"ן` → MAN [Mayin Nukvin]. Gloss on first use, bare after.
- Sefirot keep Hebrew names: Hesed, **Gevura**, Tifferet, Netzah, Hod, Yesod,
  **Daat**.
  `חב"ד`→HBD, `חג"ת`→HGT, `נהי"מ`→NHYM, `כח"ב`→KHB.
- `ע"ב`/`ס"ג` → AB / SAG. `או"א עילאין` → **the upper AVI**.
  `יש"ס ותבונה` → Israel Saba and Tevuna; the pair = **YESHSUT**.
- `זעיר אנפין` → Zeir Anpin when spelled out; `ז"א` → ZA otherwise.
- `כגנ"י`/`חבחתה"מ` → **expand to the full Sefira list**, never transliterate.
- Part 6 vocabulary (anchored to the official en-bb English): AK, AB / SAG /
  MA / BON, Mochin, AA, Aba, Atzilut, Galgalta, Atik, Neshama. `אזן`→Ozen
  [ear]; `חוטם`→Hotem; `פה`→Peh; `אח"פ`→AHP; `גו"ע`→GE; `דיקנא`→Dikna [beard];
  `שערות`→hairs; `רישא`→Reisha [head]; `טעמים`→Taamim [tastes];
  `נקודות`→Nekudot; `נקודים`→Nekudim; `או"א`→AVI (inner AVI / upper AVI /
  YESHSUT are three distinct things); `מזלא`→Mazal, the two being **Notzer
  Hesed** (upper) and **VeNakeh** (lower); `שבולת הזקן`→the Shibolet of the beard (see round 1 below); `נקבי עינים`→**Nikvey Einayim** (glossary-locked, 40 occurrences
  in the official English — do NOT write "the openings of the
  Eynaim"); bare `עינים`→Einayim; `ה"ת`→**bottom Hey**;
  `ה' תתאה`→the lower Hey; `צמצום נה"י`→the restriction of NHY;
  `אור רחמים`→the light of mercy; `ה"פ`→the five Partzufim; `ע"ח`→Etz Chaim;
  `טמיר`→concealed.

## Concepts

`נשיקין`→Neshikin [kissing]; `תגין`→Tagin [crowns]; `הבל`→vapour;
`אב"א`/`פב"פ`→"back to back"/"face to face" in words; `אחורים`→**posterior**;
`הפיכת פנים`→turning of the face; `המשכה`→drawing; `התלבשות`→clothing;
`הזדככות`→refinement; `רשימו`→**record**; `ניצוצין`→sparks; `צנורות`→pipes;
`יניקה`→nursing; `ה"ח`/`ה"ג`→the five Hassadim / five Gevurot; `ממותק`→sweetened;
`מדת הרחמים`/`מדת הדין`→the quality of mercy / of judgment; `מילוי`→filling;
`שם י"ה`→the name YH; `שם הויה`→the name HaVaYaH (spelled fillings hyphenate
letter names: Yod-Vav-Dalet, Hey-Yod); `אספקלריא שאינה מאירה`→a mirror that
does not illuminate; `חצי דופן`→half of the wall; `הקוטב`→the axis;
`חניות`→stops; `גופא`/`שקיו דאילנא`→the body / the watering of the tree;
`מעי`→womb; `אויר העולם`→the air of the world; `פלג גופא`→half a body;
`עולם הנקודים`→the world of Nekudim; `שביה"כ`→the breaking of the vessels;
`עולם התיקון`→the world of correction; `אבי"ע`→ABYA; `נרנח"י`→NRNHY;
`עולם הצמצום`→the world of the restriction. Also **coarseness** for עביות.

Feminine grammar for Malchut / Bina / Nukva. `א"ס ב"ה` → Ein Sof.

## Citations

- `דף רצ"ז` → **page 297** (Hebrew-letter page numbers become Arabic numerals
  via gematria); `ד"ה` → **the passage beginning**; `עש"ה` → **study it there
  well**; `עכ"ל` → **End of quote**; `וז"ל` → **and these are his words**;
  `אכמ"ל` → this is not the place to elaborate; `על בוריו` → thoroughly;
  `בדיבור הסמוך` → in the adjacent item; `ה"ס` → is the secret of.
- Inline Hebrew-letter markers → their gematria value in Arabic numerals:
  `(ב)`→**(2)**, `(ג)`→**(3)**, `(יא)`→**(11)**. Never keep the Hebrew letter,
  never renumber sequentially.
- Hebrew letters survive into English ONLY as letter glosses: `<b>Hey</b>`,
  `<b>Vav</b>`, `<b>Dalet</b>`, `<b>Yod</b>`, with `<b>Yod</b> [י]` style where
  the source makes a shape/letter pun. Keep the source's `<b>` tags.

## Added in round 1 of the parallel run (PR #146) — also settled

- `שבולת הזקן` → **the Shibolet of the beard**, with a `[strand]` gloss on
  first use in an item. This beats the official "Shibolet HaZakan" because the
  en-ai source layer — the text the reader sees in the pane — uses it 27 times.
- `ה"ת` → **bottom Hey**; `ה"ר` → **first Hey** (both glossary-locked).
- `אורחא` → Orcha [path]; `חזה` → Chazeh [chest]; `עיבור` → Ibur
  [impregnation]; `התכללות` → inclusion; `בירורים` → sortings;
  `עלמין דפרודא` → the worlds of separation; `נסתם` → was blocked;
  `בקיעה` → breaching / breaking through; `שיתוף` → partnership;
  `מזיקים` → harmful forces; `קוצי דשערי` → the locks of hair.
- `טנת"א` → expand to **Taamim, Nekudot, Tagin and letters**;
  `עסמ"ב` → expand to **AB, SAG, MA and BON**; `בי"ע` → **BYA**.
- `אריך אנפין` → Arich Anpin spelled out, `א"א` → **AA** abbreviated (same
  rule as Zeir Anpin / ZA).
- Vowel names transliterate: Holam, Shuruk, Melafum, Kamatz, Patach.
- `ע"ש` → **See there** (only `עש"ה` is locked to "study it there well").
- `כלים דפנים` → the anterior vessels (pairs with `אחורים` → posterior).
- `עצמות` → **self** (the glossary reserves "essence" for `מהות`).
- `זצ"ל` and similar honorifics are **dropped**, per the honorifics convention.

**When this file and the manifest disagree, the manifest's glossary wins, and
`targetText` wins over both.** `targetText` is the en-ai _source_ layer, not
the official English — it is what the reader sees in the pane beside your
notes, which is exactly why matching it matters. Report any conflict you hit.

## Precedence, refined (round 2)

`targetText` decides terms this file does **not** settle. It does **not**
overturn a term this file settles that the wider corpus also backs — a couple
of local hits lose to a hundred corpus-wide ones. Round 2 saw exactly this:
two `targetText` instances of "the measure of mercy" against 119 corpus
occurrences of "the **quality** of mercy / of judgment". The settled form won.

When you hit such a clash, follow this file and **report it** rather than
switching. Genuinely unsettled phrasing local to your chapters — e.g. "the
measure of evil", which appears nowhere else — still follows `targetText`.

## Added in round 2 (PR #148) — settled

- **Positional states stay plain English**: `אב"א`→back to back, `פב"פ`→face
  to face, `אב"פ`→back to face, `פב"א`→face to back. Part 7's pane
  transliterates ("Achor be Achor") in places — do **not** follow it; plain
  English wins 119:71 even inside part 7 and 535:110 corpus-wide.
- `חו"ב` → **HB** in running prose (same rule as HBD / HGT / KHB). The one
  exception: inside a bolded lemma quoting the Ari, render it exactly as the
  pane renders that line, even if that means spelling it out.
- `בחינה` splits: **phase** for `בחי"א`–`בחי"ד` and `ד' בחינות` (locked), and
  **discernment** for generic `בחינת X` as a noun. `נבחן ל־` → "is regarded
  as" / "is reckoned as".
- `ס"א`/`סטרא אחרא` → Sitra Achra [the other side]; `נוגה` → Noga
  [brightness]; `סיגים` → dross; `שמרים` → lees; `אתבסמו` → sweetened;
  `מ"ה החדש` → the new MA; `מלך הדר` → the king Hadar; `הקב"ה` → the Creator;
  `חז"ל` → our sages; `שירים` → remainders; `הנהגה` → conduct.
- `רדל"א` → Radla [the unknown head]; `רישין` → Reishin [heads];
  `יה"ו` → YHV [Yod-Hey-Vav] on first use, bare after; `ט"ת` → the nine lower
  ones; `כלים דאחור` → the posterior vessels; `גלגלתא ועינים` spelled out →
  Galgalta ve Einayim (abbreviated `גו"ע` stays GE); `ע"ה` → with the kollel.
- `שעטנ"ז ג"ץ` → Shatnez Gatz; `בד"ק חי"ה` → Badak Haya;
  `בדק הבית` → Bedek HaBayit [the repair of the House].
- `מיעוט`/`התמעטות` → diminution; `סיתום` → blockage; `פגם` → flaw;
  `אחיזה` → grip; `צ"ע` → this requires examination; `מסובב` → consequence.
- `יניקה` is **nursing** in the Ibur-Yenika sense but **sucking** where the
  shells do it — different act, different word.
- Honorifics (`זצ"ל`, `מכתי"ק`) are dropped; a manuscript note becomes
  "(A note in the author's own handwriting: …)".

**Do not silently emend the Hebrew.** Round 2 hit a printed `חו"ב` where the
sense demanded `חו"ג`, and a stray `עשר` that fits no reading. Translate what
is there, or drop only what is unreadable, and report it.

## Added in round 3 (PR pending) — settled

- `מ"ן` → **MAN [Mayin Nukvin]**, glossed once then bare. NOT "[female
  waters]" — the pane uses `MAN [Mayin Nukvin]` 72 times against 21.
- `הבל` → **breath**, not vapour, outside part 6. The pane says breath 99:32
  corpus-wide and 8:0 in part 8. Part 6's existing "vapour" matches part 6's
  own pane and stays.
- `אמא` → Ima; `נו"ה` → NH; `כחב"ד` → KHBD; `הרח"ו` → Rav Chaim Vital;
  `מ"ד` → MAD [male waters]; `רעוא דמצחא` → Raava DeMitzcha [the will of the
  forehead]; `אד"ר` → the Idra Rabba; `רה"י`/`רה"ר` → private / public domain;
  `הריון` → pregnancy; `עברה` → Evra [wrath] (keeps the Ibur/Evra pun);
  `רקיע` → firmament; `שבירה` → breaking; `הארה` → illumination.
- Spelling: **Aba**, not Abba (1820:175) — even where a part-7 pane writes
  "Abba" in running prose.

### The lemma rule, stated plainly

A bolded lemma quotes the Ari. The reader matches those words against the pane
beside them, so **inside a lemma use the pane's wording for that line**, even
where this file says otherwise in prose. Outside the lemma, this file wins.
Round 3 realigned 14 lemma terms this way (posterior→backs, Einayim of
AVI→eyes of Aba and Ima, GAR→the three first ones, breaking→shattering,
vapour→breath, back to face→"back within face").

## Added in round 4 — settled

- **`ה"ר` is two different things.** The glossary locks `ה"ר` → "first Hey",
  but in part 8 it abbreviates `ה' ראשונות` → **the first five**. The Ari's own
  line reads `מה' ראשונות דכתר דב"ן` and the pane renders "the first five of
  the Keter of BON". Read the sentence; do not apply the lock blindly.
- `קטנות`/`גדלות` → **Katnut / Gadlut** (470:144 and 679:194 against
  smallness/greatness), even where a pane translates them.
- `נוקבא` → **Nukva** (1626 corpus); `טבור` → **Tabur** (566:237 against navel).
- `בוצינא דקרדנותא` → Butzina de Kardinuta [the lamp of darkness];
  `ג' גו ג'` → “three within three”; `ביטול` → nullification; `עצם` →
  substance; `ראשים` → Roshim; `כתרים` → Ketarim; `חו"ג` → HG;
  `דחג"ת` → DHGT; `הקצבות` → allotments; `אגלידא הפרסא` → the Parsa congealed.
- `געסמ"ב` → expand to Galgalta, AB, SAG, MA and BON.

Part 8's pane is the least consistent yet — within a single round it wrote
Chochma/Hochma, Abba/Aba, Aba ve Ima/AVI/Abba and Ima, the female/Nukva,
smallness/Katnut, selected/sorting, Ibur/gestation. The unreliability
exception therefore applies often in part 8: use the settled form, including
inside lemmas, and say so in your report.

## `בחינה` — settled, do not re-litigate (round 5)

The manifest glossary gives `בחינה` → "phase" (659 variants vs 9) and notes
that en-bb uses "discernment" only for `הבחן/הבחנה`. **That describes en-bb,
not this corpus.** Measured over 636 aligned items of parts 1-6 commentary:

    Hebrew   בחינה-family 1,671   בחי"א-ד 803   הבחנה/הבחן 58
    English  phase 1,310          discernment 433

433 "discernment" against 58 `הבחנה` can only be rendering `בחינה`. The split
below is therefore what the corpus already does, and it stays:

- `בחי"א`–`בחי"ד`, `ד' בחינות` → **phase one … phase four**, **four phases**.
- generic nominal `בחינת X` → **the discernment of X**.
- `נבחן ל־` → "is regarded as" / "is reckoned as".
- `הבחן`/`הבחנה` (the act) → discernment, naturally.

## More read-the-sentence abbreviations

Like round 4's `ה"ר`, these carry two senses. Read the clause, don't apply a
lock blindly:

- `ה"ס` → usually **"is the secret of"**, but `עם ה"ס: גבורה, ת"ת, נצח, הוד,
יסוד` is `ה' ספירות` → **five Sefirot**.
- `ה"ר` → usually "first Hey", but in part 8 often `ה' ראשונות` → **the first
  five**.

## Added in round 6 — settled

### Part 9's pane does NOT transliterate — the round's main trap

A translator rendered 26 items on the stated belief that part 9's
`context.targetText` "consistently transliterates" `Kli` and `Zivug`, and so
introduced both into 19 items. It does not. Counted over the whole repo:

| form                 | commentary `en-ai` | commentary `en-bb` | source `en-bb` (the parts-9+ pane) |
| -------------------- | ------------------ | ------------------ | ---------------------------------- |
| coupling / couplings | 629 / 49           | 14 / 0             | 196 / 43                           |
| **Zivug / Zivugim**  | **0 / 0**          | **0 / 0**          | **1 / 0**                          |
| vessel / vessels     | 1,275 / 762        | 28 / 19            | 548 / 360                          |
| **Kli / Kelim**      | **0 / 0**          | **0 / 0**          | **0 / 0**                          |

`Kli` and `Kelim` appear **nowhere in the corpus at all**, in any layer. A
single glossed occurrence in one chapter's pane is not evidence of a
convention — count before generalising from it.

- `זווג` → **coupling** (manifest glossary entry `zivug`, `strategy:
translate`, 98% coverage). Prose _and_ lemma. Never `Zivug`.
- `כלי` / `כלים` → **vessel** / **vessels**. Never `Kli` / `Kelim`.
- `נשיקין` → **Neshikin [kissing]**, glossed on first use, bare after. Not
  "kisses" (0 occurrences corpus-wide).
- `אב"א` / `פב"פ` → **back to back** / **face to face** in plain words
  (76 : 0), even where a part's own pane transliterates them.
- `יניקה` → **nursing** (20), not "Yenika" (1) or "suckling" (0 in commentary).

### Citation renderings — two more locked

- `עש"ה` → **"study it there well"** (67 : 0 against "see there well").
- `בדיבור הסמוך` → **"the adjacent item"** (48 : 4 against "previous item").
- `ד"ה` → **"the passage beginning"**. Never "Sub Header" — that rendering
  appeared 7 times in one batch and matches nothing in the corpus.

### `עביות` vs `עובי` — source-conditional, both legitimate

`thickness` is only wrong when the Hebrew is `עביות`; `עובי` genuinely reads
thickness. Verified this round: one item with 6 × `עביות` needed
**coarseness**, while another with 3 × `עובי` and no `עביות` was correct as
printed. `driftcheck.py` already encodes this — do not "fix" it globally.

### The part-08 lemma exception, confirmed by count

Part 08's pane is self-inconsistent for the same Hebrew construction — it
prints "aspect of male and female" once and "phases of male and female" once.
The exception therefore fires as written: **use the settled corpus form
everywhere in part 08, lemmas included.** In particular generic nominal
`בחינת X` → **the discernment of X** even inside a `<b>` lemma
(commentary corpus: discernment 627, aspect 487, phase 289 — while the
_source_ pane says aspect 3,866, which is the earlier translation effort's
vocabulary and is exactly what the prose/lemma rule exists to keep out).

### `בחינה`, again — how to count it (round 6)

A translator re-opened the round-5 ruling, arguing "the aspect of" beats "the
discernment of" 4,353 : 1,543 corpus-wide and 322 : 216 within part 8, and
that the manifest glossary's note ("en-bb ... never [uses discernment] for
`בחינה` as a level") settles it.

**Both counts are wrong because they glob `*.en-ai.json`, which sums the
commentary with the `source` pane.** The part-7/8 source pane came from an
earlier translation effort whose vocabulary this run deliberately does not
follow — that divergence is the entire reason the prose/lemma rule exists.
Split by layer:

|                                   | commentary `en-ai` | source `en-ai` |
| --------------------------------- | ------------------ | -------------- |
| part 8 — the discernment of       | **282**            | 12             |
| part 8 — the aspect of            | 34                 | **288**        |
| whole corpus — the discernment of | **935**            | 916            |
| whole corpus — the aspect of      | 487                | 3,866          |

In the layer this run is actually writing, discernment wins part 8 by 8 : 1.
The glossary note is also accurate as written and simply not about us: it
describes **en-bb**, and round 5 already measured why this corpus differs.

**When counting for gate 4, always glob `commentary.en-ai.json` explicitly —
never `*.en-ai.json`.** A bare `*` glob has now produced a wrong ruling twice.

## Round 7 — part 9's tail, part 10, and what `targetText` actually is

### `targetText` is the `en-ai` source pane, in every part

`docs/translation-pipeline.md` used to say the manifest carried official
`en-bb` English from part 9 onward. It never did: `translate-export.ts` reads
`source.<targetVersionId>.json`, so for an `en-ai` run the pane is always the
earlier translation effort. A ruling in this round was argued from the false
claim before the code was checked. The pane still governs a lemma — but
because the reader sees it beside the note, not because it is authoritative.

### Test pane self-inconsistency **per chapter**, by counting

Two calls this round turned on it, and both went against the pane:

| Hebrew  | pane says                                                                                                | corpus (commentary `en-ai`) | ruling                                   |
| ------- | -------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------- |
| `נסירה` | part-9 panes print _both_ `Nesirah` (14) and "sawing" (15) — chapters 103, 104 and 109 print one of each | sawing 3, Nesirah 0         | **sawing**, lemmas included              |
| `עיבור` | part-10 panes mix `Ibur` (26) with "pregnancy" (8)                                                       | Ibur 122, pregnancy 1       | **Ibur [impregnation]**, lemmas included |

Prose had already been converted; what the per-chapter count settled was the
four lemmas that had been left following the pane.

### Names the corpus already fixed, invented three ways in one round

`בוצד"ק` / `בוצינא דקרדינותא` → **Butzina de Kardinuta [the lamp of
darkness]**. Three translators produced "the Botzedek", "the Butzadak", and
the pane's "Botzina … [the hardened candle]". Counts: commentary `Butzina` 1
and "lamp of darkness" 1; official `en-bb` `Butzina` 3; every invention 0.

- `מנצפ"ך` → **MaNTzePaCh**. Panes spell it three ways ("Mantzepach" 2,
  "Mantzapach" 3, `MaNTzePaCh` 18); the corpus form is the camel-cased one,
  which also shows the reader which letters are meant.
- `עלי עליון` → **the upper of the upper** (5 in commentary, lowercase).
  Never "the Upper's Upper" (0).
- `בס"ה` → **in the secret of**, exactly parallel to `ה"ס`. Rendering it
  "alone" drops the citation formula; the corpus writes
  `in the secret of “for He desires mercy”` around this very verse.
- `רוחא קדמאה` → **Rucha Kadmaa [the first Ruach]**. Not "[the first
  spirit]": bare "spirit" is 0 in the commentary (the 56 hits are
  "spirituality"), `Ruach` is 219, and the item's own point is that the level
  is _called_ Rucha because it holds only Nefesh and Ruach.
- `תבונה` → **Tevuna** (45 : 0), even where a chapter's own pane says "Tvuna".
- `אה"ר` → **Adam HaRishon**; `מיין דוכרין` → **Mayin Duchrin [male waters]**;
  `ט"ר` → **the nine first ones**; `ל"ב האבן` → **the heart of stone**
  (keeping the לב / ל"ב pun the pane makes).

### Gloss forms, counted rather than invented

`Gadlut [greatness/adulthood]` (17 : 8 against "[greatness]"),
`Katnut [smallness/infancy]`, `Tzelem [image]`, `Taamim [tastes]` (101 : 13).
Acronyms already dense in the corpus — ZA, ZON, NHY, GE, AHP, ZAT — stay
bare; the corpus glosses them rarely and this run matches that, not the
pane's liberal bracketing.

### Never normalise an abbreviation to make a passage consistent

Part-10 chapter-84 prints `ג"ש העליונים … וג"ש אמצעים … וב"ש תחתונים`. A
translator read the two `ג"ש` as slips for `ב"ש` and rendered all three
"two-thirds", which reads smoothly and erases what is printed. Restored to
**the upper three thirds / the middle three thirds / the bottom two-thirds**,
with the inconsistency reported instead of absorbed. Translating what is
printed applies to abbreviations too, not only to obvious typos.

### A settled technical term beats the pane, lemma or not

The per-chapter self-inconsistency test decides _phrasing_. It does not decide
**settled technical vocabulary** — those terms win everywhere, exactly as
`Kli`/`Zivug` already do. Part 11's panes say "pregnancy" 174 times against
`Ibur` 8, and some individual chapters say it only one way, so the per-chapter
test would have let "pregnancy" into a lemma while the same item's prose read
`Ibur [impregnation]`. The commentary corpus is 122 : 1. The term is `Ibur`,
lemma included.

Nor does a lemma follow the pane's **spelling** of a transliterated name:
**Hochma** (1,504 : 2 against "Chochma"), **Aba**, **Hassadim**, **Tevuna**.
The reader matches words; these are the same word.

- `יה"ו` → **YHV**, not the pane's "YAHU" (commentary 13 : 0; YAHU is 0 in the
  commentary and 7 in the pane). A part-local pane majority is not evidence.
- `תנה"י` → **TNHY** (9 in commentary, 97 in the pane). Do not silently drop
  the leading `ת` as unparseable — two agents this round dropped a letter or a
  clause they could not parse, and no gate can see an omission.
- `ציור` → **imprint** is correct; the ban on that word applies only when the
  source has `רשימו` (which is _record_). `driftcheck.py` now tests the source.
- `כי חפץ חסד הוא` → **“for He desires mercy”** (7 : 0 against "desires
  Hesed"), even when a neighbouring item in the same chapter got it wrong.
- Page citations read **“(page 683, item 93)”** — lowercase, Arabic numerals
  (144 : 0 against "(Page").

### Gate bugs this round — all three flagged correct translations

Gate 2 reported three page mismatches and every one was the checker's fault,
keeping the running total at **zero translator errors in ~290 page refs**:

1. A parenthesis lists further pages without repeating `דף`
   (`דף תשנ"ד ד"ה וזה. תשע"ב`) — the second page is not stray.
2. Past 999 the page is written as the **word** `אלף` plus a numeral:
   `דף אלף ז'` is page 1007, not gematria(`אלף`) = 111.
3. The English capitalises "Page" at the start of a parenthetical, and the
   check was case-sensitive.

`driftcheck.py` also flagged a cross-reference-only item ("See above, page
939, item 138") as compressed at 1.30×. The expansion ratio is meaningless
below a paragraph; it is now skipped under 120 source characters.

## Round 8 — the page-numbering convention nobody had noticed

The book runs past page 1,200, and past 999 the thousand is written as a bare
`א'` or the word `אלף`, with the hundreds following and **`דף` often not
repeated**:

| printed        | means                      |
| -------------- | -------------------------- |
| `דף אלף ז'`    | page 1007                  |
| `דף א' קע"ג`   | page 1173                  |
| `דף א' ד"ה …`  | page 1000                  |
| `כנ"ל אלף ל"ז` | page 1037 (no `דף` at all) |

Four agents in one round misread this, in three different ways — "page 38"
(thousand dropped), "page 1, page 173" (read as two pages), and "page 1, item
71" (hundreds turned into an item number). Two of them cited the round-7
continuation-ref note as their justification, so **that note is now the more
dangerous half of the pair**: a second numeral after a page can be a
continuation ref _or_ the hundreds of a thousand, and only the page range
decides. Gate 2 knows all four forms now.

This also breaks the old boast. Gate 2's record was "zero translator errors in
~290 page refs" — true only because the gate could not see this form. The
corrected count for round 8 alone is **12 real page errors** across four
batches, every one of them found by the recomputation once it was taught the
convention. A checker that cannot express a class of error will report that
class as clean forever.

### Terms settled this round

- `אויר` → **air** (98 : 0 against "Avir"); transliterate only where the item
  discusses the word itself.
- `עטרה` → **Atara [crown]** (26 : 0 against the pane's "corona"), lemmas
  included.
- `פרק`/`פרקין` → **joint(s)**, never the pane's "article".
- `אור מקיף` → **surrounding light** (125 : 0 against the pane's "makifim").
- `תבונה` → **Tevuna** (pane writes "Tevunah" 60 times; commentary, 0).
- `וז"ל` → **“and these are his words”** — _his_, even when the source quoted
  is a book.
- `יש"ס ותבונה` → **YESHSUT**, all caps. One batch shipped 39 "Yeshsut".
- `יניקה` → **nursing**, which fights part 12's pane hard (it says "Yenika"
  throughout) and wins 74 : 9. A stray "Yenika" in the already-merged
  part-12/chapter-177 was corrected to match.

## Round 9 — part 13, and pre-computing the citations

### `scripts/translation-gates/cites.py` — gate 2, moved upstream

Telling translators the page convention did not work: an agent that had the
rule in its brief _and_ in its prompt still shipped five thousand-prefix
errors. So the numbers are now pre-computed for them:

```sh
TX_SCRATCH=<dir> python3 scripts/translation-gates/cites.py en-001 …
```

writes `cites-<batch>.md` — every `דף` and `אות` in the batch, printed form →
the number to write. Hand it to each translator with the brief. In the round
it was introduced, batches that read it first got **every citation right on
the first pass**; the two agents that had already started fixed themselves
mid-batch.

Three false-positive classes it took to get right, all found by translators
who checked the table instead of obeying it — which is the behaviour to keep
asking for:

- `אות` matches inside `נקראות`. Anchor with `(?<![א-ת])`.
- `אות` also means **letter**: `אות ה' של אלקים` is "the letter Hey of
  Elokim", not "item 5". Not detectable mechanically — the table says so in
  its header.
- A page can be cited with **no `דף` at all**: `(א' שכ"ז אות ע"ב)` is page 1327.

### Part 13's terminology

Part 13's pane is the least reliable so far — it flattens `רישין`/`ראשים` to
plain "head", and its `AV`/`SaG`/`BaN` spellings appear **nowhere** in the
commentary. Anchor to the corpus harder here than anywhere else.

- `עזקא` → **Izka** (part-13 pane 18, commentary 3; "Ozka" 0), so
  `עזקא דכיא`/`עזקא רבה` → Izka Dachya / Izka Rabba.
- `חו"פ` → **HP [Hotem and Peh]**, on the `AHP` pattern. Two agents coined
  `HP` and `HUP` for it in the same round; neither was attested.
- `מוחא סתימאה` / `מו"ס` → **Mocha Stimaa [the concealed brain]** (31 : 9
  against "the concealed Hochma").
- `אוירא` (AA's second head) → **the air**, per the settled `אויר`→air rule.
  The Zohar pun `י' דנפיק מאויר ואשתאר אור` keeps the transliteration —
  "the Yod that comes out of Avir [air], leaving Or [light]" — under the
  discussing-the-word-itself exception.
- Vowel names: **Holam**, not the pane's very consistent "Cholam".
- `עי"מ` → **IYM [Ibur, nursing, and Mochin]**, glossed once per item.

### `רישין` — the round-4 entry, narrowed

Round 4 settled `רישין` → **Reishin [heads]**. That holds only for
`רישין דישסו"ת`, which is where all four corpus occurrences are. For part
13's constant "the two/three heads of AA", write plain **heads**: the
commentary has 6 plain against 4 `Reishin`, the pane has 159 plain, and part
13 is built on the phrase. Writing "the three Reishin" forty times is worse
English and worse for the reader.

This one is a judgment call on thin evidence, not a measurement — flagged so
it is not silently re-litigated. `ראשים` (Hebrew plural) stays **heads**;
`ראש` as a structural degree stays **Rosh [head]**.

## Round 10 — part 13's middle, and six bugs in the citation table

`cites.py` earned its place — batches that read it wrote their citations
correctly first time — but **every one of its false positives was found by a
translator, not by me.** Keep telling them to check the table rather than obey
it; an agent that applied it literally would have written "item 5" into a
sentence about the letter Hey, and "page 1074" into `דתיקון א' עד פומא`
("correction 1, until the mouth" — `עד` scans as 74).

Fixed this round, all from translator reports:

- **`ב`+`אות` glued** — `(באות קפ"ט)` is "in item 189". The word-boundary
  anchor added to stop `אות` matching inside `נקראות` was excluding it. The
  same string is also the verb "they come" (`באות גם`) — the numeral test on
  the _next_ token settles which.
- **Item lists continue without repeating `אות`** — `אות קי"ז קי"ח וקי"ט` is
  items 117, 118 **and** 119. The continuation scan stops at abbreviations
  that scan as numerals (`ז"ל`, `ע"ש`, `ע"ב`, `ע"א`, `נ"ל`, `ע"כ`, `ה"ס`).
- **A bare thousand needs citation context** — `א'` + numeral is only a page
  inside parentheses or near `לעיל`/`כנ"ל`/`עי'`/`ד"ה`/`אות`. Otherwise it is
  an ordinal, as in `עיבור א' דא"א` ("the first Ibur of AA", not page 1006).

What it still cannot cover: a printer's error in the citation marker itself.
One item prints `(אוה ק"ז ק"ח ק"ט)` for `אות` — the translator computed items
107–109 by hand and said so.

### `ראש` in part 13 — count the construction, not the word

Part 13's pane is the least reliable in the book and inverts every one of
these. Split by construction:

| Hebrew                             | English                            |   commentary |         part-13 pane |
| ---------------------------------- | ---------------------------------- | -----------: | -------------------: |
| `ג' רישין דא"א` (collective)       | the three **heads** of AA          |        6 : 4 |            159 plain |
| `רישא`/`ראש` ordinal or structural | the second **Rosh**, `Rosh [head]` | **129 : 14** | 47 : 0 the other way |
| `ירכין`                            | **legs**, not thighs               |   **97 : 6** |  9 : 1 the other way |

Round 9 narrowed `Reishin` to `רישין דישסו"ת`; this refines the rest. The
collective plural stays plain, the ordinal singular is `Rosh`. Two agents in
one round rendered the singular both ways.

### Glosses that were coined twice in one round

`Nimin [strands]` (not "[filaments]"), `Chivaret [bright strands]` (not
"[whiteness]"), `Kutzin [barbs]` (new, unattested — flagged as a coinage).
An unattested term is the highest-risk class in a fan-out round: two agents
will each invent something reasonable and different. Grep the _other_ batches'
outputs before applying, not just the corpus.

### `דיקנא` — the exception fired correctly, for once

`Dikna [beard]` in running prose (102 : 65 corpus-wide, 8 : 1 within part 13),
but plain **beard** inside a lemma whose own chapter pane says "beard"
consistently. That is the prose/lemma rule working as designed: the exception
is checked, not assumed.

## Round 11 — part 14 finished, and four bugs in the citation table

### `cites.py` was dropping every `דף אלף …` citation

`is_numeral()` requires a gershayim or a token of one or two letters. `אלף` —
the thousand written as a **word** — is three plain letters, so it failed the
test and the whole citation was skipped. The bare-thousand fallback could not
rescue it either: that match sits inside the `דף` match and is deliberately
suppressed as a duplicate.

The damage was not marginal. **32 page references were missing across all
eight batches of the round**, every batch affected, the worst carrying ten.
`דף אלף ז'` → page 1007 is the _first row of the round-8 table in this very
document_, and it had never worked.

Three more, all found by translators reading the table instead of obeying it:

- **`ובדף א' קט"ו`** — the prefix can be two letters (`ו` + `ב`); the pattern
  allowed one, so the page vanished.
- **`באות (ק"ע)`** — the numeral can sit in its own parentheses.
- **`אות ע"ג, וע"ח`** — a continuation can be comma-separated.

`תשובה קכ"ט` ("answer 129") is now pre-computed too; the Answers layer is
cited exactly like items and translators were doing it by hand.

**`python3 cites.py --selftest` now exists** and covers all fifteen forms the
run has met. On the pre-fix script it reports 8/15. A checker that cannot
express a class of error reports that class as clean forever — the round-8
lesson, repeated with a script instead of a gate.

One near-miss worth keeping: relaxing the `אות` separator to `\s*` so it would
match `אות(ק"ע)` made `אות` match inside **`אותה`/`אותו`/`אותם`**, whose final
letter then scanned as items 5/6/40. It produced dozens of phantom rows before
the diff caught it. The separator must be real whitespace or an immediate
paren, never optional.

### The thousand is elided when the same page is re-cited

Two independent cases in one batch, both reported by the translator and both
confirmed by gate 2:

| printed               | means         | why                                                                |
| --------------------- | ------------- | ------------------------------------------------------------------ |
| `בדף תקע"ה בכל ההמשך` | page **1575** | the same item cites `דף אלף תקע"ה ד"ה ואין` two paragraphs earlier |
| `דף תקע"א ד"ה אור`    | page **1571** | the same item also prints `א' תקע"א ד"ה אור` — identical catchword |

Part 14's own pages run ≈1339–1590, so a bare `תקע"ה` would be page 575, in
part 6. Where a part sits past 1,000, a bare numeral that matches a
thousand-prefixed citation elsewhere in the same item is the same reference.
This is a judgment on same-item corroboration, not a rule to apply blindly —
a genuine cross-reference to an early part is still possible.

### An audit of what earlier rounds shipped — clean

Recomputing every merged `en-ai` item against its Hebrew: **99 references to
pages past 1,000, 97 rendered correctly.** The two exceptions are both correct
as printed — `part-01/chapter-02` cites `דף א' ד"ה` at the _front_ of the book,
where it means page 1 and the round-8 convention does not apply, and
`part-13/chapter-205` is the words `אלף עלמין` / `אלף אלפין` ("a thousand
worlds"), not a citation. No earlier round shipped this error.

### Part 14's pane — where it wins and where it loses

Counted over all 232 part-14 panes against the merged commentary:

|                          | pane                     | corpus                   | ruling                              |
| ------------------------ | ------------------------ | ------------------------ | ----------------------------------- |
| **Hochma** (not Chochma) | 417 : 13                 | 2506 : 7                 | pane agrees — follow it             |
| **Aba** (not Abba)       | 380 : 0                  | 423 : 4                  | pane agrees — follow it             |
| `קטנות`                  | smallness 20 : Katnut 2  | **572 : 58**             | **Katnut**, lemmas included         |
| `גדלות`                  | greatness 24 : Gadlut 3  | **805 : 91**             | **Gadlut**, lemmas included         |
| `עיבור`                  | pregnancy 27 : Ibur 18   | **618 : 3**              | **Ibur**, lemmas included           |
| `יניקה`                  | Yenika 3 : nursing 4     | **335 : 8**              | **nursing**                         |
| `נסירה`                  | Nesirah 1                | Nesirah **0**, sawing 20 | **sawing**                          |
| `פרקין`                  | joints 126 : segments 21 | **150 : 0**              | **joints** — the round-8 call holds |

The pane is self-inconsistent on all of the lower five, so the exception fires
and the corpus form wins in lemmas too.

### Terms settled this round

- `ב' עטרין` / `תרין עטרין` → **two crowns** (corpus 14 : 0 against "two
  Atarot"; part-14 pane 25 : 0, and its "coronets" 22 is the pane fighting
  itself). Five batches wrote "two crowns", two wrote "two Atarot" — the
  cross-batch coinage check is what caught it, not any gate. The **singular**
  `עטרא דחסד` / `עטרא דגבורה` stays **Atara of Hesed / of Gevura**.
- `נהירו ונציצו` → **radiance and sparkle** (7 uses across two batches against
  one "a shining and a sparkling"). It is a fixed Zohar formula — "the
  radiance and sparkle of the river that goes out of Eden".
- `אחסנתא` → **the inheritance [Achsanta]** on first use, then `Achsanta`.
  Unattested in the commentary; three batches hit it and all three agreed,
  which is what the flag-your-coinages instruction is for.

### Two process lessons

- **The orchestrator's prompt is not authoritative — the brief is.** My
  dispatch prompt told all eight translators "straight quotes only"; the rule
  is **curly only**, and a straight quote fails driftcheck. Every one of the
  eight followed `brief.md` over the prompt and said so. Write the prompt to
  point at the brief rather than restate it.
- **Give each translator its own scratch subdirectory.** Two agents wrote an
  `assemble.py` to the shared round directory and one overwrote the other
  mid-run. Nothing was lost, but only because both noticed and renamed.
