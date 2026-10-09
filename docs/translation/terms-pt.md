# Portuguese (`pt`) binding terminology — Talmud Eser Sefirot

Read this before translating your first item. Everything here comes from Bnei
Baruch's **official Portuguese** (Brazilian usage) and was counted, not
recalled.

| code  | source                   | what it is                                                                                                                                                                      |
| ----- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I** | `km-intro/intro.pt.txt`  | _Introdução ao Estudo das Dez Sefirot_ (156 sections, numbered as `<li>` items in the `.html`; **abridged**: BB drops most of the Intro's citations and its §156 reading guide) |
| **P** | `km-intro/pticha.pt.txt` | _Prefácio à Sabedoria da Cabalá_ (187 sections), the technical-vocabulary text. Almost all the evidence comes from here.                                                        |

There is **no Portuguese TES** in the corpus, so the counts cover I and P only,
written `total (I.. P..)`. The table has 287 rows: **231 OFFICIAL**, **56 PROPOSED**.
The counter is `terms/pt/work/cnt.py`, and `gen.py` recomputes every number in
this file.

## 0. Precedence

1. **This table binds.** If it says nothing about a term, grep P for BB's
   form, then follow the scheme in §1. Report every new term you coin.
2. **BB's Portuguese beats both the English canon and the Spanish table.**
   BB Portuguese is not a Spanish clone. It **transliterates far more** than BB
   Spanish, and it transliterates in an **English-style scheme**: ח = h/ch,
   never j, few accents, acronyms in plain capitals. Calls that differ from
   the English run:
   - `מסך`, `עביות`, `זווג`, `רשימו`, `ביטוש`, `התלבשות`, `הזדככות`, `צמצום`
     → **Massach, Aviut, Zivug, Reshimo, Bitush, Hitlabshut, Hizdakchut,
     Tzimtzum**, transliterated in prose (240, 181, 102, 32+37, 30, 34, 28, 66).
   - `כלי` / `כלים` → **Kli / Kelim** (110 / 181).
   - The named lights → **Ohr Hozer, Ohr Makif, Ohr Pnimi, Ohr Yashar, Ohr
     Hochma, Ohr Hassadim**. Plain `אור` is still **Luz** (340), and
     `אור עליון` is **Luz Superior** (79).
   - The four phases → **Behina Alef / Bet / Guimel / Dalet / Shoresh** (Hebrew
     letter ordinals). A generic `בחינת X` → **o discernimento de X**.
   - `קטנות` / `גדלות` → **Katnut / Gadlut**, as in English. `פב"פ` → **face a
     face**.
   - `אות N` → **item N**, lower-case. `דף N` → **p. N**.
3. **The lemma rule, as in English.** Inside a bolded `<b>` lemma, follow the
   pane's _phrasing_ (its verbs and word order). **Technical terms and name
   spellings in this table never follow the pane**, lemma or not. No pane is in
   Portuguese yet, so this only matters if you read the Spanish, French or
   Russian panes for orientation. Their spellings (Jojmá, Maljut, ZoN, AJaP…)
   are banned here.
4. **Never emend, never drop.** This is unchanged from `docs/translation-rules.md`.

## 1. Conventions

### 1.1 Transliteration scheme (BB Portuguese)

| Hebrew                | Portuguese              | Attested examples (counts)                                                                                                                              |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ח word-initial        | **h**                   | Hochma 114, Hesed 6, Haya 44, Hassadim 23, Hotem 3, Hirik 8, Holam 9, HGT 22, HB 17. Exceptions BB fixes: **Chazeh** 68, and the name **Chaim** Vital 4 |
| ח medial/final        | **ch**                  | Achoraim 40, Achor 9, Netzach 6, Metzach 8, Ruach 23, Massach 240, Mochin 98, Rachamim 4                                                                |
| כ soft                | **ch**                  | Malchut 145, Hizdakchut 28, Melech 22, Melachim 1, Shechinah 3, Halacha 3                                                                               |
| כּ, ק                 | **k**                   | Keter 138, Kli 110, Kelim 181, Kedusha 22, Klipot 18, Nekudim 169, Akudim, Katnut 23, KHB 27                                                            |
| צ                     | **tz**                  | Atzilut 226, Yetzira 64, Partzuf 300, Tzimtzum 66, Netzach, Metzach, Etzbaot, Mitzvot                                                                   |
| שׁ                    | **sh**                  | Shoresh 19, Neshama 60, Bitush 30, Hitlabshut 34, Reshimo, Shuruk 13, Shechinah                                                                         |
| ס / שׂ between vowels | **ss**                  | Massach 240, Yessod 13, Assia 54, Hassadim 23 (but Sefira, Sof, Sium, Nikvey)                                                                           |
| ג before e/i          | **gu**                  | Guimel 49, Guevura 6                                                                                                                                    |
| ב soft, consonantal ו | **v**                   | Vav 9, HaVaYaH 10, VAK 49, Dvekut 4, Nikvey 45                                                                                                          |
| final ה after a       | **-a, no accent, no h** | Hochma, Bina, Beria, Yetzira, Assia, Neshama, Haya, Yehida, Sefira, Kedusha, Klipa, Yenika, Mitzva                                                      |
| final ה after e       | **-eh**                 | **Peh** 96, **Chazeh** 68 (never Pe / Chaze). Other -h endings: HaVaYaH, Shechinah, the letter Hey                                                      |
| vocal sheva           | **e**                   | Neshama, Guevura, Bereshit, Sefirot, Nekudim, Kelim, Reshimo                                                                                            |
| י as consonant        | **y**                   | Yessod, Yehida, Yetzira, Yenika, Haya, Nikvey, Eynaim                                                                                                   |
| Hebrew plural         | **kept, never + s**     | Sefirot, Partzufim, Kelim, Gufim, Roshim, Klipot, Hassadim, Mochin, Nekudot, Otiot, Taamim, Reshimot, Behinot                                           |

**Accents.** Transliterations carry **no accents**: Keter, Tiferet, Bina, Parsa,
Atik, Beria, Assia, Daat. Portuguese words keep normal orthography (Cabalá,
Emanador, nível). Every accented Spanish spelling (Kéter, Biná, Jojmá, Parsá,
Átik, Beriá, Asiá, Dáat, Néfesh…) occurs **0** times, and the gate bans them.

Copy the table's spelling exactly. BB has minority spellings — Chessed 2,
Gevura 1, Yesod 1, Assiya 1, Yechida 1, Eyanim 7, Ohr Chozer 3, Nikvei 1 —
and none of them is a model.

### 1.2 Capitalization

- **Luz** is always capitalized for אור (340 : 9; the 9 are daylight). The
  plural is **Luzes** (103 : 4).
- **Named lights** are written Ohr + capitalized name: Ohr Hozer, Ohr Makif,
  Ohr Pnimi, Ohr Yashar, Ohr Hochma, Ohr Hassadim. The NRNHY lights are
  **a Luz de Nefesh / Ruach / Neshama / Haya / Yehida** (Luz de Yehida 16,
  Luz de Haya 10 : Ohr Haya 4).
- **Proper Hebrew terms** are capitalized: Sefirot and their names, Partzuf,
  the worlds, every part of a Partzuf, and every transliterated technical noun
  (Massach, Aviut, Zivug, Reshimo, Behina, Kli…).
- **Translated technical nouns** are lower-case: linha, grau, nível, raiz,
  correção, quebra, expansão, saída, discernimento, desejo de receber.
- **mundo** is lower-case: o mundo de Atzilut. The exceptions are the fixed name
  **Mundos Superiores** (6) and headings. **dez** is lower-case in dez Sefirot
  (213 : 3).
- **Superior** is always capitalized, as a noun and as an adjective: o Superior
  (53), Luz Superior, Partzuf Superior, AVI Superior (185 : 9).
  **inferior** is always lower-case: o inferior, a Hey inferior (125 : 1).
  Write **de Cima para baixo** (Cima 39 : 4).
- **The Creator** and His pronouns are capitalized: o Criador (134), o Emanador
  (18), Sua Essência, Ele / Sua / Seu.
- **Reference labels:** **item N**, **itens N–M**, **resposta N**, **pergunta N**
  and **p. N** are lower-case. **Parte N** and **Capítulo N** are capitalized
  (§2.9).

### 1.3 Acronyms

BB Portuguese writes **every Hebrew acronym in plain capitals, letter by
letter, English-style**: AK 339, AVI 152, ZON 124, AHP 87, BYA 73, ZA 70,
ZAT 69, GAR 60, AA 60, MAN 58, VAK 49, BON 48, ABYA 39, YESHSUT 35, KHB 27,
HGT 22, GE 21, NHY 20, NRN 20, HB 17, NHYM 14, KHB TM 8, TNHY 7, TNHYM 5,
KHBD 3, NRNHY 3, TANTA 2, HBD 1. The single exception is the Name
**HaVaYaH** (10).

- **Never** use the Spanish mixed-case forms (AJaP, JaGaT, NeHY, KaJaB, ZoN,
  GaR, ZaT, VaK, MaN). All of them occur 0 times, and the gate bans them.
- **Spell a name out only where the Hebrew does:** אריך אנפין → Arich Anpin,
  זעיר אנפין → Zeir Anpin, אבא ואמא → Aba ve Ima, אדם קדמון → Adam Kadmon.

### 1.4 Quotation marks

- **“…”** for every quotation (528 open, 529 close).
- **‘…’** for a quotation inside a quotation (27).
- The apostrophe is **’**.
- There are **no « »** (0) and **no straight `"`** (0).

The pairs are the same as the English run's, so the existing curly-quote gate
applies unchanged.

### 1.5 Glosses

Put glosses in **parentheses**. BB has no brackets: the only `[…]` in I and P
are footnote numbers. Gloss a transliterated term **once per item**, then
write it bare.

Use BB's attested glosses:

- **Parts of a Partzuf:** Rosh (cabeça), Guf (corpo), Toch (interiores in BB; write interior),
  Sof (fim), Peh (boca), Tabur (umbigo), Chazeh (peito), Ozen (orelha),
  Hotem (nariz), Eynaim (olhos), Nikvey Eynaim (pupilas), Sium (final),
  Sium Raglin (fim das pernas), Etzbaot Raglin (dedos dos pés),
  Raglaim (pés).
- **Screen and coupling:** Kli (vaso), Kelim (plural de Kli), Massach (tela),
  Aviut (espessura), Zivug de Hakaa (acoplamento por golpe), Zivugim (plural
  de Zivug), Reshimo (singular de Reshimot), Reshimot (registros),
  Hitlabshut (vestimenta), Bitush (batida), Hizdakchut (purificação),
  Zakut (pureza), Hitpashtut (expansão).
- **Phases and lights:** Behina (discernimento), Behinot (plural de Behina),
  Behina Shoresh / Alef / Bet / Guimel / Dalet (Fase Raiz / Um / Dois / Três /
  Quatro), Ohr Hozer (Luz Refletida), Ohr Makif (Luz Circundante),
  Ohr Pnimi (Luz Interna), Ohr Yashar (Luz Direta), Ohr Hochma (Luz de
  Sabedoria), Ohr Hassadim (Luz de Misericórdia), Tzimtzum Alef (Primeira
  Restrição), Tzimtzum Bet (segunda restrição).
- **Partzufim and states:** Partzufim (plural de Partzuf), Sefira (singular de
  Sefirot), Nukva (feminino), Achoraim (Kelim posteriores), Panim (Kelim
  anteriores), Achor (costas), Katnut (pequenez), Gadlut (grandeza),
  Ubar (embrião), Yenika (amamentação), Ibur Bet (segunda concepção),
  ZAT (sete Sefirot inferiores), MAN (Mayin Nukvin, águas femininas).
- **TANTA:** Taamim (sabores), Nekudot (pontos), Otiot (letras).
- **Other terms:** Klipot (cascas), Klipa (casca), Kedusha (santidade),
  Dvekut (adesão), Din (julgamento), Rachamim (misericórdia),
  Melech (Rei), Tikun (correção), Shoresh (raiz).

### 1.6 Translate or transliterate

- **Transliterate** (BB's choice in P): Kli / Kelim, Massach, Aviut, Zakut,
  Hizdakchut, Reshimo / Reshimot, Zivug, Zivug de Hakaa, Hitlabshut, Bitush,
  Tzimtzum, Behina / Behinot (named phases), Katnut, Gadlut, Mochin, Klipot /
  Klipa, Kedusha, Dvekut, Hitkalelut, Ibur, Yenika, Ubar, Panim, Achor /
  Achoraim, the TANTA quartet (Taamim, Nekudot, Tagin, Otiot), Melech /
  Melachim, Din, Ein Sof, the named lights (Ohr Hozer…), the Sefirot, the
  Partzufim and their parts, the worlds, and NRNHY.
- **Translate:** Luz / Luzes, Luz Superior, linha, círculos, retidão, golpe,
  saída, expansão, quebra, correção, grau, nível, raiz, discernimento (generic
  בחינה), desejo de receber / doar, doação, disparidade / equivalência /
  oposição de forma, internalidade / externalidade, espaço vazio, Emanador,
  ser emanado, Criador, Essência, iluminação, abundância, centelhas,
  masculino / feminino, misericórdia, face a face / costas com costas.
- **Don't double up.** Inside one item, don't alternate a transliteration with
  its translation (Kli / vaso). Write the binding form and gloss it once.

### 1.7 Grammar of transliterated nouns

**Gender (attested):**

- **Masculine:** o Kli (46), o Massach (84), o Zivug (34), o Reshimo (18),
  o Bitush (13), o Tzimtzum (28), o Partzuf (74), o Peh, o Tabur, o Chazeh,
  o Rosh, o Guf, o Sium, os Kelim (55), os Mochin (43), os Reshimot (16),
  os Taamim.
- **Feminine:** a Aviut (30), a Behina (17), a Sefira (18), a Malchut (17),
  a Parsa (24), a Nukva, a Hizdakchut (7), a Hitlabshut, a Katnut,
  as Nekudot, as Otiot, a Klipa.
- **The named lights are feminine**, because Luz is: **a Ohr Hozer** (6),
  a Ohr Makif, "Conforme ela veste…".

**Other rules:**

- **No article before a Partzuf's name:** Partzuf AB (31), Partzuf Atik (14).
- **Construct state with "de":** Malchut de Rosh, Kelim de Panim, Mochin de
  Gadlut, Reshimo de Aviut, Zivug de Hakaa. Contract the article only before
  Portuguese nouns (do Superior, da Luz).
- **Hebrew plurals keep their form.** Never write "Partzufs", "Klis" or
  "Reshimos" (0).

### 1.8 Markup

- **Lemma.** Reproduce the Hebrew `<b>…</b>` exactly, with the same boundaries,
  and bold only that.
- **Tag counts.** `<b>`, `<br>` and `<small>` counts stay identical to the
  Hebrew, as the existing gate checks.
- **Italics.** BB italicizes every transliteration (`<em>`: 5,769 in the
  Pticha, 503 in the Intro). **Do not add `<em>`.** It is typography, not
  terminology, and the gate compares tags against the Hebrew. This is the same
  call as the Spanish and French tables.
- **Stray spaces.** BB's export pads italics with spaces ("Massach ,",
  "( Hizdakchut )"). That is an artefact; don't copy it.
- **Inline item markers** become gematria Arabic numerals, `(ב)` → `(2)`, as
  in English. BB drops them; we don't.
- **Bolded letters** stay bold and take their names: `<b>Hey</b>`,
  `<b>Vav</b>`, `<b>Yod</b>`, `<b>Alef</b>`.

## 2. The binding table

Columns: Hebrew · English canon (orientation only, not binding) · **Português** (binding) · evidence counted in I / P (binding form first, competing forms after ·) · status · note. OFFICIAL = the binding form occurs in BB's Portuguese; PROPOSED = BB is silent and the form follows BB's scheme by the analogy named.

### 2.1 The 125 entries of tes-en.index.json (in its order) (125 rows)

| Hebrew                          | English canon                         | Português                    | Evidence (I / P)                                                                              | Status   | Note                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| אור                             | light                                 | **Luz**                      | Luz 340 (I73 P267) · luz 9 (I7 P2) · Ohr (only in named lights) 161 (I0 P161)                 | OFFICIAL | Always capitalized for אור. Lower-case luz only for mundane light. Ohr appears only inside the named lights (Ohr Hozer, Ohr Makif, …), never alone.                                                                                                                                   |
| אורות                           | lights                                | **Luzes**                    | Luzes 103 (I8 P95) · luzes 4 (I1 P3)                                                          | OFFICIAL | Capitalized like Luz.                                                                                                                                                                                                                                                                 |
| אור עליון                       | upper light                           | **a Luz Superior**           | a Luz Superior 79 (I0 P79) · Luz superior 0 (I0 P0) · Ohr Elyon 0 (I0 P0)                     | OFFICIAL | Fixed name, both words capitalized.                                                                                                                                                                                                                                                   |
| כלי                             | vessel                                | **Kli**                      | Kli 110 (I0 P110) · vaso 15 (I0 P15)                                                          | OFFICIAL | Transliterated, masculine: o Kli (46). Gloss once: Kli (vaso), P §1. Exceptions BB keeps in Portuguese: כלי קבלה → vaso de recepção; שבירת הכלים → a quebra dos vasos.                                                                                                                |
| כלים                            | vessels                               | **Kelim**                    | Kelim 181 (I0 P181) · vasos 33 (I5 P28)                                                       | OFFICIAL | os Kelim (55). Gloss once: Kelim (plural de Kli), P. The 28 P "vasos" are the fixed phrases quebra dos vasos / vasos de recepção.                                                                                                                                                     |
| כלי קבלה                        | vessel of reception                   | **vaso de recepção**         | vaso de recepção 25 (I1 P24) · Kli de recepção 0 (I0 P0)                                      | OFFICIAL | Plural vasos de recepção (12). BB never writes "Kli de recepção".                                                                                                                                                                                                                     |
| מסך                             | screen                                | **Massach**                  | Massach 240 (I0 P240) · tela 1 (I0 P1) · Masach 0 (I0 P0)                                     | OFFICIAL | Double s, masculine: o Massach (84). Gloss once: Massach (tela), P §14. Never Masach / Masaj / "tela" in prose.                                                                                                                                                                       |
| עביות                           | coarseness                            | **Aviut**                    | Aviut 181 (I0 P181) · espessura 2 (I0 P2) · grossura 1 (I0 P1)                                | OFFICIAL | Feminine: a Aviut (30). Gloss once: Aviut (espessura), P §1/§18. Levels: Aviut Shoresh / Alef / Bet / Guimel / Dalet.                                                                                                                                                                 |
| עב                              | coarse                                | **espesso, espessa**         | espesso, espessa 3 (I0 P3) · grosseiro 4 (I4 P0)                                              | OFFICIAL | Comparative: mais espesso / com mais Aviut. "grosseiras" (4) is the Intro's moral sense (coarse garments), not the screen.                                                                                                                                                            |
| זכות                            | refinement                            | **Zakut**                    | Zakut 1 (I0 P1) · pureza 4 (I2 P2)                                                            | OFFICIAL | Thin (1): "sua Aviut torna-se Zakut (pureza)", P. Gloss once. Keep apart from Hizdakchut (the process).                                                                                                                                                                               |
| זך                              | refined                               | **puro, pura**               | puro, pura 12 (I7 P5) · Zach 0 (I0 P0)                                                        | OFFICIAL | "um Kli muito puro", "a mais pura de todas" (P). Superlative o mais puro.                                                                                                                                                                                                             |
| הזדככות                         | refinement                            | **Hizdakchut**               | Hizdakchut 28 (I0 P28) · purificação 12 (I4 P8)                                               | OFFICIAL | a Hizdakchut (7). Gloss once: Hizdakchut (purificação), P §35. Verb purificar-se ("o Massach se purifica").                                                                                                                                                                           |
| רשימו                           | record                                | **Reshimo**                  | Reshimo 32 (I0 P32) · registro 1 (I0 P1)                                                      | OFFICIAL | Masculine: o Reshimo (18). Gloss once: Reshimo (singular de Reshimot), P §40. Reshimo de Aviut / Reshimo de Hitlabshut.                                                                                                                                                               |
| זווג                            | coupling                              | **Zivug**                    | Zivug 102 (I0 P102) · acoplamento 4 (I0 P4)                                                   | OFFICIAL | Masculine: o Zivug (34), um Zivug (20). Plural Zivugim (P writes "Zivug im (plural de Zivug – acoplamento)"). Verbs: fazer um Zivug, acoplar-se (P "se acopla em um Zivug de Hakaa"). The repo ToC writes "acoplamentos" — §4.                                                        |
| הכאה                            | striking                              | **golpe**                    | golpe 6 (I0 P6) · Hakaa outside Zivug de Hakaa 0 (I0 P0)                                      | OFFICIAL | Hakaa (52) occurs only inside "Zivug de Hakaa". The striking itself is um golpe (6); "choque" is BB's gloss of golpe, don't alternate.                                                                                                                                                |
| זווג דהכאה                      | coupling by striking                  | **Zivug de Hakaa**           | Zivug de Hakaa 52 (I0 P52) · acoplamento por golpe 1 (I0 P1)                                  | OFFICIAL | Gloss once: Zivug de Hakaa (acoplamento por golpe), P §14.                                                                                                                                                                                                                            |
| עולם                            | world                                 | **mundo**                    | mundo 445 (I208 P237) · Mundo 17 (I13 P4)                                                     | OFFICIAL | Lower-case: o mundo de Atzilut (32), o mundo de Nekudim (30). Capitalized only in the fixed name Mundos Superiores (6) and in headings.                                                                                                                                               |
| צמצום                           | restriction                           | **Tzimtzum**                 | Tzimtzum 66 (I0 P66) · restrição 10 (I1 P9)                                                   | OFFICIAL | Transliterated, masculine: o Tzimtzum (28). Gloss once: Tzimtzum Alef (Primeira Restrição), P. "restrição" (10) is BB's gloss and the moral sense. The repo ToC titles Part 1 "Restrição e linha" — §4.                                                                               |
| קו                              | line                                  | **linha**                    | linha 12 (I0 P12) · Kav 0 (I0 P0)                                                             | OFFICIAL | Translated (12 : Kav 0). קו דק → uma linha fina. Right / left / middle line → linha direita / esquerda / média.                                                                                                                                                                       |
| עיגולים                         | circles                               | **círculos**                 | círculos 0 (I0 P0) · Igulim 0 (I0 P0)                                                         | PROPOSED | BB Portuguese is silent (0 : 0). Translated by analogy with BB's linha for קו, and matches the repo ToC "Círculos e retidão".                                                                                                                                                         |
| עיגול                           | circle                                | **círculo**                  | círculo 0 (I0 P0) · Igul 0 (I0 P0)                                                            | PROPOSED | As círculos.                                                                                                                                                                                                                                                                          |
| יושר                            | straightness                          | **retidão**                  | retidão 0 (I0 P0) · Yosher 0 (I0 P0)                                                          | PROPOSED | Silent in BB; matches the repo ToC "Círculos e retidão".                                                                                                                                                                                                                              |
| הסתכלות פנימית                  | Inner Observation                     | **Observação Interior**      | Observação Interior 0 (I0 P0) · Histaklut Pnimit 0 (I0 P0)                                    | PROPOSED | BB Portuguese never names the section (its Intro is abridged before §156's reading guide). Adopts the shipped UI string. Title case.                                                                                                                                                  |
| הסתכלות                         | look                                  | **olhar**                    | olhar 0 (I0 P0) · observação 3 (I3 P0)                                                        | PROPOSED | The look of the Eyes (הסתכלות). Verb olhar. Never "observação" (collides with the section name). BB has "olhar" only in non-technical senses.                                                                                                                                         |
| אור פנימי                       | inner light                           | **Ohr Pnimi**                | Ohr Pnimi 25 (I0 P25) · Luz Interna 1 (I0 P1)                                                 | OFFICIAL | The technical inner light. Gloss once: Ohr Pnimi (Luz Interna), P §33. The commentary is Luz Interior (§2.7) — never swap them.                                                                                                                                                       |
| אור מקיף                        | surrounding light                     | **Ohr Makif**                | Ohr Makif 48 (I0 P48) · Luz Circundante 1 (I1 P0)                                             | OFFICIAL | Gloss once: Ohr Makif (Luz Circundante). The Intro's non-technical "Luzes Circundantes" (1) is the reader's soul-lights, not TES vocabulary.                                                                                                                                          |
| אור ישר                         | direct light                          | **Ohr Yashar**               | Ohr Yashar 2 (I0 P2) · Luz Direta 3 (I0 P3)                                                   | OFFICIAL | Near tie (2 : 3, one of the 3 is the gloss and one a heading). Ruled Ohr Yashar so the four named lights share one form. Gloss once: Ohr Yashar (Luz Direta).                                                                                                                         |
| אור חוזר                        | reflected light                       | **Ohr Hozer**                | Ohr Hozer 45 (I0 P45) · Ohr Chozer 3 (I0 P3) · Luz Refletida 1 (I0 P1)                        | OFFICIAL | Feminine: a Ohr Hozer (6). Gloss once: Ohr Hozer (Luz Refletida). Ohr Chozer (3) is a minority spelling.                                                                                                                                                                              |
| התלבשות                         | clothing                              | **Hitlabshut**               | Hitlabshut 34 (I0 P34) · vestimenta 51 (I32 P19)                                              | OFFICIAL | Technical: Reshimo de Hitlabshut, a Hitlabshut da Luz nos Kelim. Gloss once: Hitlabshut (vestimenta). Verbs vestir / vestir-se ("a Luz se veste no Kli"). לבוש (a garment) → vestimenta.                                                                                              |
| ביטוש                           | clash                                 | **Bitush**                   | Bitush 30 (I0 P30) · batida 6 (I0 P6)                                                         | OFFICIAL | o Bitush (13). Gloss once: Bitush (batida), P §33. "o Bitush de Ohr Makif e Ohr Pnimi".                                                                                                                                                                                               |
| נאצל                            | emanated being                        | **o ser emanado**            | o ser emanado 6 (I0 P6) · o emanado 1 (I0 P1)                                                 | OFFICIAL | Plural os seres emanados.                                                                                                                                                                                                                                                             |
| מאציל                           | Emanator                              | **o Emanador**               | o Emanador 18 (I0 P18) · emanador 0 (I0 P0)                                                   | OFFICIAL | Capitalized (18 : 0).                                                                                                                                                                                                                                                                 |
| השתלשלות                        | cascading                             | **cascateamento**            | cascateamento 6 (I0 P6) · evolução 5 (I5 P0)                                                  | OFFICIAL | Noun cascateamento ("a ordem do cascateamento", P §3); verb cascatear (P 3). "evolução" (4) is the Intro's causal sense (generations, causa e consequência) — keep that for התפתחות.                                                                                                  |
| סבה ומסובב                      | cause and consequence                 | **causa e consequência**     | causa e consequência 4 (I3 P1) · causa e efeito 0 (I0 P0)                                     | OFFICIAL | BB 4 : 0. The repo UI/ToC write "Causa e efeito" — §4. מסובב alone → consequência.                                                                                                                                                                                                    |
| בחינה                           | phase                                 | **Behina**                   | Behina 337 (I0 P337) · Behinot 15 (I0 P15) · discernimento(s) 94 (I47 P47) · fase 2 (I1 P1)   | OFFICIAL | Two attested uses, split by sense: the named phases are Behina + Hebrew ordinal (Behina Alef/Bet/Guimel/Dalet/Shoresh, 267 of the 337). Generic בחינת X → "o discernimento de X" (BB 94). Feminine: a Behina. Plural Behinot. Never "fase" in prose (BB uses it only inside glosses). |
| ד' בחינות                       | four phases                           | **os quatro discernimentos** | os quatro discernimentos 12 (I5 P7) · quatro Behinot 4 (I0 P4) · quatro fases 2 (I0 P2)       | OFFICIAL | P 7 : 4 (I adds 5 in another sense). The four phases of Ohr Yashar, P §§4-6: "os quatro discernimentos". Each one by name is Behina X. "as quatro Behinot" is BB too — not wrong, but write the majority.                                                                             |
| בחי"ד                           | phase four                            | **Behina Dalet**             | Behina Dalet 119 (I0 P119) · quarta Behina 0 (I0 P0) · Fase Quatro 1 (I0 P1)                  | OFFICIAL | Hebrew letter ordinal after the noun: Behina Shoresh (9), Alef (44), Bet (46), Guimel (49), Dalet (119). Gloss once: Behina Dalet (Fase Quatro), P §5.                                                                                                                                |
| שבירה                           | breaking                              | **quebra**                   | quebra 20 (I0 P20) · ruptura 0 (I0 P0) · Shevira 0 (I0 P0)                                    | OFFICIAL | שבירת הכלים → a quebra dos vasos. Verb quebrar-se ("os Kelim se quebram", 12 quebraram).                                                                                                                                                                                              |
| תיקון                           | correction                            | **correção**                 | correção 24 (I5 P19) · Tikun 9 (I1 P8)                                                        | OFFICIAL | Generic correção (24 : Tikun 9). The world is o mundo do Tikun (§2.4). Verb corrigir. Gmar Tikun → o final da correção.                                                                                                                                                               |
| התפשטות                         | expansion                             | **expansão**                 | expansão 12 (I0 P12) · Hitpashtut 12 (I0 P12)                                                 | OFFICIAL | Exact tie (12 : 12). Ruled expansão: translated nouns are BB's default for process words, BB glosses Hitpashtut (expansão), and the repo ToC says "segunda expansão". Verb expandir-se / estender-se.                                                                                 |
| הסתלקות                         | departure                             | **saída**                    | saída 27 (I1 P26) · Histalkut 0 (I0 P0) · partida 0 (I0 P0)                                   | OFFICIAL | BB renders הסתלקות as saída (P §17, "a expansão da Luz e sua saída"; "a força de Din da saída das Luzes"). Verbs sair, retirar-se. יציאה (emergence) → surgimento / emergir, not saída.                                                                                               |
| מדרגה                           | degree                                | **grau**                     | grau 127 (I5 P122) · degrau 27 (I25 P2)                                                       | OFFICIAL | Never nível (that is קומה). "degrau" (27) is the Intro's ladder-rung image.                                                                                                                                                                                                           |
| קומה                            | level                                 | **nível**                    | nível 295 (I1 P294) · estatura 1 (I1 P0)                                                      | OFFICIAL | "o nível de Keter".                                                                                                                                                                                                                                                                   |
| שורש                            | root                                  | **raiz**                     | raiz 32 (I2 P30) · Shoresh 19 (I0 P19)                                                        | OFFICIAL | Translated; Shoresh (19) only as the phase name Behina Shoresh and Aviut Shoresh.                                                                                                                                                                                                     |
| רצון לקבל                       | will to receive                       | **desejo de receber**        | desejo de receber 47 (I2 P45) · vontade de receber 0 (I0 P0)                                  | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| רצון להשפיע                     | will to bestow                        | **desejo de doar**           | desejo de doar 5 (I0 P5) · desejo de outorgar 0 (I0 P0)                                       | OFFICIAL | השפעה → doação (16).                                                                                                                                                                                                                                                                  |
| שינוי צורה                      | disparity of form                     | **disparidade de forma**     | disparidade de forma 13 (I0 P13) · diferença de forma 1 (I0 P1) · oposição de forma 3 (I0 P3) | OFFICIAL | שינוי צורה → disparidade; הפכיות הצורה → oposição de forma (3).                                                                                                                                                                                                                       |
| השתוות הצורה                    | equivalence of form                   | **equivalência de forma**    | equivalência de forma 9 (I0 P9) · igualdade de forma 0 (I0 P0)                                | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| פנימיות                         | internality                           | **internalidade**            | internalidade 6 (I0 P6) · interioridade 0 (I0 P0)                                             | OFFICIAL | P 6.                                                                                                                                                                                                                                                                                  |
| חיצוניות                        | externality                           | **externalidade**            | externalidade 4 (I0 P4) · exterioridade 0 (I0 P0)                                             | OFFICIAL | P 4. Adjectives interno / externo ("as dez Sefirot externas").                                                                                                                                                                                                                        |
| חלל                             | space                                 | **espaço vazio**             | espaço vazio 9 (I0 P9) · espaço restrito 1 (I0 P1)                                            | OFFICIAL | חלל → espaço vazio (9). חלל המצומצם → o espaço restrito (1).                                                                                                                                                                                                                          |
| מקום פנוי                       | vacant place                          | **espaço vazio**             | espaço vazio 9 (I0 P9) · lugar vazio 0 (I0 P0)                                                | OFFICIAL | Same Portuguese as חלל; BB does not distinguish them.                                                                                                                                                                                                                                 |
| עצמות                           | self                                  | **Essência**                 | Essência 13 (I0 P13) · essência 12 (I5 P7)                                                    | OFFICIAL | "Sua Essência" (P §1). Capitalized for the Creator's Essence. בעצמותו → em Si mesmo.                                                                                                                                                                                                  |
| בורא                            | Creator                               | **o Criador**                | o Criador 134 (I128 P6) · criador 0 (I0 P0)                                                   | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| טעמים                           | tastes                                | **Taamim**                   | Taamim 30 (I9 P21) · Taamin 2 (I2 P0) · sabores 4 (I4 P0)                                     | OFFICIAL | Gloss once: Taamim (sabores), P. os Taamim. טעם = reason → razão.                                                                                                                                                                                                                     |
| נקודות                          | Nekudot                               | **Nekudot**                  | Nekudot 48 (I0 P48) · pontos 5 (I0 P5)                                                        | OFFICIAL | Feminine: as Nekudot. Gloss once: Nekudot (pontos). Singular Nekuda (5); a geometric/vowel point → ponto.                                                                                                                                                                             |
| אותיות                          | letters                               | **Otiot**                    | Otiot 25 (I0 P25) · letras 7 (I3 P4)                                                          | OFFICIAL | TaNTA / vessel sense (25). Letters of a word or name → letras (as vinte e duas letras, a letra Yod).                                                                                                                                                                                  |
| חסדים                           | Hassadim                              | **Hassadim**                 | Hassadim 23 (I0 P23) · Hasadim 0 (I0 P0) · Chassadim 0 (I0 P0)                                | OFFICIAL | אור החסדים → Ohr Hassadim (§2.5).                                                                                                                                                                                                                                                     |
| ספירה                           | Sefira                                | **Sefira**                   | Sefira 24 (I0 P24) · Sefirá 0 (I0 P0)                                                         | OFFICIAL | Feminine: a Sefira (18). Gloss once: Sefira (singular de Sefirot).                                                                                                                                                                                                                    |
| ספירות                          | Sefirot                               | **Sefirot**                  | Sefirot 267 (I16 P251) · sefirot 0 (I0 P0)                                                    | OFFICIAL | Always capitalized.                                                                                                                                                                                                                                                                   |
| עשר ספירות / ע"ס                | ten Sefirot                           | **dez Sefirot**              | dez Sefirot 213 (I3 P210) · Dez Sefirot 3 (I1 P2)                                             | OFFICIAL | Lower-case dez (213 : 3, the 3 are titles). ע"ס / י"ס alike.                                                                                                                                                                                                                          |
| פרצוף                           | Partzuf                               | **Partzuf**                  | Partzuf 300 (I7 P293) · Partzufs 0 (I0 P0)                                                    | OFFICIAL | o Partzuf (74). No article before a name: Partzuf AB (31), Partzuf Atik (14).                                                                                                                                                                                                         |
| פרצופים                         | Partzufim                             | **Partzufim**                | Partzufim 172 (I0 P172) · Partzufin 0 (I0 P0)                                                 | OFFICIAL | Gloss once: Partzufim (plural de Partzuf), P §16.                                                                                                                                                                                                                                     |
| ראש                             | Rosh                                  | **Rosh**                     | Rosh 226 (I8 P218) · cabeça 2 (I0 P2)                                                         | OFFICIAL | Gloss Rosh (cabeça). Plural Roshim (8).                                                                                                                                                                                                                                               |
| תוך                             | Toch                                  | **Toch**                     | Toch 12 (I0 P12) · Toj 0 (I0 P0)                                                              | OFFICIAL | Gloss Toch (interior). The preposition תוך/בתוך → dentro de.                                                                                                                                                                                                                          |
| סוף                             | Sof                                   | **Sof**                      | Sof 48 (I0 P48) · fim 39 (I19 P20)                                                            | OFFICIAL | Gloss Sof (fim). Not Ein Sof.                                                                                                                                                                                                                                                         |
| גוף                             | Guf                                   | **Guf**                      | Guf 183 (I3 P180) · corpo 27 (I17 P10)                                                        | OFFICIAL | Gloss Guf (corpo). Plural Gufim (25).                                                                                                                                                                                                                                                 |
| אין סוף / א"ס                   | Ein Sof                               | **Ein Sof**                  | Ein Sof 33 (I0 P33) · Infinito 0 (I0 P0)                                                      | OFFICIAL | א"ס ב"ה → Ein Sof (honorific dropped).                                                                                                                                                                                                                                                |
| אצילות                          | Atzilut                               | **Atzilut**                  | Atzilut 226 (I26 P200) · Atziluth 1 (I0 P1)                                                   | OFFICIAL | ATZILUTH (1) is a heading typo.                                                                                                                                                                                                                                                       |
| בריאה                           | Beria                                 | **Beria**                    | Beria 58 (I13 P45) · Beriá 0 (I0 P0)                                                          | OFFICIAL | No accent in BB. The repo ToC writes "Beriá" — §4.                                                                                                                                                                                                                                    |
| יצירה                           | Yetzira                               | **Yetzira**                  | Yetzira 64 (I16 P48) · Yetzirá 0 (I0 P0)                                                      | OFFICIAL | No accent. The repo ToC writes "Yetzirá" — §4.                                                                                                                                                                                                                                        |
| עשיה                            | Assiya                                | **Assia**                    | Assia 54 (I12 P42) · Assiya 1 (I0 P1) · Assiyá 0 (I0 P0)                                      | OFFICIAL | Assia 54 : Assiya 1. The repo ToC writes "Assiyá" — §4.                                                                                                                                                                                                                               |
| אבי"ע                           | ABYA                                  | **ABYA**                     | ABYA 39 (I7 P32)                                                                              | OFFICIAL | Gloss once: ABYA (Atzilut, Beria, Yetzira, Assia), P.                                                                                                                                                                                                                                 |
| אדם קדמון / א"ק                 | Adam Kadmon / AK                      | **Adam Kadmon / AK**         | Adam Kadmon / AK 339 (I0 P339) · Adam Kadmon 0 (I0 P0)                                        | OFFICIAL | BB writes only AK (339). Where the Hebrew spells it out, write Adam Kadmon (PROPOSED form, no accent).                                                                                                                                                                                |
| כתר                             | Keter                                 | **Keter**                    | Keter 138 (I3 P135) · Kéter 0 (I0 P0)                                                         | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| חכמה                            | Hochma                                | **Hochma**                   | Hochma 114 (I2 P112) · Chochma 0 (I0 P0) · Sabedoria (Sefira) 1 (I0 P1)                       | OFFICIAL | Sabedoria only for חכמת הקבלה (a sabedoria da Cabalá) and BB's gloss Ohr Hochma (Luz de Sabedoria).                                                                                                                                                                                   |
| בינה                            | Bina                                  | **Bina**                     | Bina 127 (I2 P125) · Binah 0 (I0 P0)                                                          | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| חסד                             | Hesed                                 | **Hesed**                    | Hesed 6 (I0 P6) · Chessed 2 (I2 P0)                                                           | OFFICIAL | 6 : 2 (both Chessed in Intro/Pticha glosses). Initial ח → H, as Hochma, Hassadim, Haya.                                                                                                                                                                                               |
| גבורה                           | Gevura                                | **Guevura**                  | Guevura 6 (I0 P6) · Gevura 1 (I1 P0)                                                          | OFFICIAL | 6 : 1. gu before e, as Guimel (49). Plural: see Guevurot, §2.6.                                                                                                                                                                                                                       |
| תפארת                           | Tifferet                              | **Tiferet**                  | Tiferet 65 (I1 P64) · Tifferet 0 (I0 P0)                                                      | OFFICIAL | Single f (64 : 0).                                                                                                                                                                                                                                                                    |
| נצח                             | Netzah                                | **Netzach**                  | Netzach 6 (I1 P5) · Netzah 0 (I0 P0)                                                          | OFFICIAL | Final ח → ch here (6 : 0), unlike initial ח.                                                                                                                                                                                                                                          |
| הוד                             | Hod                                   | **Hod**                      | Hod 6 (I1 P5)                                                                                 | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| יסוד                            | Yesod                                 | **Yessod**                   | Yessod 13 (I1 P12) · Yesod 1 (I0 P1)                                                          | OFFICIAL | Double s between vowels (13 : 1, the 1 is "Ateret Yesod"), as Massach, Assia.                                                                                                                                                                                                         |
| מלכות                           | Malchut                               | **Malchut**                  | Malchut 145 (I4 P141) · Malchuts 1 (I0 P1)                                                    | OFFICIAL | Feminine: a Malchut. Plural Malchuyot (PROPOSED, Hebrew plural; BB's single "Malchuts" is not a model).                                                                                                                                                                               |
| גלגלתא                          | Galgalta                              | **Galgalta**                 | Galgalta 38 (I0 P38)                                                                          | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| ע"ב                             | AB                                    | **AB**                       | AB 98 (I0 P98)                                                                                | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| ס"ג                             | SAG                                   | **SAG**                      | SAG 128 (I0 P128)                                                                             | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| מ"ה                             | MA                                    | **MA**                       | MA 104 (I0 P104)                                                                              | OFFICIAL | מ"ה החדש → o novo MA (25).                                                                                                                                                                                                                                                            |
| ב"ן                             | BON                                   | **BON**                      | BON 48 (I0 P48) · BAN 0 (I0 P0)                                                               | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| נקודים                          | Nekudim                               | **Nekudim**                  | Nekudim 169 (I0 P169)                                                                         | OFFICIAL | o mundo de Nekudim.                                                                                                                                                                                                                                                                   |
| ג"ר                             | GAR                                   | **GAR**                      | GAR 60 (I0 P60) · GaR 0 (I0 P0)                                                               | OFFICIAL | All caps (60 : 0).                                                                                                                                                                                                                                                                    |
| ז"ת                             | ZAT                                   | **ZAT**                      | ZAT 69 (I0 P69) · ZaT 0 (I0 P0)                                                               | OFFICIAL | Gloss once: ZAT (sete Sefirot inferiores), P.                                                                                                                                                                                                                                         |
| ו"ק                             | VAK                                   | **VAK**                      | VAK 49 (I0 P49) · VaK 0 (I0 P0)                                                               | OFFICIAL | "VAK sem Rosh".                                                                                                                                                                                                                                                                       |
| כח"ב                            | KHB                                   | **KHB**                      | KHB 27 (I0 P27) · KaJaB 0 (I0 P0)                                                             | OFFICIAL | Gloss once: KHB (Keter - Hochma - Bina), P.                                                                                                                                                                                                                                           |
| חג"ת                            | HGT                                   | **HGT**                      | HGT 22 (I0 P22) · JaGaT 0 (I0 P0)                                                             | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| נה"י                            | NHY                                   | **NHY**                      | NHY 20 (I0 P20) · NeHY 0 (I0 P0)                                                              | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| זו"ן                            | ZON                                   | **ZON**                      | ZON 124 (I0 P124) · ZoN 0 (I0 P0)                                                             | OFFICIAL |                                                                                                                                                                                                                                                                                       |
| ז"א                             | ZA                                    | **ZA**                       | ZA 70 (I0 P70)                                                                                | OFFICIAL | Spelled-out זעיר אנפין → Zeir Anpin (§2.3, PROPOSED).                                                                                                                                                                                                                                 |
| א"א                             | AA                                    | **AA**                       | AA 60 (I0 P60)                                                                                | OFFICIAL | Spelled-out אריך אנפין → Arich Anpin (1).                                                                                                                                                                                                                                             |
| נוקבא                           | Nukva                                 | **Nukva**                    | Nukva 48 (I0 P48)                                                                             | OFFICIAL | Feminine: a Nukva. Gloss Nukva (feminino), P.                                                                                                                                                                                                                                         |
| אח"פ                            | AHP                                   | **AHP**                      | AHP 87 (I0 P87) · AJaP 0 (I0 P0)                                                              | OFFICIAL | Gloss once: AHP (Ozen, Hotem, Peh).                                                                                                                                                                                                                                                   |
| אחורים                          | posterior                             | **Achoraim**                 | Achoraim 40 (I0 P40) · posterior(es) 3 (I0 P3)                                                | OFFICIAL | Gloss once: Achoraim (Kelim posteriores), P. Singular Achor (9). Kelim de Achoraim (24).                                                                                                                                                                                              |
| עינים                           | Einayim                               | **Eynaim**                   | Eynaim 53 (I0 P53) · Eyanim 7 (I0 P7) · Einaim 0 (I0 P0)                                      | OFFICIAL | 53 : 7 (Eyanim is a typo pattern). Gloss Eynaim (olhos).                                                                                                                                                                                                                              |
| נקבי עינים                      | Nikvey Einayim                        | **Nikvey Eynaim**            | Nikvey Eynaim 41 (I0 P41) · Nikvey Eyanim 4 (I0 P4) · Nikvei 1 (I0 P1)                        | OFFICIAL | Nikvey 45 : Nikvei 1. Gloss (pupilas).                                                                                                                                                                                                                                                |
| פה                              | Peh                                   | **Peh**                      | Peh 96 (I0 P96) · Pe 0 (I0 P0)                                                                | OFFICIAL | Gloss Peh (boca). Masculine: o Peh. Plural Peyot (P "Peyot (Plural de Peh)").                                                                                                                                                                                                         |
| חוטם                            | Hotem                                 | **Hotem**                    | Hotem 3 (I0 P3) · Chotem 0 (I0 P0)                                                            | OFFICIAL | Gloss Hotem (nariz).                                                                                                                                                                                                                                                                  |
| אזן                             | Ozen                                  | **Ozen**                     | Ozen 3 (I0 P3)                                                                                | OFFICIAL | Gloss Ozen (orelha).                                                                                                                                                                                                                                                                  |
| טבור                            | Tabur                                 | **Tabur**                    | Tabur 95 (I0 P95) · umbigo 1 (I0 P1)                                                          | OFFICIAL | Gloss Tabur (umbigo). o Tabur.                                                                                                                                                                                                                                                        |
| פרסא                            | Parsa                                 | **Parsa**                    | Parsa 42 (I0 P42) · Parsá 0 (I0 P0)                                                           | OFFICIAL | Feminine: a Parsa (da Parsa 24).                                                                                                                                                                                                                                                      |
| סיום                            | Sium                                  | **Sium**                     | Sium 46 (I0 P46)                                                                              | OFFICIAL | Gloss Sium (final). o Sium.                                                                                                                                                                                                                                                           |
| קטנות                           | Katnut                                | **Katnut**                   | Katnut 23 (I0 P23) · pequenez 2 (I1 P1)                                                       | OFFICIAL | Transliterated (23 : 2). Gloss once: Katnut (pequenez). Feminine: a Katnut.                                                                                                                                                                                                           |
| גדלות                           | Gadlut                                | **Gadlut**                   | Gadlut 37 (I0 P37) · grandeza 1 (I0 P1)                                                       | OFFICIAL | Mochin de Gadlut. Gloss once: Gadlut (grandeza).                                                                                                                                                                                                                                      |
| מוחין                           | Mochin                                | **Mochin**                   | Mochin 98 (I0 P98) · Mojin 0 (I0 P0)                                                          | OFFICIAL | Masculine plural: os Mochin (43).                                                                                                                                                                                                                                                     |
| נרנח"י (נפש/רוח/נשמה/חיה/יחידה) | Nefesh, Ruach, Neshama, Haya, Yechida | **NRNHY**                    | NRNHY 3 (I0 P3)                                                                               | OFFICIAL | The five lights: Nefesh, Ruach, Neshama, Haya, Yehida (§2.5). נר"ן → NRN (20); חנר"ן → HNRN (1).                                                                                                                                                                                      |
| הויה                            | HaVaYaH                               | **HaVaYaH**                  | HaVaYaH 10 (I1 P9)                                                                            | OFFICIAL | Gloss once: HaVaYaH (Yod, Hey, Vav, Hey).                                                                                                                                                                                                                                             |
| ה"ת                             | bottom Hey                            | **a Hey inferior**           | a Hey inferior 27 (I0 P27)                                                                    | OFFICIAL | Also for ה' תתאה.                                                                                                                                                                                                                                                                     |
| ה"ר                             | first Hey                             | **a primeira Hey**           | a primeira Hey 0 (I0 P0)                                                                      | PROPOSED | Silent in BB. Formed like a Hey inferior. ה"ר can also be ה' ראשונות → as cinco primeiras.                                                                                                                                                                                            |
| קליפות                          | shells                                | **Klipot**                   | Klipot 18 (I9 P9) · cascas 4 (I1 P3)                                                          | OFFICIAL | Gloss once: Klipot (cascas). Singular a Klipa (7).                                                                                                                                                                                                                                    |
| חכמת הקבלה                      | the wisdom of Kabbalah                | **a sabedoria da Cabalá**    | a sabedoria da Cabalá 22 (I22 P0) · Cabala 0 (I0 P0) · Kabbalah 1 (I0 P1)                     | OFFICIAL | Cabalá with accent (36 : 0). sabedoria lower-case in running text (12 : 10, the capitals open the Intro and the Pticha title).                                                                                                                                                        |
| הרב                             | the ARI                               | **o Ari**                    | o Ari 4 (I4 P0) · ARI 0 (I0 P0) · Rav 0 (I0 P0)                                               | OFFICIAL | BB names him "o Ari" (4). Use it for הרב, which in TES is the Ari. Never "o Rav" / "o Mestre".                                                                                                                                                                                        |
| עקודים                          | Akudim                                | **Akudim**                   | Akudim 1 (I0 P1)                                                                              | OFFICIAL | o mundo de Akudim.                                                                                                                                                                                                                                                                    |
| או"ח                            | reflected light                       | **a Ohr Hozer**              | a Ohr Hozer 45 (I0 P45)                                                                       | OFFICIAL | Expand the abbreviation.                                                                                                                                                                                                                                                              |
| או"י                            | direct light                          | **a Ohr Yashar**             | a Ohr Yashar 2 (I0 P2)                                                                        | OFFICIAL | Expand the abbreviation.                                                                                                                                                                                                                                                              |
| רשימות                          | records                               | **Reshimot**                 | Reshimot 37 (I0 P37) · registros 1 (I0 P1)                                                    | OFFICIAL | Masculine plural: os Reshimot (16).                                                                                                                                                                                                                                                   |
| בטישות                          | clashes                               | **Bitushim**                 | Bitushim 0 (I0 P0) · batidas 1 (I0 P1)                                                        | PROPOSED | BB has no plural; Hebrew plural as Zivugim, Partzufim.                                                                                                                                                                                                                                |

### 2.2 Sefirot and their groupings (17 rows)

| Hebrew        | English canon        | Português                 | Evidence (I / P)                                         | Status   | Note                                                       |
| ------------- | -------------------- | ------------------------- | -------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| דעת           | Daat                 | **Daat**                  | Daat 18 (I0 P18) · Dáat 0 (I0 P0)                        | OFFICIAL | Melech ha Daat (Rei Daat), P.                              |
| חב"ד          | HBD                  | **HBD**                   | HBD 1 (I0 P1)                                            | OFFICIAL |                                                            |
| כחב"ד         | KHBD                 | **KHBD**                  | KHBD 3 (I0 P3)                                           | OFFICIAL |                                                            |
| חו"ב          | HB                   | **HB**                    | HB 17 (I0 P17)                                           | OFFICIAL | HB de AVI, P.                                              |
| חו"ג          | HG                   | **HG**                    | HG 0 (I0 P0)                                             | PROPOSED | Formed like HB.                                            |
| נהי"מ         | NHYM                 | **NHYM**                  | NHYM 14 (I0 P14)                                         | OFFICIAL |                                                            |
| תנה"י         | TNHY                 | **TNHY**                  | TNHY 7 (I0 P7)                                           | OFFICIAL | Gloss once: TNHY (Tiferet, Netzach, Hod, Yessod), P.       |
| תנהי"מ        | TNHYM                | **TNHYM**                 | TNHYM 5 (I0 P5)                                          | OFFICIAL |                                                            |
| דחג"ת         | DHGT                 | **DHGT**                  | DHGT 0 (I0 P0)                                           | PROPOSED | Formed like KHBD. Read whether the ד is a prefix (de HGT). |
| חו"ב תו"מ     | HB TM                | **HB TM**                 | HB TM 4 (I0 P4) · KHB TM 8 (I0 P8)                       | OFFICIAL | Also KHB TM (8).                                           |
| גו"ע          | GE                   | **GE**                    | GE 21 (I0 P21)                                           | OFFICIAL | Gloss once: GE (Galgalta Eynaim).                          |
| גלגלתא ועינים | Galgalta ve Einayim  | **Galgalta ve Eynaim**    | Galgalta ve Eynaim 3 (I0 P3) · Galgalta Eyanim 3 (I0 P3) | OFFICIAL |                                                            |
| ה' קצוות      | the five extremities | **as cinco extremidades** | as cinco extremidades 0 (I0 P0)                          | PROPOSED | Silent in BB.                                              |
| ו"ת           | the lower six        | **VAT**                   | VAT 0 (I0 P0)                                            | PROPOSED | Formed like VAK / ZAT, all caps.                           |
| נר"ן          | NRN                  | **NRN**                   | NRN 20 (I0 P20)                                          | OFFICIAL | Gloss once: NRN (Nefesh, Ruach, Neshama).                  |
| טנת"א         | TNTA                 | **TANTA**                 | TANTA 2 (I0 P2)                                          | OFFICIAL | Gloss once: TANTA (Taamim, Nekudot, Tagin, Otiot), P.      |
| תגין          | Tagin                | **Tagin**                 | Tagin 8 (I0 P8) · coroas 0 (I0 P0)                       | OFFICIAL | Gloss once: Tagin (coroas) — gloss PROPOSED.               |

### 2.3 Partzufim and their parts (30 rows)

| Hebrew           | English canon             | Português                 | Evidence (I / P)                                | Status   | Note                                                                                                                                |
| ---------------- | ------------------------- | ------------------------- | ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| עתיק             | Atik                      | **Atik**                  | Atik 55 (I8 P47) · Átik 0 (I0 P0)               | OFFICIAL |                                                                                                                                     |
| עתיק יומין       | Atik Yomin                | **Atik Yomin**            | Atik Yomin 8 (I8 P0)                            | OFFICIAL |                                                                                                                                     |
| פרצוף עתיק       | Partzuf Atik              | **Partzuf Atik**          | Partzuf Atik 14 (I0 P14)                        | OFFICIAL |                                                                                                                                     |
| אריך אנפין       | Arich Anpin               | **Arich Anpin**           | Arich Anpin 1 (I0 P1)                           | OFFICIAL | א"א → AA. The repo ToC agrees.                                                                                                      |
| זעיר אנפין       | Zeir Anpin                | **Zeir Anpin**            | Zeir Anpin 0 (I0 P0)                            | PROPOSED | Formed like Arich Anpin; the repo ToC already says Zeir Anpin.                                                                      |
| אבא              | Aba                       | **Aba**                   | Aba 6 (I0 P6) · Abba 0 (I0 P0)                  | OFFICIAL |                                                                                                                                     |
| אמא              | Ima                       | **Ima**                   | Ima 14 (I0 P14)                                 | OFFICIAL |                                                                                                                                     |
| אבא ואמא         | Aba ve Ima                | **Aba ve Ima**            | Aba ve Ima 2 (I0 P2) · Aba e Ima 0 (I0 P0)      | OFFICIAL | Only where the Hebrew spells it out; או"א → AVI.                                                                                    |
| או"א             | AVI                       | **AVI**                   | AVI 152 (I0 P152)                               | OFFICIAL |                                                                                                                                     |
| או"א עילאין      | the upper AVI             | **AVI Superior**          | AVI Superior 2 (I0 P2)                          | OFFICIAL |                                                                                                                                     |
| ישסו"ת           | YESHSUT                   | **YESHSUT**               | YESHSUT 35 (I0 P35) · Yeshsut 0 (I0 P0)         | OFFICIAL | All caps.                                                                                                                           |
| ישראל סבא ותבונה | Israel Saba and Tevuna    | **Israel Saba ve Tevuna** | Israel Saba ve Tevuna 0 (I0 P0)                 | PROPOSED | Silent in BB; joined with ve as Aba ve Ima. The pair is YESHSUT.                                                                    |
| תבונה            | Tevuna                    | **Tevuna**                | Tevuna 0 (I0 P0) · Tvuna 0 (I0 P0)              | PROPOSED | Vocal sheva as e, as Neshama, Guevura.                                                                                              |
| רחל              | Rachel                    | **Rachel**                | Rachel 0 (I0 P0)                                | PROPOSED | Medial ח → ch, as Achoraim, Chazeh.                                                                                                 |
| לאה              | Leah                      | **Lea**                   | Lea 0 (I0 P0)                                   | PROPOSED | Standard Portuguese form of the name.                                                                                               |
| חזה              | Chazeh                    | **Chazeh**                | Chazeh 68 (I0 P68) · peito 1 (I0 P1)            | OFFICIAL | Gloss Chazeh (peito). o Chazeh.                                                                                                     |
| מוחא סתימאה      | Mocha Stimaa              | **Mocha Stimaa**          | Mocha Stimaa 1 (I0 P1)                          | OFFICIAL | Mocha attested once (P, KHB TM "Mocha, Atzamot, Gidim, Bassar e Or"); Stimaa PROPOSED. Gloss once: Mocha Stimaa (o cérebro oculto). |
| דיקנא            | Dikna                     | **Dikna**                 | Dikna 0 (I0 P0) · barba 0 (I0 P0)               | PROPOSED | Gloss Dikna (barba).                                                                                                                |
| שבולת הזקן       | the Shibolet of the beard | **Shibolet HaZakan**      | Shibolet HaZakan 0 (I0 P0)                      | PROPOSED | Gloss once (a espiga da barba).                                                                                                     |
| שערות            | Se'arot [hair]            | **Searot**                | Searot 0 (I0 P0)                                | PROPOSED | Gloss Searot (cabelos).                                                                                                             |
| מזלא             | Mazla                     | **Mazla**                 | Mazla 0 (I0 P0)                                 | PROPOSED |                                                                                                                                     |
| מצח              | Metzach                   | **Metzach**               | Metzach 8 (I0 P8)                               | OFFICIAL | Gloss Metzach (testa).                                                                                                              |
| רגלים / רגלין    | Raglayim                  | **Raglaim / Raglin**      | Raglaim / Raglin 24 (I0 P24) · Raglim 1 (I0 P1) | OFFICIAL | Follow the Hebrew form: רגלים → Raglaim (6), רגלין → Raglin (18).                                                                   |
| סיום רגלין       | Sium Raglin               | **Sium Raglin**           | Sium Raglin 16 (I0 P16)                         | OFFICIAL | Gloss (fim das pernas).                                                                                                             |
| אצבעות רגלין     | toes                      | **Etzbaot Raglin**        | Etzbaot Raglin 2 (I0 P2)                        | OFFICIAL | Gloss (dedos dos pés).                                                                                                              |
| עטרת יסוד        | Atara of Yesod            | **Ateret Yessod**         | Ateret Yessod 1 (I0 P1)                         | OFFICIAL | Ateret attested (1, "Ateret Yesod"); Yessod spelled as the Sefira (13 : 1).                                                         |
| פרקין            | joints                    | **articulações**          | articulações 0 (I0 P0)                          | PROPOSED | Silent in BB.                                                                                                                       |
| ירכין            | legs                      | **Yerechin**              | Yerechin 0 (I0 P0)                              | PROPOSED | Hebrew form kept, gloss (coxas).                                                                                                    |
| כלים דפנים       | the anterior vessels      | **Kelim de Panim**        | Kelim de Panim 21 (I0 P21)                      | OFFICIAL | Gloss once: Kelim de Panim (Kelim anteriores).                                                                                      |
| כלים דאחורים     | the posterior vessels     | **Kelim de Achoraim**     | Kelim de Achoraim 24 (I0 P24)                   | OFFICIAL |                                                                                                                                     |

### 2.4 Worlds (7 rows)

| Hebrew           | English canon           | Português                | Evidence (I / P)                                                                    | Status   | Note                                     |
| ---------------- | ----------------------- | ------------------------ | ----------------------------------------------------------------------------------- | -------- | ---------------------------------------- |
| בי"ע             | BYA                     | **BYA**                  | BYA 73 (I0 P73)                                                                     | OFFICIAL |                                          |
| עולם הנקודים     | the world of Nekudim    | **o mundo de Nekudim**   | o mundo de Nekudim 30 (I0 P30)                                                      | OFFICIAL |                                          |
| עולם התיקון      | the world of correction | **o mundo do Tikun**     | o mundo do Tikun 6 (I0 P6) · mundo de Tikun 2 (I0 P2) · mundo da correção 0 (I0 P0) | OFFICIAL | Gloss once: o mundo do Tikun (correção). |
| העולמות העליונים | the upper worlds        | **os Mundos Superiores** | os Mundos Superiores 6 (I2 P4) · mundos superiores 0 (I0 P0)                        | OFFICIAL |                                          |
| העולם הזה        | this world              | **este mundo**           | este mundo 31 (I8 P23)                                                              | OFFICIAL |                                          |
| מ"ה החדש         | the new MA              | **o novo MA**            | o novo MA 25 (I0 P25)                                                               | OFFICIAL |                                          |
| עולם הבא         | the next world          | **o mundo vindouro**     | o mundo vindouro 24 (I24 P0)                                                        | OFFICIAL |                                          |

### 2.5 Lights, growth, illumination (16 rows)

| Hebrew     | English canon       | Português                 | Evidence (I / P)                                                              | Status   | Note                                                                                                                |
| ---------- | ------------------- | ------------------------- | ----------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| נפש        | Nefesh              | **Nefesh**                | Nefesh 25 (I0 P25) · Néfesh 0 (I0 P0)                                         | OFFICIAL | Light: a Luz de Nefesh (7).                                                                                         |
| רוח        | Ruach               | **Ruach**                 | Ruach 23 (I0 P23) · Ruaj 0 (I0 P0)                                            | OFFICIAL |                                                                                                                     |
| נשמה       | Neshama             | **Neshama**               | Neshama 60 (I0 P60)                                                           | OFFICIAL | Gloss Neshama (alma). Plural Neshamot.                                                                              |
| חיה        | Haya                | **Haya**                  | Haya 44 (I0 P44) · Chaya 0 (I0 P0)                                            | OFFICIAL | a Luz de Haya (10) : Ohr Haya (4) — for the NRNHY lights write "a Luz de X".                                        |
| יחידה      | Yechida             | **Yehida**                | Yehida 44 (I0 P44) · Yechida 1 (I0 P1)                                        | OFFICIAL | 44 : 1.                                                                                                             |
| אור החכמה  | Ohr Hochma          | **Ohr Hochma**            | Ohr Hochma 16 (I0 P16) · Luz de Hochma 3 (I0 P3)                              | OFFICIAL | Gloss once: Ohr Hochma (Luz de Sabedoria).                                                                          |
| אור החסדים | Ohr Hassadim        | **Ohr Hassadim**          | Ohr Hassadim 15 (I0 P15) · Luz de Hassadim 3 (I0 P3)                          | OFFICIAL | Gloss once: Ohr Hassadim (Luz de Misericórdia).                                                                     |
| עיבור      | Ibur [impregnation] | **Ibur**                  | Ibur 14 (I0 P14)                                                              | OFFICIAL | Gloss (concepção). עיבור ב' → Ibur Bet (2).                                                                         |
| יניקה      | nursing             | **Yenika**                | Yenika 9 (I0 P9) · Yeniká 0 (I0 P0) · amamentação 1 (I0 P1)                   | OFFICIAL | Gloss once: Yenika (amamentação). The repo ToC writes "Yeniká" — §4.                                                |
| עובר       | Ubar                | **Ubar**                  | Ubar 2 (I0 P2)                                                                | OFFICIAL | Gloss Ubar (embrião).                                                                                               |
| עי"מ       | IYM                 | **Ibur, Yenika e Mochin** | Ibur, Yenika e Mochin 14 (I0 P14)                                             | OFFICIAL | Expand. Components attested; the triple itself PROPOSED.                                                            |
| הארה       | illumination        | **iluminação**            | iluminação 41 (I4 P37)                                                        | OFFICIAL |                                                                                                                     |
| התכללות    | inclusion           | **Hitkalelut**            | Hitkalelut 3 (I0 P3) · integração 3 (I0 P3) · inclusão 2 (I0 P2)              | OFFICIAL | Technical Hitkalelut (3) "Hitkalelut de Behina Alef dentro de Behina Bet". Verb integrar-se / incluir-se.           |
| בקיעה      | breaching           | **fenda**                 | fenda 0 (I0 P0) · ruptura 0 (I0 P0) · fendas (Intro, non-technical) 1 (I1 P0) | PROPOSED | Silent in BB (the Intro's one "fendas" is non-technical). "abrir uma fenda" na Parsa. Never quebra (that is שבירה). |
| שפע        | abundance           | **abundância**            | abundância 24 (I4 P20)                                                        | OFFICIAL |                                                                                                                     |
| ניצוצין    | sparks              | **centelhas**             | centelhas 2 (I0 P2) · faíscas 0 (I0 P0)                                       | OFFICIAL | The repo ToC agrees ("centelhas").                                                                                  |

### 2.6 Restrictions, positions, gender, MAN (27 rows)

| Hebrew      | English canon                      | Português                           | Evidence (I / P)                                                                                     | Status   | Note                                                                                                                                                            |
| ----------- | ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| צמצום א'    | the first restriction              | **Tzimtzum Alef**                   | Tzimtzum Alef 14 (I0 P14) · primeira restrição 6 (I0 P6)                                             | OFFICIAL | Gloss once: Tzimtzum Alef (Primeira Restrição).                                                                                                                 |
| צמצום ב'    | the second restriction             | **Tzimtzum Bet**                    | Tzimtzum Bet 30 (I0 P30) · segunda restrição 3 (I0 P3)                                               | OFFICIAL |                                                                                                                                                                 |
| צמצום נה"י  | the restriction of NHY             | **Tzimtzum NHY**                    | Tzimtzum NHY 2 (I0 P2)                                                                               | OFFICIAL |                                                                                                                                                                 |
| פנים        | anterior / face                    | **Panim**                           | Panim 34 (I2 P32) · face 148 (I117 P31)                                                              | OFFICIAL | Gloss once: Panim (Kelim anteriores). The face of the Creator (Intro sense) → face.                                                                             |
| אחור        | posterior                          | **Achor**                           | Achor 9 (I0 P9) · costas 11 (I1 P10)                                                                 | OFFICIAL | Gloss Achor (costas).                                                                                                                                           |
| פב"פ        | face to face                       | **face a face**                     | face a face 14 (I0 P14) · Panim be Panim 1 (I0 P1)                                                   | OFFICIAL | 14 : 1 (the 1 is a gloss). Translated, unlike Panim / Achoraim.                                                                                                 |
| אב"א        | back to back                       | **costas com costas**               | costas com costas 2 (I0 P2) · achor be achor 2 (I0 P2)                                               | OFFICIAL |                                                                                                                                                                 |
| פב"א        | face to back                       | **face com costas**                 | face com costas 0 (I0 P0)                                                                            | PROPOSED | Formed like costas com costas.                                                                                                                                  |
| אב"פ        | back to face                       | **costas com face**                 | costas com face 0 (I0 P0)                                                                            | PROPOSED | Mirror.                                                                                                                                                         |
| זכר         | male                               | **masculino**                       | masculino 30 (I0 P30)                                                                                | OFFICIAL | Noun: o masculino.                                                                                                                                              |
| נקבה        | female                             | **feminino**                        | feminino 27 (I0 P27)                                                                                 | OFFICIAL |                                                                                                                                                                 |
| מ"ן         | MAN                                | **MAN**                             | MAN 58 (I0 P58) · MaN 0 (I0 P0)                                                                      | OFFICIAL | Gloss once: MAN (Mayin Nukvin).                                                                                                                                 |
| מיין נוקבין | Mayin Nukvin                       | **Mayin Nukvin**                    | Mayin Nukvin 2 (I0 P2)                                                                               | OFFICIAL | BB glosses "águas femininas".                                                                                                                                   |
| מ"ד         | MAD                                | **MAD**                             | MAD 0 (I0 P0)                                                                                        | PROPOSED | Formed like MAN.                                                                                                                                                |
| מיין דוכרין | Mayin Duchrin                      | **Mayin Duchrin**                   | Mayin Duchrin 0 (I0 P0)                                                                              | PROPOSED | Formed like Mayin Nukvin; כ → ch.                                                                                                                               |
| דבקות       | adhesion                           | **Dvekut**                          | Dvekut 4 (I0 P4) · adesão 5 (I2 P3)                                                                  | OFFICIAL | 4 : 5 where 2 adesão are glosses of Dvekut. Gloss Dvekut (adesão).                                                                                              |
| קדושה       | holiness                           | **Kedusha**                         | Kedusha 22 (I12 P10) · santidade 10 (I7 P3)                                                          | OFFICIAL | Gloss Kedusha (santidade).                                                                                                                                      |
| קליפה       | shell                              | **a Klipa**                         | a Klipa 7 (I7 P0) · casca 1 (I1 P0)                                                                  | OFFICIAL |                                                                                                                                                                 |
| גמר התיקון  | the end of correction              | **o final da correção**             | o final da correção 4 (I0 P4) · fim da correção 3 (I0 P3)                                            | OFFICIAL | 4 : 3.                                                                                                                                                          |
| מדת הדין    | the quality of judgment            | **a qualidade de Din**              | a qualidade de Din 4 (I0 P4) · Midat haDin 4 (I0 P4) · qualidade d* julgamento 2 (I0 P2)             | OFFICIAL | Tie with Midat haDin (4 : 4), which BB uses with a gloss. Write a qualidade de Din.                                                                             |
| מדת הרחמים  | the quality of mercy               | **a qualidade de Rachamim**         | a qualidade de Rachamim 2 (I0 P2) · qualidade da misericórdia 2 (I0 P2) · Midat haRachamim 2 (I0 P2) | OFFICIAL | 2 : 2 : 2. Ruled parallel to a qualidade de Din.                                                                                                                |
| רחמים       | Rachamim / mercy                   | **misericórdia**                    | misericórdia 16 (I9 P7) · Rachamim 4 (I0 P4)                                                         | OFFICIAL | Generic mercy → misericórdia; inside מדת הרחמים → Rachamim.                                                                                                     |
| דין, דינים  | judgment(s)                        | **Din, Dinim**                      | Din, Dinim 10 (I0 P10) · julgamento 8 (I3 P5)                                                        | OFFICIAL | Gloss Din (julgamento).                                                                                                                                         |
| גבורות      | Gevurot                            | **Guevurot**                        | Guevurot 0 (I0 P0) · Gevurot 2 (I0 P2)                                                               | PROPOSED | BB writes Gevurot (2) but Guevura (6). Ruled Guevurot so singular and plural match.                                                                             |
| ה"ח וה"ג    | the five Hassadim and five Gevurot | **cinco Hassadim e cinco Guevurot** | cinco Hassadim e cinco Guevurot 2 (I0 P2)                                                            | OFFICIAL | See Guevurot.                                                                                                                                                   |
| מלכים       | kings                              | **Melachim**                        | Melachim 1 (I0 P1) · Reis 1 (I0 P1)                                                                  | OFFICIAL | Technical kings of Nekudim: Melech (22), Melachim (1); gloss Melech (Rei). מלך הדעת → Melech ha Daat. Parables keep rei. The repo ToC says "Os sete reis" — §4. |
| השפעה       | bestowal                           | **doação**                          | doação 16 (I0 P16)                                                                                   | OFFICIAL |                                                                                                                                                                 |

### 2.7 Section names of TES (8 rows)

| Hebrew                            | English canon                               | Português                                          | Evidence (I / P)                                         | Status   | Note                                                                                                                     |
| --------------------------------- | ------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| אור פנימי / או"פ (the commentary) | Inner Light                                 | **Luz Interior**                                   | Luz Interior 0 (I0 P0)                                   | PROPOSED | BB Portuguese never names the commentary. Adopts the shipped UI ("Luz Interior"). Distinct from the technical Ohr Pnimi. |
| הסתכלות פנימית (the commentary)   | Inner Observation                           | **Observação Interior**                            | Observação Interior 0 (I0 P0)                            | PROPOSED | As the UI.                                                                                                               |
| לוח השאלות                        | Table of Questions                          | **a tabela de perguntas**                          | a tabela de perguntas 1 (I1 P0)                          | OFFICIAL | Intro §156.                                                                                                              |
| לוח התשובות                       | Table of Answers                            | **a tabela de respostas**                          | a tabela de respostas 1 (I1 P0)                          | OFFICIAL | Intro §156.                                                                                                              |
| לפירוש המלות                      | (on) the meaning of the words — terminology | **sobre o significado das palavras**               | sobre o significado das palavras 0 (I0 P0)               | PROPOSED | The UI cluster label says "Terminologia".                                                                                |
| לענינים                           | (on) the topics                             | **sobre os temas**                                 | sobre os temas 0 (I0 P0)                                 | PROPOSED | As the repo ToC ("Respostas sobre os temas").                                                                            |
| תלמוד עשר הספירות                 | Talmud Eser Sefirot                         | **Talmud Eser Sefirot (O Estudo das Dez Sefirot)** | Talmud Eser Sefirot (O Estudo das Dez Sefirot) 1 (I1 P0) | OFFICIAL | Intro §156.                                                                                                              |
| פנים (the Ari's text)             | Panim                                       | **o texto do Ari**                                 | o texto do Ari 0 (I0 P0)                                 | PROPOSED | As the UI pane name.                                                                                                     |

### 2.8 Names, books, honorifics (21 rows)

| Hebrew                     | English canon            | Português                     | Evidence (I / P)                                         | Status   | Note                                                                    |
| -------------------------- | ------------------------ | ----------------------------- | -------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| האר"י ז"ל                  | the ARI                  | **o Ari**                     | o Ari 4 (I4 P0) · ARI 0 (I0 P0)                          | OFFICIAL | ז"ל dropped.                                                            |
| בעל הסולם                  | Baal HaSulam             | **Baal HaSulam**              | Baal HaSulam 0 (I0 P0)                                   | PROPOSED | Not named in these texts; the UI uses it.                               |
| רבי / ר'                   | Rabbi                    | **Rabino**                    | Rabino 43 (I41 P2) · Rabi 2 (I2 P0)                      | OFFICIAL | 43 : 2.                                                                 |
| רשב"י                      | Rabbi Shimon Bar Yochai  | **Rabino Shimon Bar Yochai**  | Rabino Shimon Bar Yochai 12 (I12 P0)                     | OFFICIAL | Rabino Shimon attested (12); Bar Yochai PROPOSED.                       |
| הרח"ו                      | Rav Chaim Vital          | **Rabino Chaim Vital**        | Rabino Chaim Vital 4 (I4 P0)                             | OFFICIAL |                                                                         |
| עץ חיים / ע"ח              | Etz Chaim                | **A Árvore da Vida**          | A Árvore da Vida 7 (I7 P0) · Etz Chaim 0 (I0 P0)         | OFFICIAL | Title, italic-free. Gate N → Portão N (§2.9).                           |
| הזהר                       | The Zohar                | **o Zohar**                   | o Zohar 15 (I14 P1) · Zóhar 0 (I0 P0)                    | OFFICIAL | "o Livro do Zohar" (2), "do Zohar".                                     |
| התיקונים / תיקוני זהר      | the Tikkunim             | **os Tikkunim do Zohar**      | os Tikkunim do Zohar 4 (I4 P0) · Tikunim 0 (I0 P0)       | OFFICIAL |                                                                         |
| תיקון N (תקוני זהר)        | Tikkun N                 | **Tikun N**                   | Tikun N 1 (I1 P0)                                        | OFFICIAL | "(Tikun 30)", Intro.                                                    |
| מבוא שערים                 | Mevo She'arim            | **Mevo Shearim**              | Mevo Shearim 0 (I0 P0)                                   | PROPOSED | Formed like Shaar HaHakdamot.                                           |
| שער הכוונות                | Sha'ar HaKavanot         | **Shaar HaKavanot**           | Shaar HaKavanot 0 (I0 P0)                                | PROPOSED | Formed like Shaar HaHakdamot.                                           |
| שער ההקדמות                | Sha'ar HaHakdamot        | **Shaar HaHakdamot**          | Shaar HaHakdamot 1 (I1 P0)                               | OFFICIAL | BB glosses (Portão das Introduções).                                    |
| אדרא זוטא                  | Idra Zuta                | **Idra Zuta**                 | Idra Zuta 0 (I0 P0)                                      | PROPOSED |                                                                         |
| אד"ר                       | the Idra Rabba           | **a Idra Raba**               | a Idra Raba 0 (I0 P0)                                    | PROPOSED | Formed like Bereshit Raba (BB).                                         |
| ספר יצירה                  | Sefer Yetzira            | **o Sefer Yetzira**           | o Sefer Yetzira 1 (I1 P0) · Livro da Criação 2 (I1 P1)   | OFFICIAL | Gloss once (Livro da Criação).                                          |
| אדם הראשון / אה"ר          | Adam HaRishon            | **Adam HaRishon**             | Adam HaRishon 8 (I1 P7) · Adão 6 (I0 P6)                 | OFFICIAL | 8 : 6 (Adão in the Pticha's narrative passages).                        |
| הקב"ה / השי"ת              | the Creator              | **o Criador**                 | o Criador 134 (I128 P6)                                  | OFFICIAL |                                                                         |
| חז"ל                       | our sages                | **nossos sábios**             | nossos sábios 41 (I39 P2)                                | OFFICIAL |                                                                         |
| שכינה                      | the Shechina             | **a Shechinah**               | a Shechinah 3 (I3 P0)                                    | OFFICIAL | Gloss once: a Santa Divindade (Shechinah).                              |
| משנה / גמרא / תלמוד        | Mishna / Gemara / Talmud | **Mishna / Gemara / Talmude** | Mishna / Gemara / Talmude 27 (I27 P0) · Talmud 1 (I1 P0) | OFFICIAL | Talmude (6) for the work; Talmud only in the title Talmud Eser Sefirot. |
| ז"ל, זצ"ל, זיע"א, ית', ב"ה | honorifics               | **(dropped)**                 | (dropped) 0 (I0 P0)                                      | OFFICIAL | Same rule as the English run; BB drops them.                            |

### 2.9 Citation formulae (17 rows)

| Hebrew            | English canon                      | Português                               | Evidence (I / P)                                         | Status   | Note                                                                                                                         |
| ----------------- | ---------------------------------- | --------------------------------------- | -------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ד"ה               | the passage beginning              | **o trecho que começa com “…”**         | o trecho que começa com “…” 0 (I0 P0)                    | PROPOSED | BB never renders ד"ה (Intro, 72 in Hebrew: all dropped). Catchword in “…”.                                                   |
| עש"ה              | study it there well                | **estude bem ali**                      | estude bem ali 0 (I0 P0)                                 | PROPOSED | BB drops it (41 in Hebrew). Imperative você-form, as BB's "Saiba" (15), "Lembre" (5).                                        |
| ע"ש               | See there                          | **veja ali**                            | veja ali 0 (I0 P0)                                       | PROPOSED | BB drops it. Two senses: ע"ש = על שם → "recebe o nome de".                                                                   |
| עכ"ל              | End of quote                       | **Fim da citação.**                     | Fim da citação. 0 (I0 P0)                                | PROPOSED | BB drops it (Intro 6×).                                                                                                      |
| וז"ל              | and these are his words            | **e estas são suas palavras:**          | e estas são suas palavras: 0 (I0 P0)                     | PROPOSED | BB drops it (Intro 4×).                                                                                                      |
| אכמ"ל             | this is not the place to elaborate | **aqui não é o lugar para se estender** | aqui não é o lugar para se estender 0 (I0 P0)            | PROPOSED | Not in I/P.                                                                                                                  |
| דף N              | page N                             | **p. N**                                | p. N 10 (I10 P0) · página N 0 (I0 P0)                    | OFFICIAL | BB: "p 31b", "p. 3" (10; 8 without the dot). Write p. with the dot. Gematria → Arabic numerals, thousand rule as in English. |
| אות N             | item N                             | **item N**                              | item N 90 (I0 P90) · Item N 26 (I4 P22)                  | OFFICIAL | Lower-case (90 : 26). Plural itens (5 : 2): "itens 89-94". אות = letter → a letra.                                           |
| תשובה N           | answer N                           | **resposta N**                          | resposta N 0 (I0 P0)                                     | PROPOSED | Lower-case like item. The numeral keeps out תשובה = repentance (arrependimento).                                             |
| שאלה N            | question N                         | **pergunta N**                          | pergunta N 0 (I0 P0)                                     | PROPOSED | As resposta.                                                                                                                 |
| חלק N             | Part N                             | **Parte N**                             | Parte N 0 (I0 P0)                                        | PROPOSED | Capitalized like the UI ("Parte 1, Capítulo 1").                                                                             |
| פרק N             | chapter N                          | **Capítulo N**                          | Capítulo N 2 (I2 P0) · capítulo 1 (I1 P0)                | OFFICIAL | Capítulo 2 : capítulo 1. Also פ"ו → Capítulo 6.                                                                              |
| שער N (Etz Chaim) | Gate N                             | **Portão N**                            | Portão N 1 (I1 P0)                                       | OFFICIAL | "(Portão 48, Capítulo Três)", Intro. Write the numeral.                                                                      |
| כנ"ל / הנ"ל       | as mentioned above                 | **mencionado acima**                    | mencionado acima 10 (I2 P8) · acima mencionado 1 (I0 P1) | OFFICIAL | Agree in gender/number. BB often turns "כנ"ל באות X" into "(item X)".                                                        |
| עי' / עיין        | see                                | **veja**                                | veja 7 (I7 P0)                                           | OFFICIAL |                                                                                                                              |
| וכו'              | etc.                               | **etc.**                                | etc. 16 (I6 P10)                                         | OFFICIAL |                                                                                                                              |
| inline (ב)        | (2)                                | **(2)**                                 | (2) 0 (I0 P0)                                            | PROPOSED | Keep them, gematria → Arabic numerals, exactly as the English run.                                                           |

### 2.10 Letters, vowel points, numerology (19 rows)

| Hebrew                                 | English canon              | Português                                                                    | Evidence (I / P)                                                                   | Status   | Note                                                          |
| -------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| י' / יו"ד                              | Yod                        | **Yod**                                                                      | Yod 11 (I1 P10)                                                                    | OFFICIAL |                                                               |
| ה' (letter)                            | Hey                        | **Hey**                                                                      | Hey 36 (I0 P36) · Heh 2 (I0 P2)                                                    | OFFICIAL | 36 : 2.                                                       |
| ו' / וי"ו                              | Vav                        | **Vav**                                                                      | Vav 9 (I0 P9)                                                                      | OFFICIAL |                                                               |
| א' / אל"ף                              | Aleph                      | **Alef**                                                                     | Alef 60 (I0 P60) · Aleph 0 (I0 P0)                                                 | OFFICIAL |                                                               |
| ב'                                     | Bet                        | **Bet**                                                                      | Bet 78 (I0 P78)                                                                    | OFFICIAL |                                                               |
| ג'                                     | Gimel                      | **Guimel**                                                                   | Guimel 49 (I0 P49) · Gimel 0 (I0 P0)                                               | OFFICIAL |                                                               |
| ד'                                     | Dalet                      | **Dalet**                                                                    | Dalet 122 (I0 P122)                                                                | OFFICIAL |                                                               |
| ז'                                     | Zayin                      | **Zayin**                                                                    | Zayin 0 (I0 P0)                                                                    | PROPOSED |                                                               |
| ע' / עין                               | Ayin                       | **Ayin**                                                                     | Ayin 0 (I0 P0)                                                                     | PROPOSED | The Eye (עין) → olho; Eynaim.                                 |
| ח' ט' כ' ל' מ' נ' ס' פ' צ' ק' ר' ש' ת' | Het … Tav                  | **Het, Tet, Kaf, Lamed, Mem, Nun, Samech, Peh, Tzadi, Kuf, Resh, Shin, Tav** | Het, Tet, Kaf, Lamed, Mem, Nun, Samech, Peh, Tzadi, Kuf, Resh, Shin, Tav 0 (I0 P0) | PROPOSED | BB's letter scheme (Alef, Bet, Guimel, Dalet, Hey, Vav, Yod). |
| חולם                                   | Holam                      | **Holam**                                                                    | Holam 9 (I0 P9)                                                                    | OFFICIAL |                                                               |
| שורק / מלאפום                          | Shuruk / Melafum           | **Shuruk / Melafom**                                                         | Shuruk / Melafom 14 (I0 P14)                                                       | OFFICIAL |                                                               |
| חירק                                   | Hirik                      | **Hirik**                                                                    | Hirik 8 (I0 P8)                                                                    | OFFICIAL |                                                               |
| קמץ, פתח                               | Kamatz, Patach             | **Kamatz, Patach**                                                           | Kamatz, Patach 0 (I0 P0)                                                           | PROPOSED |                                                               |
| צירי, סגול, שבא, קבוץ                  | Tzere, Segol, Shva, Kubutz | **Tzere, Segol, Shva, Kubutz**                                               | Tzere, Segol, Shva, Kubutz 0 (I0 P0)                                               | PROPOSED |                                                               |
| ניקוד                                  | Nikud                      | **Nikud**                                                                    | Nikud 0 (I0 P0)                                                                    | PROPOSED |                                                               |
| גימטריא                                | Gematria                   | **Gematria**                                                                 | Gematria 3 (I2 P1)                                                                 | OFFICIAL |                                                               |
| עם הכולל / ע"ה                         | with the kollel            | **com o Kolel**                                                              | com o Kolel 0 (I0 P0)                                                              | PROPOSED |                                                               |
| אהי"ה                                  | EKYE                       | **EKYE**                                                                     | EKYE 0 (I0 P0)                                                                     | PROPOSED | English-style acronym, as BB writes KHB, HGT.                 |

## 3. Traps

### 3.1 Calls that do NOT carry over from the English run or the Spanish table

| Hebrew                                 | English run                              | Spanish table                                  | Portuguese (BB)                                  | count                                                                      |
| -------------------------------------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| `מסך`, `עביות`, `זווג`, `רשימו`        | screen, coarseness, coupling, record     | pantalla, grosor, acoplamiento, registro       | **Massach, Aviut, Zivug, Reshimo**               | 240 : tela 1 · 181 : espessura 2 · 102 : acoplamento 15 · 69 : registros 1 |
| `כלי` / `כלים`                         | vessel(s)                                | vasija(s)                                      | **Kli / Kelim**                                  | 110 : vaso 15 · 181 : vasos 33 (fixed phrases only)                        |
| `ביטוש`, `התלבשות`, `הזדככות`, `צמצום` | clash, clothing, refinement, restriction | golpeteo, revestidura, refinación, restricción | **Bitush, Hitlabshut, Hizdakchut, Tzimtzum**     | 30, 34, 28 : 12, 66 : 10                                                   |
| `או"ח`, `או"מ`, `או"פ`                 | reflected, surrounding, inner light      | Luz Retornante / Circundante / Interna         | **Ohr Hozer, Ohr Makif, Ohr Pnimi**              | 45 : 1 · 48 : 1 · 25 : 1                                                   |
| `בחי"ד`                                | phase four                               | la cuarta fase                                 | **Behina Dalet** (Hebrew ordinal after the noun) | 119 : quarta 0                                                             |
| generic `בחינת X`                      | the discernment of X                     | la fase de X                                   | **o discernimento de X**                         | discernimento 94 : fase 2 (glosses)                                        |
| `קטנות` / `גדלות`                      | Katnut / Gadlut                          | pequeñez / grandeza                            | **Katnut / Gadlut**                              | 23 : 2 · 37 : 1                                                            |
| `פב"פ` / `אב"א`                        | face to face / back to back              | Panim be Panim / Ajor be Ajor                  | **face a face / costas com costas**              | 14 : 1 · 2 : 2 (gloss)                                                     |
| acronyms                               | AHP, HGT, ZON                            | AJaP, JaGaT, ZoN                               | **AHP, HGT, ZON**                                | all-caps, 0 mixed case                                                     |
| `אות N`                                | item N                                   | Ítem N                                         | **item N** (lower-case)                          | 90 : 26                                                                    |
| `דף N`                                 | page N                                   | Página N                                       | **p. N**                                         | 10 : página 0                                                              |
| `סבה ומסובב`                           | cause and consequence                    | causa y efecto                                 | **causa e consequência**                         | 4 : 0                                                                      |
| `הסתלקות`                              | departure                                | partida                                        | **saída**                                        | P §17                                                                      |
| `השתלשלות`                             | cascading                                | descenso gradual                               | **cascateamento** (verb cascatear)               | 6                                                                          |

### 3.2 Sense splits and false friends

- **Ohr Pnimi vs Luz Interior.** **Ohr Pnimi** is the technical inner light
  (25). **Luz Interior** is the commentary (§2.7; it is the UI's name, since
  BB is silent). `או"פ` can be either, so read the sentence: "na Luz Interior
  (item 5)" is a citation; "Ohr Pnimi e Ohr Makif" is the concept.
- **Behina vs discernimento.** **Behina** is a named phase (Behina Dalet, Behina
  Shoresh) or the noun after a Hebrew ordinal. **discernimento** is the generic
  "aspect / discernment of". BB's "os quatro discernimentos" (P §§4-6) are the
  four phases taken together; each one named is still Behina X.
- **Kli vs vaso.** Write **Kli / Kelim** everywhere except two fixed phrases:
  **vaso(s) de recepção** (25) and **a quebra dos vasos** (BB never says
  "quebra dos Kelim").
- **quebra vs fenda.** quebra = `שבירה` (20). `בקיעה` (breach of the Parsa) →
  fenda (PROPOSED). Never ruptura.
- **saída vs surgimento.** saída = `הסתלקות` (the Light leaving). `יציאה` (a
  level emerging) → emergir / surgimento, not saída.
- **grau vs nível vs degrau.** grau = `מדרגה` (127). nível = `קומה` (295).
  degrau is the Intro's ladder image: never use it for מדרגה.
- **expansão vs Hitpashtut.** These tie 12 : 12. I ruled **expansão**: BB
  glosses Hitpashtut (expansão), and the repo ToC says "segunda expansão".
- **golpe vs Hakaa.** Hakaa occurs only inside "Zivug de Hakaa". The striking
  on its own is **golpe** (6).
- **raiz vs Shoresh.** raiz is the generic root (36). **Shoresh** appears only
  in Behina Shoresh and Aviut Shoresh.
- **Rachamim vs misericórdia.** Write misericórdia for generic mercy and
  Rachamim inside מדת הרחמים (a qualidade de Rachamim, parallel to a
  qualidade de Din).
- **Melech vs rei.** In the TES technical sense (the kings of Nekudim), write
  **Melech / Melachim** (22 / 1), glossed Melech (Rei); מלך הדעת → **Melech ha
  Daat**. In parables (the Intro's king and servant) write rei.
- **Adam HaRishon vs Adão.** Adam HaRishon (8) for אדם הראשון. Adão (6) is the
  Pticha's narrative shorthand: don't use it for the term.
- **Hochma vs Sabedoria.** **Sabedoria** only in _a sabedoria da Cabalá_ and in
  the gloss Ohr Hochma (Luz de Sabedoria). The Sefira is always Hochma.
- **הרב is the Ari** → **o Ari** (BB 4). Never "o Rav" or "o Mestre".
  BB's "Mestre" (7) is the Intro's "Teacher" (מוריך, the Creator hidden in the Torah).
- **Peh is two words.** Peh (boca) is the part of a Partzuf; Peh is also the
  letter פ. Ayin is both the Eye and the letter (PROPOSED for the letter).
- **Two-sense abbreviations** — read the clause:
  - `ע"ש` → "veja ali", or (as `על שם`) "recebe o nome de".
  - `ה"ר` → a primeira Hey, or (as `ה' ראשונות`) as cinco primeiras.
  - `ה"ס` → é o segredo de, or (as `ה' ספירות`) cinco Sefirot.
  - `ז"א` → ZA, or (as `זאת אומרת`) isto é.
  - `א"א` → AA, or (as `אי אפשר`) é impossível.
  - `אות` → item, or a letra.
  - `תשובה` → resposta N, or arrependimento.

### 3.3 Where BB's Portuguese is inconsistent, and what I ruled

| point                                  | BB forms (count)                      | ruled                                                                                 |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Hesed / Chessed                        | 6 / 2                                 | **Hesed**                                                                             |
| Guevura / Gevura · Gevurot / Guevurot  | 6 / 1 · 2 / 0                         | **Guevura, Guevurot**. The plural overrides 2 : 0 for one spelling per family, see §5 |
| Yessod / Yesod                         | 13 / 1                                | **Yessod** (also in Ateret Yessod)                                                    |
| Assia / Assiya                         | 54 / 1                                | **Assia**                                                                             |
| Yehida / Yechida                       | 44 / 1                                | **Yehida**                                                                            |
| Eynaim / Eyanim                        | 53 / 7                                | **Eynaim**                                                                            |
| Nikvey / Nikvei                        | 45 / 1                                | **Nikvey**                                                                            |
| Ohr Hozer / Ohr Chozer                 | 45 / 3                                | **Ohr Hozer**                                                                         |
| Ohr Yashar / Luz Direta                | 2 / 3 (one is a gloss, one a heading) | **Ohr Yashar**, to match the other named lights                                       |
| Luz de Haya / Ohr Haya                 | 10 / 4                                | **a Luz de Haya** (all NRNHY lights)                                                  |
| Taamim / Taamin                        | 30 / 2                                | **Taamim**                                                                            |
| item / Item                            | 90 / 26                               | **item**                                                                              |
| p. / p                                 | 2 / 8                                 | **p.** with the dot (Portuguese abbreviation)                                         |
| quatro discernimentos / quatro Behinot | P 7 / 4                               | **os quatro discernimentos**                                                          |
| Hitpashtut / expansão                  | 12 / 12                               | **expansão**                                                                          |
| Tikun / correção                       | 9 / 24                                | **correção**; **o mundo do Tikun** (8 : 0) for the world                              |
| final / fim da correção                | 4 / 3                                 | **o final da correção**                                                               |
| qualidade de Din / Midat haDin         | 4 / 4                                 | **a qualidade de Din**                                                                |
| Dvekut / adesão                        | 4 / 5 (2 of them glossing Dvekut)     | **Dvekut**                                                                            |
| Hitkalelut / integração / inclusão     | 3 / 3 / 2                             | **Hitkalelut** for the technical inclusion (the integração verbs are free)            |
| Rabino / Rabi                          | 43 / 2                                | **Rabino**                                                                            |
| sabedoria / Sabedoria da Cabalá        | 12 / 10                               | **a sabedoria da Cabalá** (the capitals are the titles)                               |
| Kli + vaso                             | 110 / 15                              | **Kli** (with the two fixed phrases in §3.2)                                          |

### 3.4 Never write (the `banned` list in `terms-pt.json`)

Every banned pattern occurs **0** times in I + P, and `gen.py` refuses to
build if one gains a hit. Each is paired with a counted majority form:

- **Spanish-style spellings:** Kéter, Jojmá, Biná, Jésed, Tiféret, Nétzaj,
  Maljut, Sefirá, Jasadim, Mojin, Ajoraim, Toj, Jazé, Parsá, Átik, Beriá,
  Yetzirá, Asiá, Assiyá, Dáat, Néfesh, Rúaj, Neshamá, Jayá, Yejidá.
- **Spanish mixed-case acronyms:** AJaP, JaGaT, NeHY, KaJaB, ZoN, GaR, ZaT,
  VaK, MaN.
- **Spanish words:** vasija, pantalla, grosor, acoplamiento.
- **Other spellings:** Chochma, Hochmah, Binah, Chesed, Hessed, Tifferet,
  Netzah, Masach, Sefirah, sefirot (lower-case), Hasadim, Mochim, Einaim,
  Einayim, Kelipot, Cabala, Pe, Abba, BAN, Yeshsut, Partzufin, Behinah,
  Gimel, Aleph, Rabbi, Rabí, Reshimos.
- **Translations BB never uses:** vontade de receber / doar, desejo de
  outorgar, igualdade de forma, Luz Retornante, Luz Envolvente.

These are not banned, because BB has a handful of real uses, but **don't write
them**:

- **Minority spellings:** Chessed, Gevura, Gevurot, Yesod, Assiya, Yechida,
  Eyanim, Nikvei, Ohr Chozer, Taamin.
- **Gloss-only translations used as prose:** vaso, tela, espessura,
  acoplamento, restrição, purificação, Luz Refletida, Luz Direta, Luz
  Circundante, Luz Interna, fase.
- **Minority translations:** pequenez, grandeza.
- **Panim be Panim / achor be achor:** BB uses them only as glosses.

## 4. Mismatches with the repo (flagged, not changed — the repo is read-only for this task)

The repo already has Portuguese strings that differ from BB's counted usage.
An orchestrator should decide whether to align them, in a separate change.

| where                                                                     | repo says                          | BB says                                                                                                                                                        |
| ------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i18n/locales/pt.json` lines 4, 27, 193                                   | Cabala (no accent)                 | **Cabalá** (36 : 0)                                                                                                                                            |
| `content/toc.volumes.json`, part-01 title                                 | Restrição e linha                  | **Tzimtzum** (66 : restrição 10). linha agrees                                                                                                                 |
| same file, part-03 title                                                  | Luz direta e luz refletida         | **Ohr Yashar e Ohr Hozer** (Luz Refletida 1 and Luz Direta 3 are glosses). Keeping the plain-language title is defensible; capitalize Luz either way (340 : 9) |
| same file, part-09 title                                                  | Os acoplamentos das Sefirot        | **Os Zivugim das Sefirot** (Zivug 102 : acoplamento 15)                                                                                                        |
| same file, part-16 title                                                  | Beriá, Yetzirá e Assiyá            | **Beria, Yetzira e Assia** (58 / 64 / 54 : 0 accented)                                                                                                         |
| same file, part-12 title                                                  | Nascimento e Yeniká                | **Yenika** (9 : 0)                                                                                                                                             |
| same file, part-11 title                                                  | …no embrião…                       | **Ubar (embrião)**. BB keeps Ubar; this is minor                                                                                                               |
| same file, part-07 title                                                  | Os sete reis que morreram          | BB's technical kings are **Melech / Melachim**. "reis" is acceptable in a title, but the text uses Melachim                                                    |
| same file, part-06 last chapter title; `pt.json` cluster labels (3 lines) | Causa e efeito                     | BB says **causa e consequência** (4 : 0)                                                                                                                       |
| `i18n/locales/pt.json` (pane names)                                       | Luz Interior / Observação Interior | BB is silent. I adopted the UI forms (PROPOSED), so there is no conflict                                                                                       |

The UI's "o texto do Ari" and "Ari" **agree** with BB (Ari 4).

## 5. Decisions I am least sure of

1. **Ohr Yashar over Luz Direta** (2 : 3). The evidence is a near tie, and
   all of it is a gloss or a heading. I ruled for family consistency with the
   other named lights (Ohr Hozer 45, Ohr Makif 48).
2. **expansão over Hitpashtut** (12 : 12). This is an exact tie, broken by the
   repo ToC and BB's own gloss.
3. **Generic בחינה → discernimento, named phases → Behina X.** This is a sense
   split, not one form. Translators must judge, and the gate cannot check it.
4. **"os quatro discernimentos"** (P 7 : 4) for ד' בחינות, against the
   Behina family it names.
5. **Guevurot** against BB's attested Gevurot (0 : 2). It keeps one spelling
   with Guevura (6 : 1).
6. **Section names Luz Interior / Observação Interior.** BB Portuguese never
   names them, because its Intro is abridged before §156's reading guide. I
   took the shipped UI. The alternatives would be BB-style transliteration
   (Ohr Pnimi / Histaklut Pnimit), which would collide with the technical
   Ohr Pnimi.
7. **"p. N" for דף.** BB writes "p 31b" without the dot 8 times out of 10. I
   added the dot. The English run spells out "page", and a spelled-out
   "página N" would also be defensible.
8. **item lower-case vs Parte / Capítulo capitalized.** This mixes BB's
   majority (item 90 : 26) with the UI's "Parte". resposta N and pergunta N
   are PROPOSED lower-case, like item.
9. **Every PROPOSED citation formula.** BB Portuguese drops every ד"ה, עש"ה,
   ע"ש, עכ"ל and וז"ל, so these are my wording: "o trecho que começa com",
   "estude bem ali", "veja ali", "Fim da citação.", "e estas são suas
   palavras:", "aqui não é o lugar para se estender".
10. **Dvekut and Hitkalelut transliterated.** Both are near ties with adesão
    and integração. I followed BB Portuguese's strong lean to transliterating
    technical nouns.

**Orchestrator decisions outside terminology:**

- Whether to italicize transliterations as BB does (§1.8). I ruled no.
- Whether to align the repo strings in §4.

## 6. How to re-count

```sh
cd <scratchpad>/terms/pt/work
printf 'label\t<python regex>\n' | python3 -I cnt.py   # I / P / total
python3 -I gen.py                                    # recounts every row, rebuilds terms-pt.md/json, re-validates
```

`intro_sxs.txt` and `pticha_sxs.txt` put the Hebrew, English and Portuguese
of each numbered section side by side. The Intro's Portuguese numbering is
recovered from the `<li>` items of `intro.pt.html`.

`gen.py` refuses to build in any of these cases:

- an OFFICIAL row has 0 hits;
- a banned pattern has any official hit;
- a banned pattern matches a binding form;
- a glossary id is missing;
- a Hebrew trigger fires on its negative samples or misses its positive ones.
