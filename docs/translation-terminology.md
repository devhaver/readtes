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
