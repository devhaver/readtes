# Spanish (`es`) binding terminology — Talmud Eser Sefirot

Every Spanish translator reads this before the first item. It is built only from
Bnei Baruch's **official Spanish** and counted, not remembered:

| code  | source                                  | what it is                                                                            |
| ----- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| **I** | `km-intro/intro.es.txt`                 | _Introducción al Estudio de las Diez Sefirot_ (155 sections)                          |
| **P** | `km-intro/pticha.es.txt`                | _Apertura a la Sabiduría de la Cabalá_ (187 sections) — the technical-vocabulary text |
| **C** | `content/parts/part-06/**/*.es-bb.json` | TES part 6, BB's Spanish (54 source + 8 commentary items)                             |

Counts are Python-regex matches over those three texts (html stripped), written
`total (I.. P.. C..)`. 286 rows: **263 OFFICIAL**, **23 PROPOSED**. The
counter is `terms/es/work/cnt.py`; re-run any number with it.

## 0. Precedence

1. **This table binds.** Where it is silent, grep I and P for BB's form, then
   follow the scheme in §1. Report every new term you had to coin.
2. **BB's Spanish beats the English canon.** `docs/translation-terminology.md`
   is orientation only. Where BB Spanish differs from the English run, this
   table has already ruled. The big ones:
   - `בחינה` → **fase** in every sense, not "discernimiento".
   - `קטנות`/`גדלות` → **pequeñez / grandeza**, not Katnut / Gadlut.
   - `אחורים` → **Ajoraim**; `פב"פ` → **Panim be Panim**. BB keeps the Hebrew for these.
   - `קליפות` → **Klipot**; `יניקה` → **Yeniká**.
   - `טעמים` → **Teamim**; `עצמות` → **esencia**.
3. **The lemma rule, as in English.** Inside a bolded `<b>` lemma, follow the
   pane's _phrasing_ (its verbs and word order). **Technical terms and name
   spellings in this table never follow the pane**, lemma or not. This matters in
   part 6, whose `es-bb` pane writes ZON / GAR / VAK, "sabores", "la parte
   posterior", "Luz retornante", "Gadlut", "Nikvey". In a lemma, still write
   ZoN, GaR, VaK, Teamim, Ajoraim, Luz Retornante, grandeza and Níkvey.
4. **Never emend, never drop** — unchanged from `docs/translation-rules.md`.

## 1. Conventions

### 1.1 Transliteration scheme (BB Spanish)

| Hebrew                         | Spanish                  | Attested examples (counts)                                                                                                                                       |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ח                              | **j**                    | Jojmá 171, Jésed 33, Jayá 42, Jótem 33, Jazé 79, Jasadim 26, Rúaj 29, Mojin 106, Nétzaj 20, Métzaj 11                                                            |
| כ (soft)                       | **j**                    | Maljut 189, Shejiná 12, Halajá 5, Melajim 1, Yerejaim 2                                                                                                          |
| כּ, ק                          | **k**                    | Kéter 202, Kli, Kedushá 25, Klipot 17, Akudim 11, Nekudim 251, Kamatz 8, Dikna 18                                                                                |
| צ                              | **tz**                   | Atzilut 254, Yetzirá 70, Partzuf 359, Tzimtzum, Nétzaj, Métzaj, Etzbaot, Mitzvot                                                                                 |
| שׁ                             | **sh**                   | Shóresh, Neshamá, Shuruk, Shejiná, Shibolet, Shaar                                                                                                               |
| שׂ, ס                          | **s**                    | Searot 10, Asiá 59, Sefirá 41, Sium 68, Sof 59                                                                                                                   |
| ג before e/i                   | **gu**                   | Guevurá 21, Guímel 5, Guematria 5, Taguín 9, Guemará 7                                                                                                           |
| ב (soft), consonantal ו        | **v**                    | Guevurá, Vav 25, HaVaYaH 13, VaK                                                                                                                                 |
| final ה / final stressed vowel | **accented vowel, no h** | Jojmá, Biná, Beriá, Yetzirá, Asiá, Neshamá, Yejidá, Sefirá, Kedushá, Jazé, Yeniká. No BB form ends in _-ah_ except **HaVaYaH** (the Name) and the letter **Hey** |
| vocal sheva                    | **e**                    | Neshamá, Guevurá, Bereshit, Shejiná, Yejidá, Sefirot, Tevuná                                                                                                     |
| Hebrew plural                  | **kept, never + s**      | Sefirot, Partzufim, Gufim, Roshim, Klipot, Jasadim, Guevurot, Mojin, Nekudot, Otiot, Teamim                                                                      |

**Accents** follow Spanish orthography on the Hebrew stress, and are part of
the spelling.

- Accent on a stressed non-final syllable: Kéter, Tiféret, Nétzaj, Jésed, Dáat,
  Néfesh, Rúaj, Métzaj, Jótem, Átik, Árij, Álef, Dálet, Guímel, Shóresh, Níkvey.
- Accent on a stressed final vowel: Jojmá, Biná, Parsá, Jazé, Sefirá, Yejidá.
- Final stress before _-n_: Taguín, Kadmón, Zakán, HaRishón, Tikún.
- No accent in BB: Atzilut, Maljut, Tabur, Sium, Mojin, Einaim, Galgalta,
  Dikna, Mazla, Nukva, Yesod, Hod, Ozen, Toj, Sof, Guf, Rosh, Pe.

Copy the table's spelling exactly. Every English-style spelling — Keter,
Hochma, Bina, Hesed, Gevura, Tifferet, Netzah, Malchut, Sefira, Mochin, Peh,
Toch — occurs **0** times in BB, and the gate bans them all.

### 1.2 Capitalization

- **Luz** is always capitalized for אור: 665 against 9 lower-case, and those 9
  are daylight and candles. The plural is **Luces** (116 : 48).
- **Named lights** take title case: Luz Superior (86 : 0), Luz Directa, Luz
  Retornante, Luz Circundante, Luz Interna, Luz de Jojmá, Luz de Jasadim.
- **Proper Hebrew terms** are capitalized: Sefirot and their names, Partzuf,
  worlds, the parts of a Partzuf (Rosh, Tabur, Parsá …), Mojin, Jasadim,
  Nekudot. Sefirá / Sefirot are never lower-case (0).
- **Translated technical nouns** are lower-case: vasija, pantalla, grosor,
  acoplamiento, golpe, golpeteo, restricción, línea, fase, registro, revestidura,
  grado, nivel, raíz, corrección, rompimiento, partida, expansión, pequeñez,
  grandeza.
- **mundo** is lower-case (389 : 25): el mundo de Atzilut. "diez" is lower-case
  too: diez Sefirot (233 : 4).
- **superior / inferior** are lower-case, except in the fixed names _Luz
  Superior_, _AVI Superior_ and _Mundos Superiores_. Outside those names BB has
  47 capitalized against 90 lower-case; C capitalizes at random, so don't copy
  it. arriba / abajo are lower-case (83 : 21).
- **God and His agents** are capitalized: el Emanador (16 : 3), el Creador
  (133), Su Esencia (8 : 5), Él / Su.
- **Reference labels before a number** are capitalized: Parte, Capítulo,
  Página, Ítem, Respuesta (§2.9).

### 1.3 Acronyms

BB writes Hebrew acronyms two ways, and the Pticha is consistent about which:

- **Vocalized acronyms, mixed case (vowels lower-case):** JaGaT 45, NeHY 63,
  NeHYM 15, KaJaB 29, KaJBaD 4, JaBaD 7, JuB 20, AJaP 135, TaNHY 8, TaNHYM 7,
  DaJGaT 1, NaRaNJaY 3, NaRaN 20, TaNTA 2, HaVaYaH 13, VaT 2.
  BB's majority puts **GaR 60 : GAR 30, ZaT 63 : ZAT 11, VaK 33 : VAK 21,
  ZoN 126 : ZON 24 and MaN 57 : MAN 8** in this class too. C prints them in
  capitals; write the majority form.
- **Acronyms spelled letter by letter, in capitals:** AK 395, AB 123, SAG 197,
  MA 119, BON 58, AA 76, ZA 126, AVI 171, YESHSUT 53, ABYA 39, BYA 73, GE 28.
- **Never** the English acronyms (AHP, HGT, NHY, KHB, HBD, NHYM: all 0), and
  never BAN (0).
- **Spell out only where the Hebrew does:** אריך אנפין → Árij Anpin, זעיר
  אנפין → Zeir Anpin, אבא ואמא → Aba ve Ima, אדם קדמון → Adam Kadmón.

### 1.4 Quotation marks

- **«…»** for every quotation (706).
- **“…”** for a quotation inside «…» (18 such nestings, 0 the other way round).
- **‘…’** at the third level.
- Apostrophe **’**. Never a straight `"` or `'`: BB's 16 straight quotes are
  stray errors.

Part 6 C uses only “…” (28), copied from the English; I and P are BB's Spanish
norm. The existing curly-quote gate must accept « ».

### 1.5 Glosses

Glosses go in **parentheses**, not brackets: Rosh (cabeza) — 149 : 18, and the
brackets occur only in C. Gloss a transliterated term **once per item**, then
write it bare.

Use BB's attested glosses:

- Parts of a Partzuf: Rosh (cabeza), Guf (cuerpo), Toj (interior), Sof (final),
  Pe (boca), Tabur (ombligo), Jazé (pecho), Ozen (oreja), Jótem (nariz),
  Métzaj (frente), Einaim (ojos), Níkvey Einaim (pupilas de los ojos),
  AJaP (Ozen, Jótem, Pe), Dikna (barba), Searot (cabello).
- Partzufim and states: Nukva (femenina), Panim (anteriores),
  Ajoraim (posteriores), GaR (las tres primeras), ZaT (siete inferiores),
  VaT (seis inferiores), Ubar (embrión), Ibur y Yeniká (gestación y lactancia).
- TaNTA: Nekudot (puntos), Teamim (sabores), Taguín (coronas), Otiot (letras).
- Other terms: Klipot (cáscaras), Kedushá (santidad), Dvekut (adhesión),
  Kolel (totalidad).
- Hebrew plurals: Partzufim (plural de Partzuf), Gufim (plural de Guf),
  Roshim (cabezas).

**Do not gloss translated terms.** No "acoplamiento (Zivug)", "pantalla
(Masaj)" or "registro (Reshimo)" in running text.

### 1.6 Translate or transliterate

- **Translate:** Luz, vasija, pantalla, grosor, refinación / refinamiento /
  refinado, registro, acoplamiento, golpe, acoplamiento mediante golpe,
  golpeteo, revestidura, restricción, línea, círculos, rectitud, fase, grado,
  nivel, raíz, expansión, partida, rompimiento, corrección, deseo de recibir /
  otorgar, disparidad / equivalencia de forma, interioridad / exterioridad,
  mirada, Emanador, ser emanado, pequeñez, grandeza, misericordia, juicio,
  articulaciones, masculino / femenino, chispas, reyes.
- **Transliterate:** the Sefirot and their names, Partzuf / Partzufim and every
  part of a Partzuf, the worlds, Ein Sof, Mojin, Jasadim, Guevurot, Nukva, the
  TaNTA quartet (Teamim, Nekudot, Taguín, Otiot), Panim / Ajor / Ajoraim (with
  Panim be Panim, Ajor be Ajor), Klipot / Klipá, Kedushá, Ibur, Yeniká, Ubar,
  Dvekut, and the five lights Néfesh, Rúaj, Neshamá, Jayá, Yejidá.

### 1.7 Grammar of transliterated nouns

- **Gender (attested):** la Sefirá (32), la Parsá (60 : 1), la Nukva,
  las Nekudot (17 : 8), la Klipá, la Luz; el Partzuf (69), el Pe (46 : 1),
  el Jazé (45), el Tabur, el Rosh, el Guf.
- **No article before a Partzuf's name:** Partzuf AB, Partzuf Átik.
- **Hebrew plurals keep their form:** never "Partzufs" or "Sefirás". The one
  "Yods" in C is not a model — write _las Yod_.

### 1.8 Markup

- **Lemma.** Reproduce the Hebrew `<b>…</b>` exactly, with the same boundaries,
  and bold only that. BB's KM exports bold the lemma _and_ the sentences after
  it (`<strong>` in C). That is an export artefact; don't imitate it.
- **Tag counts.** `<b>`, `<br>` and `<small>` counts stay identical to the
  Hebrew, as the existing gate checks.
- **Italics.** BB italicizes every transliteration (`<em>`: 5,424 in the
  Pticha, every term in C). **Do not add `<em>`.** It is typography rather than
  terminology, the gate compares tags against the Hebrew, and the en-ai run
  carries none. This is an orchestrator decision — see §5.
- **Inline item markers** become gematria Arabic numerals, `(ב)` → `(2)`, as in
  English. BB Spanish drops them; we don't.
- **Bolded letters** stay bold and take their Spanish names: `<b>Hey</b>`,
  `<b>Vav</b>`, `<b>Yod</b>`, `<b>Álef</b>`.

## 2. The binding table

Columns: Hebrew · English canon (orientation only, not binding) · **Español** (binding) · evidence counted in I / P / C · status · note. OFFICIAL = the binding form occurs in BB's Spanish; PROPOSED = BB is silent, the form follows BB's scheme by the analogy named.

### 2.1 The 125 entries of tes-en.index.json (in its order) (125 rows)

| Hebrew                          | English canon                         | Español                         | Evidence (I / P / C)                                                                                                                     | Status   | Note                                                                                                                                                                |
| ------------------------------- | ------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| אור                             | light                                 | **Luz**                         | Luz 665 (I78 P435 C152) · luz 9 (I6 P3: daylight, a candle)                                                                              | OFFICIAL | Always capitalized for אור; lower-case only for mundane light (la luz del día). Never Or/Ohr in prose — Or Jozer, Or Makif, Or Pnimí occur only as BB glosses.      |
| אורות                           | lights                                | **Luces**                       | Luces 116 (I9 P98 C9) · luces 48 (P1 C47)                                                                                                | OFFICIAL | Majority capitalized; C lower-cases it — do not follow C.                                                                                                           |
| אור עליון                       | upper light                           | **la Luz Superior**             | Luz Superior 86 (P81 C5) · Luz superior 0                                                                                                | OFFICIAL | Fixed name, both words capitalized.                                                                                                                                 |
| כלי                             | vessel                                | **vasija**                      | vasija 144 (I2 P100 C42) · Kli 27 (P only) · recipiente 1 (C, an allegory)                                                               | OFFICIAL | Translate, one form only — do not copy the Pticha's stylistic alternation with Kli.                                                                                 |
| כלים                            | vessels                               | **vasijas**                     | vasijas 258 (I4 P199 C55) · Kelim 1 (P gloss)                                                                                            | OFFICIAL |                                                                                                                                                                     |
| כלי קבלה                        | vessel of reception                   | **vasija de recepción**         | 32 (I1 P27 C4) · Kli de recepción 0                                                                                                      | OFFICIAL | Plural vasijas de recepción.                                                                                                                                        |
| מסך                             | screen                                | **pantalla**                    | pantalla(s) 255 (P244 C11) · Masaj/Masach 0                                                                                              | OFFICIAL | Never transliterated.                                                                                                                                               |
| עביות                           | coarseness                            | **grosor**                      | grosor 182 (P181 C1) · Aviut 4 (P glosses) · espesor 0 · densidad 0                                                                      | OFFICIAL | Optional first-use gloss grosor (Aviut), as P §1/§18. עובי (thickness) has no separate BB form: also grosor — never coin espesor.                                   |
| עב                              | coarse                                | **grueso, gruesa**              | «gruesa» 2 (P §19)                                                                                                                       | OFFICIAL | Comparative: más grueso / con más grosor (P §19).                                                                                                                   |
| זכות                            | refinement                            | **refinamiento**                | refinamiento 1 for זכות (P §18 'refinamiento (Zakut)') · pureza 1 (P §43, זכותה)                                                         | OFFICIAL | Thin (1:1); the defining passage wins. Keep apart from הזדככות → refinación.                                                                                        |
| זך                              | refined                               | **refinado, refinada**          | refinado/a(s) 25 (P)                                                                                                                     | OFFICIAL | 'la más refinada de todas', 'pantalla refinada'.                                                                                                                    |
| הזדככות                         | refinement                            | **refinación**                  | refinación 31 (P) · refinamiento 2 (P §42, §116)                                                                                         | OFFICIAL | The screen's process. Verb refinarse ('la pantalla se refina').                                                                                                     |
| רשימו                           | record                                | **registro**                    | registro(s) 68 (P66 C2) · Reshimo 0 · Reshimot 1 (P §39 gloss)                                                                           | OFFICIAL | registro de grosor / registro de revestidura (P §42).                                                                                                               |
| זווג                            | coupling                              | **acoplamiento**                | acoplamiento(s) 139 (P111 C28) · Zivug 4 (P parenthetical glosses only) · apareamiento 1                                                 | OFFICIAL | Verbs: hacer un acoplamiento, acoplarse (P §47 'se acopla'). Never Zivug in prose.                                                                                  |
| הכאה                            | striking                              | **golpe**                       | golpe 54 (I1 P53) · Hakaá 3 (glosses)                                                                                                    | OFFICIAL |                                                                                                                                                                     |
| זווג דהכאה                      | coupling by striking                  | **acoplamiento mediante golpe** | 51 (P) · 'acoplamiento por golpe' 0 · Zivug de Hakaá 2 (glosses)                                                                         | OFFICIAL |                                                                                                                                                                     |
| עולם                            | world                                 | **mundo**                       | mundo 389 · Mundo 25 (titles)                                                                                                            | OFFICIAL | Lower-case: el mundo de Atzilut (38:1), el mundo de Nekudim (30:5), los mundos ABYA. Capital only in los Mundos Superiores.                                         |
| צמצום                           | restriction                           | **restricción**                 | restricción 89 (I3 P74 C12) · Tzimtzum 4 (glosses)                                                                                       | OFFICIAL | Verb restringir(se).                                                                                                                                                |
| קו                              | line                                  | **línea**                       | línea(s) 19 (P12 C7) · Kav 0                                                                                                             | OFFICIAL | קו דק → una fina línea (P §31); קו ימין/שמאל/אמצעי → línea derecha/izquierda/media (C).                                                                             |
| עיגולים                         | circles                               | **círculos**                    | círculos 0 · Igulim 0 (no BB text discusses Igulim)                                                                                      | PROPOSED | Plain translation, parallel to línea; the repo ToC already titles Part 2 'Círculos y rectitud'.                                                                     |
| עיגול                           | circle                                | **círculo**                     | 0                                                                                                                                        | PROPOSED | As círculos.                                                                                                                                                        |
| יושר                            | straightness                          | **rectitud**                    | technical 0 · rectitud 1 (P §1, ordinary sense 'Su rectitud')                                                                            | PROPOSED | Matches the repo ToC 'Círculos y rectitud'.                                                                                                                         |
| הסתכלות פנימית                  | Inner Observation                     | **Histaklut Pnimit**            | I §156 ×2; no Spanish name in any BB text                                                                                                | OFFICIAL | Section name, title case. The repo UI says 'Observación Interior' — see §4.                                                                                         |
| הסתכלות                         | look                                  | **mirada**                      | mirada(s) 9 (I1 P2 C6) + verb mira 6 (C)                                                                                                 | OFFICIAL | 'la mirada del Ayin' (C); verb mirar. Never observación (collides with the section name).                                                                           |
| אור פנימי                       | inner light                           | **Luz Interna**                 | Luz Interna 25 (P), technical sense                                                                                                      | OFFICIAL | The commentary Ohr Pnimi is Luz Interior (§2.7). Never swap the two.                                                                                                |
| אור מקיף                        | surrounding light                     | **Luz Circundante**             | 48 (P) · Luces Circundantes 1 (I) · Luz Envolvente 0                                                                                     | OFFICIAL |                                                                                                                                                                     |
| אור ישר                         | direct light                          | **Luz Directa**                 | Luz Directa 3 (P) · Luz directa 2 (C)                                                                                                    | OFFICIAL | Title case, like every named light.                                                                                                                                 |
| אור חוזר                        | reflected light                       | **Luz Retornante**              | Luz Retornante 47 (P) · Luz retornante 2 (C) · Luz Reflejada 0                                                                           | OFFICIAL | The repo ToC says 'luz reflejada' — see §4.                                                                                                                         |
| התלבשות                         | clothing                              | **revestidura**                 | revestidura 29 (P) · vestidura 4 + vestimenta 6 (C) · revestimiento 6 (I1 P5) · Hitlabshut 4 (glosses)                                   | OFFICIAL | Noun. Verbs revestirse / vestirse ('la Luz se reviste en las vasijas', 'ZoN viste a AA').                                                                           |
| ביטוש                           | clash                                 | **golpeteo**                    | golpeteo 30 (P) · Bitush 1 (gloss)                                                                                                       | OFFICIAL | 'el golpeteo de Luz Circundante y Luz Interna' (P).                                                                                                                 |
| נאצל                            | emanated being                        | **el ser emanado**              | ser emanado 6 · el emanado 2 (P)                                                                                                         | OFFICIAL | Plural los seres emanados.                                                                                                                                          |
| מאציל                           | Emanator                              | **el Emanador**                 | Emanador 16 (P) · emanador 3 (C)                                                                                                         | OFFICIAL | Capitalized.                                                                                                                                                        |
| השתלשלות                        | cascading                             | **descenso gradual**            | P §3 'orden de sucesión descendente', §4 'descender gradualmente', §30 and §42 'descenso' · evolución 2 (I §143, generations of reality) | OFFICIAL | סדר השתלשלות → el orden de descenso gradual.                                                                                                                        |
| סבה ומסובב                      | cause and consequence                 | **causa y efecto**              | causa y efecto 2 (I §74, P §58) · causa y (la) consecuencia 2 (I §143) — a tie                                                           | OFFICIAL | Tie broken toward the Pticha and the repo UI/ToC ('Causa y efecto'). מסובב alone → efecto.                                                                          |
| בחינה                           | phase                                 | **fase**                        | fase(s) 523 (I2 P375 C146) · discernimiento(s) 34 · aspecto(s) 9 · Behiná 0                                                              | OFFICIAL | Every sense, generic בחינת X included: la fase de X ('fase de' 162 : 'discernimiento de' 12). הבחנה/הבחן → discernimiento; נבחן → se discierne como / se considera. |
| ד' בחינות                       | four phases                           | **las cuatro fases**            | cuatro fases 11 (P)                                                                                                                      | OFFICIAL |                                                                                                                                                                     |
| בחי"ד                           | phase four                            | **la cuarta fase**              | cuarta fase 125 (P) · fase cuatro 3 (C)                                                                                                  | OFFICIAL | Ordinal first: la primera / segunda / tercera / cuarta fase (274 : 13). בחינת שורש → la fase raíz (7 : 'fase Shóresh' 2).                                           |
| שבירה                           | breaking                              | **rompimiento**                 | rompimiento 19 (P) · ruptura 2 (P1 C1)                                                                                                   | OFFICIAL | שבירת הכלים → el rompimiento de las vasijas (10 : 1). Verb romperse. ruptura/brecha are BB's words for בקיעה (§2.5).                                                |
| תיקון                           | correction                            | **corrección**                  | corrección 39 (I5 P20 C14) · Tikún 4 (names only)                                                                                        | OFFICIAL | Verb corregir.                                                                                                                                                      |
| התפשטות                         | expansion                             | **expansión**                   | expansión 23 (P22 C1) · se expande… 64                                                                                                   | OFFICIAL |                                                                                                                                                                     |
| הסתלקות                         | departure                             | **partida**                     | partida 24 (I2 P20 C2) · retiro 1 · salida 13 (= יציאה)                                                                                  | OFFICIAL | Verbs partir, retirarse.                                                                                                                                            |
| מדרגה                           | degree                                | **grado**                       | grado(s) 195 (I26 P161 C8)                                                                                                               | OFFICIAL | Never nivel (that is קומה).                                                                                                                                         |
| קומה                            | level                                 | **nivel**                       | nivel(es) 320 (I1 P303 C16)                                                                                                              | OFFICIAL | 'el nivel de Kéter'.                                                                                                                                                |
| שורש                            | root                                  | **raíz**                        | raíz/raíces 50 (I3 P41 C6) · Shóresh 6 ('fase/grosor Shóresh')                                                                           | OFFICIAL |                                                                                                                                                                     |
| רצון לקבל                       | will to receive                       | **deseo de recibir**            | 46 (I2 P44) · voluntad de recibir 0                                                                                                      | OFFICIAL |                                                                                                                                                                     |
| רצון להשפיע                     | will to bestow                        | **deseo de otorgar**            | 5 (P) · voluntad de otorgar 0                                                                                                            | OFFICIAL | השפעה → otorgamiento (18).                                                                                                                                          |
| שינוי צורה                      | disparity of form                     | **disparidad de forma**         | 13 (P) · diferencia de forma 0                                                                                                           | OFFICIAL |                                                                                                                                                                     |
| השתוות הצורה                    | equivalence of form                   | **equivalencia de forma**       | 9 (P) · igualdad de forma 0                                                                                                              | OFFICIAL |                                                                                                                                                                     |
| פנימיות                         | internality                           | **interioridad**                | 7 (P5 C2)                                                                                                                                | OFFICIAL |                                                                                                                                                                     |
| חיצוניות                        | externality                           | **exterioridad**                | 5 (I1 C4)                                                                                                                                | OFFICIAL |                                                                                                                                                                     |
| חלל                             | space                                 | **espacio**                     | espacio(s) 13; חלל פנוי → espacio vacío 8 (P)                                                                                            | OFFICIAL | 'el espacio restringido' (P §31).                                                                                                                                   |
| מקום פנוי                       | vacant place                          | **lugar vacante**               | C ch.43 'Su lugar … permaneció vacante' (נשאר מקומם פנוי)                                                                                | OFFICIAL | Thin (1).                                                                                                                                                           |
| עצמות                           | self                                  | **esencia**                     | esencia(s) 28; עצמותו ית' → Su Esencia 8 : Su esencia 5                                                                                  | OFFICIAL | The English run says 'self'; BB Spanish says esencia. בעצמותו → en sí mismo (C ch.1).                                                                               |
| בורא                            | Creator                               | **el Creador**                  | Creador 133 (I127 P6)                                                                                                                    | OFFICIAL |                                                                                                                                                                     |
| טעמים                           | tastes                                | **Teamim**                      | Teamim 26 technical (P22 I3 C1) · sabores 20 technical (C19, P1 gloss)                                                                   | OFFICIAL | Gloss once: Teamim (sabores). טעם = reason → razón (C 'por dos razones').                                                                                           |
| נקודות                          | Nekudot                               | **Nekudot**                     | Nekudot 87 (P50 C37) · C writes puntos inside the TaNTA list                                                                             | OFFICIAL | Feminine: las Nekudot (17:8). Gloss once: Nekudot (puntos). A single point → punto (el punto de Jolam, el punto de este mundo).                                     |
| אותיות                          | letters                               | **Otiot**                       | Otiot 26 (P) · letras ~10 in the TaNTA sense (C)                                                                                         | OFFICIAL | TaNTA / vessel sense only. Letters of a word or name → letras (las veintidós letras, la letra Yod).                                                                 |
| חסדים                           | Hassadim                              | **Jasadim**                     | 26 (P23 C3) · Hasadim/Hassadim 0                                                                                                         | OFFICIAL | אור החסדים → la Luz de Jasadim (18).                                                                                                                                |
| ספירה                           | Sefira                                | **Sefirá**                      | 41 · Sefira 0                                                                                                                            | OFFICIAL | la Sefirá (32).                                                                                                                                                     |
| ספירות                          | Sefirot                               | **Sefirot**                     | 316 · sefirot (lower-case) 0                                                                                                             | OFFICIAL | Always capitalized.                                                                                                                                                 |
| עשר ספירות / ע"ס                | ten Sefirot                           | **diez Sefirot**                | diez Sefirot 233 · Diez Sefirot 4 (titles)                                                                                               | OFFICIAL | ע"ס / י"ס alike; ט"ס → nueve Sefirot.                                                                                                                               |
| פרצוף                           | Partzuf                               | **Partzuf**                     | 359                                                                                                                                      | OFFICIAL | el Partzuf (69). No article before a name: Partzuf AB, Partzuf Átik.                                                                                                |
| פרצופים                         | Partzufim                             | **Partzufim**                   | 187 · Partzufin 0                                                                                                                        | OFFICIAL | Gloss once: Partzufim (plural de Partzuf), P §16.                                                                                                                   |
| ראש                             | Rosh                                  | **Rosh**                        | 325                                                                                                                                      | OFFICIAL | Gloss Rosh (cabeza). Plural Roshim (9).                                                                                                                             |
| תוך                             | Toch                                  | **Toj**                         | 16 · Toch 0                                                                                                                              | OFFICIAL | Gloss Toj (interior). The preposition תוך/בתוך → dentro de / en.                                                                                                    |
| סוף                             | Sof                                   | **Sof**                         | 59                                                                                                                                       | OFFICIAL | Gloss Sof (final). Not Ein Sof.                                                                                                                                     |
| גוף                             | Guf                                   | **Guf**                         | 225                                                                                                                                      | OFFICIAL | Gloss Guf (cuerpo) ×6. Plural Gufim (26).                                                                                                                           |
| אין סוף / א"ס                   | Ein Sof                               | **Ein Sof**                     | 40 · Infinito 0                                                                                                                          | OFFICIAL | א"ס ב"ה → Ein Sof (honorific dropped).                                                                                                                              |
| אצילות                          | Atzilut                               | **Atzilut**                     | 254                                                                                                                                      | OFFICIAL | The act of emanating → emanación (6, 'al comienzo de su emanación').                                                                                                |
| בריאה                           | Beria                                 | **Beriá**                       | 70 · Beria 0                                                                                                                             | OFFICIAL |                                                                                                                                                                     |
| יצירה                           | Yetzira                               | **Yetzirá**                     | 70 · Yetzira 0                                                                                                                           | OFFICIAL |                                                                                                                                                                     |
| עשיה                            | Assiya                                | **Asiá**                        | 59 · Asiya/Asiyá/Assiya 0                                                                                                                | OFFICIAL |                                                                                                                                                                     |
| אבי"ע                           | ABYA                                  | **ABYA**                        | 39                                                                                                                                       | OFFICIAL |                                                                                                                                                                     |
| אדם קדמון / א"ק                 | Adam Kadmon / AK                      | **Adam Kadmón / AK**            | AK 395 (P337 C58) · Adam Kadmón 1 (C)                                                                                                    | OFFICIAL | Spelled out → Adam Kadmón; א"ק → AK.                                                                                                                                |
| כתר                             | Keter                                 | **Kéter**                       | 202 · Keter 0                                                                                                                            | OFFICIAL |                                                                                                                                                                     |
| חכמה                            | Hochma                                | **Jojmá**                       | 171 · Hochma/Chochma/Jojma 0                                                                                                             | OFFICIAL | Sabiduría only for חכמת הקבלה and the gloss Luz de Jojmá (Luz de Sabiduría).                                                                                        |
| בינה                            | Bina                                  | **Biná**                        | 207 · Bina 0                                                                                                                             | OFFICIAL |                                                                                                                                                                     |
| חסד                             | Hesed                                 | **Jésed**                       | 33 · Hesed/Chesed/Jesed 0                                                                                                                | OFFICIAL |                                                                                                                                                                     |
| גבורה                           | Gevura                                | **Guevurá**                     | 21 · Gevura 0                                                                                                                            | OFFICIAL | Plural Guevurot (5).                                                                                                                                                |
| תפארת                           | Tifferet                              | **Tiféret**                     | 89 · Tiferet/Tifferet 0                                                                                                                  | OFFICIAL |                                                                                                                                                                     |
| נצח                             | Netzah                                | **Nétzaj**                      | 20 · Netzah/Netzaj 0                                                                                                                     | OFFICIAL |                                                                                                                                                                     |
| הוד                             | Hod                                   | **Hod**                         | 19                                                                                                                                       | OFFICIAL |                                                                                                                                                                     |
| יסוד                            | Yesod                                 | **Yesod**                       | 33                                                                                                                                       | OFFICIAL |                                                                                                                                                                     |
| מלכות                           | Malchut                               | **Maljut**                      | 189 · Malchut 0                                                                                                                          | OFFICIAL | Plural Maljuiot (P §50).                                                                                                                                            |
| גלגלתא                          | Galgalta                              | **Galgalta**                    | 46                                                                                                                                       | OFFICIAL |                                                                                                                                                                     |
| ע"ב                             | AB                                    | **AB**                          | 123                                                                                                                                      | OFFICIAL |                                                                                                                                                                     |
| ס"ג                             | SAG                                   | **SAG**                         | 197                                                                                                                                      | OFFICIAL |                                                                                                                                                                     |
| מ"ה                             | MA                                    | **MA**                          | 119                                                                                                                                      | OFFICIAL | מ"ה החדש → el nuevo MA (27).                                                                                                                                        |
| ב"ן                             | BON                                   | **BON**                         | 58 · BAN 0                                                                                                                               | OFFICIAL |                                                                                                                                                                     |
| נקודים                          | Nekudim                               | **Nekudim**                     | 251                                                                                                                                      | OFFICIAL | el mundo de Nekudim.                                                                                                                                                |
| ג"ר                             | GAR                                   | **GaR**                         | GaR 60 (P) · GAR 30 (C29 P1)                                                                                                             | OFFICIAL | Gloss GaR (las tres primeras). See §1.3.                                                                                                                            |
| ז"ת                             | ZAT                                   | **ZaT**                         | ZaT 63 (P) · ZAT 11 (P6 C5)                                                                                                              | OFFICIAL | Gloss ZaT (siete inferiores).                                                                                                                                       |
| ו"ק                             | VAK                                   | **VaK**                         | VaK 33 (P) · VAK 21 (P16 C5)                                                                                                             | OFFICIAL | Gloss PROPOSED: VaK (seis puntas), from BB's 'cinco puntas' for ה"ק (13). 'VaK sin Rosh'.                                                                           |
| כח"ב                            | KHB                                   | **KaJaB**                       | 29 · KHB 0                                                                                                                               | OFFICIAL |                                                                                                                                                                     |
| חג"ת                            | HGT                                   | **JaGaT**                       | 45 · HGT 0                                                                                                                               | OFFICIAL |                                                                                                                                                                     |
| נה"י                            | NHY                                   | **NeHY**                        | 63 · NHY 0                                                                                                                               | OFFICIAL |                                                                                                                                                                     |
| זו"ן                            | ZON                                   | **ZoN**                         | ZoN 126 (P) · ZON 24 (C)                                                                                                                 | OFFICIAL |                                                                                                                                                                     |
| ז"א                             | ZA                                    | **ZA**                          | 126                                                                                                                                      | OFFICIAL | Spelled-out זעיר אנפין → Zeir Anpin (§2.3, PROPOSED).                                                                                                               |
| א"א                             | AA                                    | **AA**                          | 76                                                                                                                                       | OFFICIAL | Spelled-out אריך אנפין → Árij Anpin (2).                                                                                                                            |
| נוקבא                           | Nukva                                 | **Nukva**                       | 54                                                                                                                                       | OFFICIAL | Gloss Nukva (femenina) ×5; la Nukva. Feminine grammar for Maljut, Biná, Nukva.                                                                                      |
| אח"פ                            | AHP                                   | **AJaP**                        | 135 · AHP 0                                                                                                                              | OFFICIAL | Gloss AJaP (Ozen, Jótem, Pe), P §76.                                                                                                                                |
| אחורים                          | posterior                             | **Ajoraim**                     | Ajoraim 41 (I1 P40) · posterior(es) 19 + parte posterior 8 (C)                                                                           | OFFICIAL | Gloss once: Ajoraim (posteriores). Singular אחור → Ajor (28).                                                                                                       |
| עינים                           | Einayim                               | **Einaim**                      | 99 · Einayim/Eynaim 0                                                                                                                    | OFFICIAL | Gloss Einaim (ojos).                                                                                                                                                |
| נקבי עינים                      | Nikvey Einayim                        | **Níkvey Einaim**               | Níkvey 46 (P) · Nikvey 15 (C)                                                                                                            | OFFICIAL | Gloss (pupilas de los ojos).                                                                                                                                        |
| פה                              | Peh                                   | **Pe**                          | 136 · Peh 0                                                                                                                              | OFFICIAL | Gloss Pe (boca); el Pe (46:1).                                                                                                                                      |
| חוטם                            | Hotem                                 | **Jótem**                       | 33 · Hotem/Jotem 0                                                                                                                       | OFFICIAL | Gloss Jótem (nariz).                                                                                                                                                |
| אזן                             | Ozen                                  | **Ozen**                        | 54                                                                                                                                       | OFFICIAL | Gloss Ozen (oreja); plural Oznaim (1).                                                                                                                              |
| טבור                            | Tabur                                 | **Tabur**                       | 167                                                                                                                                      | OFFICIAL | Gloss Tabur (ombligo).                                                                                                                                              |
| פרסא                            | Parsa                                 | **Parsá**                       | 82 · Parsa 0                                                                                                                             | OFFICIAL | la Parsá (60:1).                                                                                                                                                    |
| סיום                            | Sium                                  | **Sium**                        | 68                                                                                                                                       | OFFICIAL | Gloss Sium (final).                                                                                                                                                 |
| קטנות                           | Katnut                                | **pequeñez**                    | pequeñez 26 (P24 C1 I1) · Katnut 3 (P1 gloss, C2)                                                                                        | OFFICIAL | Translate — the English run transliterates, BB Spanish does not. Optional first gloss pequeñez (Katnut), P §68.                                                     |
| גדלות                           | Gadlut                                | **grandeza**                    | grandeza 42 (P41 C1) · Gadlut 7 (P1 gloss, C6)                                                                                           | OFFICIAL | 'Mojin de grandeza'.                                                                                                                                                |
| מוחין                           | Mochin                                | **Mojin**                       | 106 · Mochin 0                                                                                                                           | OFFICIAL |                                                                                                                                                                     |
| נרנח"י (נפש/רוח/נשמה/חיה/יחידה) | Nefesh, Ruach, Neshama, Haya, Yechida | **NaRaNJaY**                    | NaRaNJaY 3 (P) · NRNHY 0                                                                                                                 | OFFICIAL | The five lights: Néfesh, Rúaj, Neshamá, Jayá, Yejidá (§2.5). נר"ן → NaRaN (20).                                                                                     |
| הויה                            | HaVaYaH                               | **HaVaYaH**                     | 13                                                                                                                                       | OFFICIAL | Fillings hyphenated: Yod-Vav-Dálet, Hey-Yod (C).                                                                                                                    |
| ה"ת                             | bottom Hey                            | **la Hey inferior**             | 32 (P27 C5)                                                                                                                              | OFFICIAL | Also for ה' תתאה.                                                                                                                                                   |
| ה"ר                             | first Hey                             | **la primera Hey**              | 4 (C)                                                                                                                                    | OFFICIAL | Read the sentence: ה"ר can be ה' ראשונות → las cinco primeras (wording PROPOSED).                                                                                   |
| קליפות                          | shells                                | **Klipot**                      | Klipot 17 (I9 P8) + Klipá 7 (I) · cáscaras 12 (7 are glosses; C5 in prose)                                                               | OFFICIAL | Gloss once: Klipot (cáscaras). Singular la Klipá.                                                                                                                   |
| חכמת הקבלה                      | the wisdom of Kabbalah                | **la Sabiduría de la Cabalá**   | 24 · lower-case 'sabiduría' 2 · Cabalá 41 · Cábala/Kabbalah 0                                                                            | OFFICIAL |                                                                                                                                                                     |
| הרב                             | the ARI                               | **el ARI**                      | el ARI 13 (C) for הרב · 'el Rav' 0 in this sense                                                                                         | OFFICIAL | Never 'el Rav' for הרב (the Intro's single 'el Rav' is Rabí Jaim Vital).                                                                                            |
| עקודים                          | Akudim                                | **Akudim**                      | 11                                                                                                                                       | OFFICIAL | el mundo de Akudim.                                                                                                                                                 |
| או"ח                            | reflected light                       | **la Luz Retornante**           | as אור חוזר                                                                                                                              | OFFICIAL | Never 'Or Jozer' in prose.                                                                                                                                          |
| או"י                            | direct light                          | **la Luz Directa**              | as אור ישר                                                                                                                               | OFFICIAL |                                                                                                                                                                     |
| רשימות                          | records                               | **registros**                   | registros 37 (P)                                                                                                                         | OFFICIAL |                                                                                                                                                                     |
| בטישות                          | clashes                               | **golpeteos**                   | regular plural of golpeteo (30)                                                                                                          | PROPOSED |                                                                                                                                                                     |

### 2.2 Sefirot and their groupings (17 rows)

| Hebrew        | English canon        | Español                                    | Evidence (I / P / C)                                       | Status   | Note                                             |
| ------------- | -------------------- | ------------------------------------------ | ---------------------------------------------------------- | -------- | ------------------------------------------------ |
| דעת           | Daat                 | **Dáat**                                   | Dáat 42 (P21 C21) · Daat 2 (I)                             | OFFICIAL |                                                  |
| חב"ד          | HBD                  | **JaBaD**                                  | 7 (P1 C6) · HBD 0                                          | OFFICIAL |                                                  |
| כחב"ד         | KHBD                 | **KaJBaD**                                 | 4 · KHBD 0                                                 | OFFICIAL |                                                  |
| חו"ב          | HB                   | **JuB**                                    | 20 (P17 C3)                                                | OFFICIAL |                                                  |
| חו"ג          | HG                   | **JuG**                                    | 0; formed like JuB (20)                                    | PROPOSED |                                                  |
| נהי"מ         | NHYM                 | **NeHYM**                                  | 15 · NHYM 0                                                | OFFICIAL |                                                  |
| תנה"י         | TNHY                 | **TaNHY**                                  | 8 (P)                                                      | OFFICIAL |                                                  |
| תנהי"מ        | TNHYM                | **TaNHYM**                                 | 7 (P6 C1)                                                  | OFFICIAL |                                                  |
| דחג"ת         | DHGT                 | **DaJGaT**                                 | 1 (P §137)                                                 | OFFICIAL | Not 'de JaGaT' — read whether the ד is a prefix. |
| חו"ב תו"מ     | HB TM                | **JuB TuM**                                | 4 (P)                                                      | OFFICIAL | Also KaJaB TuM (P §19).                          |
| גו"ע          | GE                   | **GE**                                     | 28 (P22 C6)                                                | OFFICIAL |                                                  |
| גלגלתא ועינים | Galgalta ve Einayim  | **Galgalta ve Einaim**                     | 4 (P) · Galgalta y Einaim 3 (C) · 'Galgalta, Einaim' 3 (P) | OFFICIAL |                                                  |
| ה' קצוות      | the five extremities | **las cinco puntas**                       | 13 (C) · 'cinco filos' 1 (C)                               | OFFICIAL |                                                  |
| ו"ת           | the lower six        | **VaT**                                    | VaT (seis inferiores) 2 (P)                                | OFFICIAL |                                                  |
| נר"ן          | NRN                  | **NaRaN**                                  | 20 (P)                                                     | OFFICIAL | JaNRaN 1 for חנר"ן.                              |
| טנת"א         | TNTA                 | **TaNTA (Teamim, Nekudot, Taguín, Otiot)** | TaNTA 2 (P)                                                | OFFICIAL | Expand to the four names; gloss them once.       |
| תגין          | Tagin                | **Taguín**                                 | Taguín 9 (P) · coronas 6 (C5, P1 gloss)                    | OFFICIAL | Gloss once: Taguín (coronas).                    |

### 2.3 Partzufim and their parts (30 rows)

| Hebrew           | English canon             | Español                  | Evidence (I / P / C)                             | Status   | Note                                                                                                                                                                |
| ---------------- | ------------------------- | ------------------------ | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| עתיק             | Atik                      | **Átik**                 | 70 · Atik 0                                      | OFFICIAL |                                                                                                                                                                     |
| עתיק יומין       | Atik Yomin                | **Átik Yomin**           | 16 (I9 C7)                                       | OFFICIAL |                                                                                                                                                                     |
| פרצוף עתיק       | Partzuf Atik              | **Partzuf Átik**         | 16 (P14 C2)                                      | OFFICIAL |                                                                                                                                                                     |
| אריך אנפין       | Arich Anpin               | **Árij Anpin**           | 2 (P) · Arij 0                                   | OFFICIAL | א"א → AA.                                                                                                                                                           |
| זעיר אנפין       | Zeir Anpin                | **Zeir Anpin**           | never spelled out in BB texts (ZA 126)           | PROPOSED | Formed like Árij Anpin (no accent on Anpin).                                                                                                                        |
| אבא              | Aba                       | **Aba**                  | 16 · Abba 0                                      | OFFICIAL |                                                                                                                                                                     |
| אמא              | Ima                       | **Ima**                  | 23                                               | OFFICIAL |                                                                                                                                                                     |
| אבא ואמא         | Aba ve Ima                | **Aba ve Ima**           | 7 · 'Aba e/y Ima' 0                              | OFFICIAL | Only where the Hebrew spells it out; או"א → AVI.                                                                                                                    |
| או"א             | AVI                       | **AVI**                  | 171                                              | OFFICIAL |                                                                                                                                                                     |
| או"א עילאין      | the upper AVI             | **AVI Superior**         | AVI Superior 2 (P1 C1) · AVI superiores 1 (P)    | OFFICIAL | Never 'Aba e Ima superiores'.                                                                                                                                       |
| ישסו"ת           | YESHSUT                   | **YESHSUT**              | 53 · Yeshsut 0                                   | OFFICIAL | All caps.                                                                                                                                                           |
| ישראל סבא ותבונה | Israel Saba and Tevuna    | **Israel Saba y Tevuná** | P §172 · C 'Israel Saba y Tvuná' 1               | OFFICIAL | The pair is YESHSUT.                                                                                                                                                |
| תבונה            | Tevuna                    | **Tevuná**               | Tevuná 1 (P) · Tvuná 2 (C) — majority overridden | OFFICIAL | BB's own scheme writes vocal sheva as e (Neshamá 60, Guevurá 21, Bereshit 8, Shejiná 12); C copies BB English 'Tvuna'; the English canon bans Tvuna. Flagged in §5. |
| רחל              | Rachel                    | **Rajel**                | 0                                                | PROPOSED | ח → j as in Jojmá.                                                                                                                                                  |
| לאה              | Leah                      | **Lea**                  | 0                                                | PROPOSED | Standard Spanish form.                                                                                                                                              |
| חזה              | Chazeh                    | **Jazé**                 | 79 · Jaze 1 · Chazeh 0                           | OFFICIAL | Gloss Jazé (pecho); el Jazé (45).                                                                                                                                   |
| מוחא סתימאה      | Mocha Stimaa              | **Moja Stimaa**          | 'Moja' attested for מוחא (P §31); Stimaa 0       | PROPOSED | Gloss once: Moja Stimaa (el cerebro oculto). מו"ס → Moja Stimaa.                                                                                                    |
| דיקנא            | Dikna                     | **Dikna**                | 18 (C)                                           | OFFICIAL | Gloss Dikna (barba).                                                                                                                                                |
| שבולת הזקן       | the Shibolet of the beard | **Shibolet HaZakán**     | 28 (C) · Shibolet alone 6                        | OFFICIAL | Zakán (barba) 1.                                                                                                                                                    |
| שערות            | Se'arot [hair]            | **Searot**               | 10 (C)                                           | OFFICIAL | Gloss Searot (cabello).                                                                                                                                             |
| מזלא             | Mazla                     | **Mazla**                | 4 (C)                                            | OFFICIAL |                                                                                                                                                                     |
| מצח              | Metzach                   | **Métzaj**               | 11 (P9 C2)                                       | OFFICIAL | Gloss Métzaj (frente).                                                                                                                                              |
| רגלים / רגלין    | Raglayim                  | **Raglaim / Raglin**     | Raglaim 22 · Raglin 19                           | OFFICIAL | Follow the Hebrew form: רגלים → Raglaim, רגלין → Raglin.                                                                                                            |
| סיום רגלין       | Sium Raglin               | **Sium Raglin**          | 17 (P) · Sium Raglaim 8 (C, for סיום רגלים)      | OFFICIAL |                                                                                                                                                                     |
| אצבעות רגלין     | toes                      | **Etzbaot Raglin**       | 5 (P2 C3)                                        | OFFICIAL | Gloss (dedos de los pies).                                                                                                                                          |
| עטרת יסוד        | Atara of Yesod            | **Atéret Yesod**         | 1 (P §181)                                       | OFFICIAL |                                                                                                                                                                     |
| פרקין            | joints                    | **articulaciones**       | 18 (C) · coyunturas 2 (C)                        | OFFICIAL |                                                                                                                                                                     |
| ירכין            | legs                      | **Yerejaim**             | Yerejaim (muslos) 2 (C)                          | OFFICIAL | The English run says 'legs'; BB Spanish glosses muslos.                                                                                                             |
| כלים דפנים       | the anterior vessels      | **vasijas de Panim**     | 21 (P)                                           | OFFICIAL |                                                                                                                                                                     |
| כלים דאחורים     | the posterior vessels     | **vasijas de Ajoraim**   | 24 (P)                                           | OFFICIAL |                                                                                                                                                                     |

### 2.4 Worlds (6 rows)

| Hebrew           | English canon           | Español                       | Evidence (I / P / C)      | Status   | Note |
| ---------------- | ----------------------- | ----------------------------- | ------------------------- | -------- | ---- |
| בי"ע             | BYA                     | **BYA**                       | 73 (P)                    | OFFICIAL |      |
| עולם הנקודים     | the world of Nekudim    | **el mundo de Nekudim**       | 30 · 'Mundo de Nekudim' 5 | OFFICIAL |      |
| עולם התיקון      | the world of correction | **el mundo de la corrección** | 9 (P, case varies)        | OFFICIAL |      |
| העולמות העליונים | the upper worlds        | **los Mundos Superiores**     | 6 (I2 P4)                 | OFFICIAL |      |
| העולם הזה        | this world              | **este mundo**                | 68 · 'Este Mundo' 2       | OFFICIAL |      |
| מ"ה החדש         | the new MA              | **el nuevo MA**               | 27 (P26 C1)               | OFFICIAL |      |

### 2.5 Lights, growth, illumination (16 rows)

| Hebrew     | English canon       | Español                  | Evidence (I / P / C)          | Status   | Note                                                                                                    |
| ---------- | ------------------- | ------------------------ | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| נפש        | Nefesh              | **Néfesh**               | 25 · Nefesh 0                 | OFFICIAL |                                                                                                         |
| רוח        | Ruach               | **Rúaj**                 | 29 · Ruach/Ruaj 0             | OFFICIAL |                                                                                                         |
| נשמה       | Neshama             | **Neshamá**              | 60 · Neshama 0                | OFFICIAL | Plural Neshamot (almas).                                                                                |
| חיה        | Haya                | **Jayá**                 | 42                            | OFFICIAL | Spanish 'haya' (verb) is not Jayá.                                                                      |
| יחידה      | Yechida             | **Yejidá**               | 44 · Yechida 0                | OFFICIAL |                                                                                                         |
| אור החכמה  | Ohr Hochma          | **la Luz de Jojmá**      | 26 · 'Or Jojmá' 0             | OFFICIAL |                                                                                                         |
| אור החסדים | Ohr Hassadim        | **la Luz de Jasadim**    | 18 · 'Or Jasadim' 0           | OFFICIAL |                                                                                                         |
| עיבור      | Ibur [impregnation] | **Ibur**                 | 14 (P)                        | OFFICIAL | Gloss (gestación). עיבור ב' → Ibur Bet (segunda concepción) 2.                                          |
| יניקה      | nursing             | **Yeniká**               | 9 (P) · lactancia 1 (gloss)   | OFFICIAL | The English run translates; BB Spanish keeps Yeniká. Gloss once: Ibur y Yeniká (gestación y lactancia). |
| עובר       | Ubar                | **Ubar**                 | Ubar (embrión) 2 (P)          | OFFICIAL |                                                                                                         |
| עי"מ       | IYM                 | **Ibur, Yeniká y Mojin** | P §153–154                    | OFFICIAL | Expand.                                                                                                 |
| הארה       | illumination        | **iluminación**          | 66                            | OFFICIAL |                                                                                                         |
| התכללות    | inclusion           | **inclusión**            | 15 (P) · Hitkalelut 1 (gloss) | OFFICIAL |                                                                                                         |
| בקיעה      | breaching           | **brecha**               | brecha 5 (C) · ruptura 4 (C)  | OFFICIAL | 'abrir una brecha', 'traspasar'. Never rompimiento (that is שבירה).                                     |
| שפע        | abundance           | **abundancia**           | 36                            | OFFICIAL |                                                                                                         |
| ניצוצין    | sparks              | **chispas**              | 13                            | OFFICIAL |                                                                                                         |

### 2.6 Restrictions, positions, gender, MaN (27 rows)

| Hebrew      | English canon                      | Español                            | Evidence (I / P / C)                              | Status   | Note                                                                            |
| ----------- | ---------------------------------- | ---------------------------------- | ------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| צמצום א'    | the first restriction              | **la primera restricción**         | 17 · Tzimtzum Álef 2 (gloss)                      | OFFICIAL |                                                                                 |
| צמצום ב'    | the second restriction             | **la segunda restricción**         | 36 · Tzimtzum Bet 2 (gloss)                       | OFFICIAL |                                                                                 |
| צמצום נה"י  | the restriction of NHY             | **la restricción NeHY**            | 4 (P3 C1)                                         | OFFICIAL |                                                                                 |
| פנים        | anterior / face                    | **Panim**                          | 65 (I5 P60) · anterior(es) (C)                    | OFFICIAL | Gloss once: Panim (anteriores). The face of the Creator (Intro sense) → rostro. |
| אחור        | posterior                          | **Ajor**                           | 28                                                | OFFICIAL |                                                                                 |
| פב"פ        | face to face                       | **Panim be Panim**                 | 14 · cara a cara 3 (glosses)                      | OFFICIAL | Not the English run's plain-language rule: BB keeps the Hebrew.                 |
| אב"א        | back to back                       | **Ajor be Ajor**                   | 8 · espalda con espalda 4 (glosses)               | OFFICIAL |                                                                                 |
| פב"א        | face to back                       | **Panim be Ajor**                  | 2 (P)                                             | OFFICIAL |                                                                                 |
| אב"פ        | back to face                       | **Ajor be Panim**                  | 0                                                 | PROPOSED | Mirror of Panim be Ajor.                                                        |
| זכר         | male                               | **masculino**                      | 34 (P29 C5) · macho 5 · varón 5 · Zajar 2 (gloss) | OFFICIAL | Noun: el masculino.                                                             |
| נקבה        | female                             | **femenino, femenina**             | 29 · hembra 5 · Nekevá 1 (gloss)                  | OFFICIAL |                                                                                 |
| מ"ן         | MAN                                | **MaN**                            | MaN 57 (P) · MAN 8 (P2 C6)                        | OFFICIAL | Gloss once: MaN (Mein Nukvin).                                                  |
| מיין נוקבין | Mayin Nukvin                       | **Mein Nukvin**                    | Mein 2 (P) · Mayin 1 · Meyin 1 (C)                | OFFICIAL |                                                                                 |
| מ"ד         | MAD                                | **MaD**                            | 0                                                 | PROPOSED | Formed like MaN.                                                                |
| מיין דוכרין | Mayin Duchrin                      | **Mein Dujrin**                    | 0                                                 | PROPOSED | Formed like Mein Nukvin; כ → j.                                                 |
| דבקות       | adhesion                           | **Dvekut**                         | 4 · adhesión 6                                    | OFFICIAL | Gloss Dvekut (adhesión).                                                        |
| קדושה       | holiness                           | **Kedushá**                        | 25 · santidad 7 (glosses)                         | OFFICIAL |                                                                                 |
| קליפה       | shell                              | **la Klipá**                       | 7 (I)                                             | OFFICIAL |                                                                                 |
| גמר התיקון  | the end of correction              | **el final de la corrección**      | 7 (P) · Gmar Tikún 1                              | OFFICIAL |                                                                                 |
| מדת הדין    | the quality of judgment            | **la cualidad de juicio**          | 8 (P)                                             | OFFICIAL |                                                                                 |
| מדת הרחמים  | the quality of mercy               | **la cualidad de misericordia**    | 5 (P)                                             | OFFICIAL |                                                                                 |
| רחמים       | Rachamim / mercy                   | **misericordia**                   | 7 (P) · Rajamim 3 (C)                             | OFFICIAL |                                                                                 |
| דין, דינים  | judgment(s)                        | **juicio, juicios**                | 30                                                | OFFICIAL |                                                                                 |
| גבורות      | Gevurot                            | **Guevurot**                       | 5 · Gevurot 0                                     | OFFICIAL |                                                                                 |
| ה"ח וה"ג    | the five Hassadim and five Gevurot | **cinco Jasadim y cinco Guevurot** | P §98                                             | OFFICIAL |                                                                                 |
| מלכים       | kings                              | **reyes**                          | 24 · Melajim 1 (gloss)                            | OFFICIAL | מלך הדעת → Rey de Dáat (Rey de… 19).                                            |
| השפעה       | bestowal                           | **otorgamiento**                   | 18                                                | OFFICIAL |                                                                                 |

### 2.7 Section names of TES (8 rows)

| Hebrew                            | English canon                               | Español                                                    | Evidence (I / P / C)                                          | Status   | Note                                                                                      |
| --------------------------------- | ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| אור פנימי / או"פ (the commentary) | Inner Light                                 | **Luz Interior**                                           | Luz Interior 8 (C7, I1) · « Or Pnimí » (Luz interior) 2 (I)   | OFFICIAL | Title case: 'en la Luz Interior', '(Parte 5, Luz Interior, Ítem 40)'. The repo UI agrees. |
| הסתכלות פנימית (the commentary)   | Inner Observation                           | **Histaklut Pnimit**                                       | I §156 ×2                                                     | OFFICIAL | The repo UI says 'Observación Interior' — §4.                                             |
| לוח השאלות                        | Table of Questions                          | **la Tabla de preguntas**                                  | 3 (I)                                                         | OFFICIAL |                                                                                           |
| לוח התשובות                       | Table of Answers                            | **la Tabla de respuestas**                                 | 2 (I)                                                         | OFFICIAL |                                                                                           |
| לפירוש המלות                      | (on) the meaning of the words — terminology | **sobre el significado de las palabras**                   | 'El significado de las palabras' 3 (I §156)                   | OFFICIAL |                                                                                           |
| לענינים                           | (on) the topics                             | **sobre los asuntos**                                      | I §156 'sobre todas las palabras y asuntos'; ענין → asunto 48 | OFFICIAL | The repo ToC/UI say 'temas' — §4.                                                         |
| תלמוד עשר הספירות                 | Talmud Eser Sefirot                         | **Talmud Eser HaSefirot (El Estudio de las Diez Sefirot)** | I §156 1 · 'Estudio de las Diez Sefirot' 3 · TES 2            | OFFICIAL |                                                                                           |
| פנים (the Ari's text)             | Panim                                       | **«Panim» (las palabras del ARI)**                         | I §156 ×2                                                     | OFFICIAL |                                                                                           |

### 2.8 Names, books, honorifics (21 rows)

| Hebrew                     | English canon            | Español                       | Evidence (I / P / C)                                                                | Status   | Note                                                                            |
| -------------------------- | ------------------------ | ----------------------------- | ----------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| האר"י ז"ל                  | the ARI                  | **el ARI**                    | ARI 14 (I1 C13) · Arí 5 (I)                                                         | OFFICIAL | ז"ל dropped.                                                                    |
| בעל הסולם                  | Baal HaSulam             | **Baal HaSulam**              | 3                                                                                   | OFFICIAL |                                                                                 |
| רבי / ר'                   | Rabbi                    | **Rabí**                      | Rabí 42 · Rabi 2 · Rabino 0                                                         | OFFICIAL |                                                                                 |
| רשב"י                      | Rabbi Shimon Bar Yochai  | **Rabí Shimon Bar Yojay**     | 'Rabí Shimon' 12 (I) · 'Bar Yojay' 0 · Shimón 0                                     | PROPOSED | Bar Yojay formed by the scheme (ח → j, final י → y).                            |
| הרח"ו                      | Rav Chaim Vital          | **Rabí Jaim Vital**           | Rabí Jaim Vital 3 · Rav Jaim Vital 1                                                | OFFICIAL |                                                                                 |
| עץ חיים / ע"ח              | Etz Chaim                | **el Árbol de Vida**          | Árbol de Vida 5 · Árbol de la Vida 4 · Etz Jaim 3 (always beside the Spanish title) | OFFICIAL | First mention may add (Etz Jaim). Gates: el Árbol de Vida, Shaar 8, Capítulo 2. |
| הזהר                       | The Zohar                | **El Zóhar**                  | Zóhar 20 · Zohar 3 (C) · 'de El Zóhar' 6 : 'del Zóhar' 2                            | OFFICIAL | BB treats it as a title: capital El, no contraction.                            |
| התיקונים / תיקוני זהר      | the Tikkunim             | **los Tikunim (de El Zóhar)** | Tikunim 6 · Tikkunim 0                                                              | OFFICIAL |                                                                                 |
| תיקון N (תקוני זהר)        | Tikkun N                 | **Tikún N**                   | Tikún 69 (C) · Tikún Número 30 (I)                                                  | OFFICIAL |                                                                                 |
| מבוא שערים                 | Mevo She'arim            | **Mevó Shearim**              | 0                                                                                   | PROPOSED | No apostrophe (cf. Searot), stress accent as in BB's scheme.                    |
| שער הכוונות                | Sha'ar HaKavanot         | **Shaar HaKavanot**           | 0                                                                                   | PROPOSED | Formed like Shaar HaHakdamot (1).                                               |
| שער ההקדמות                | Sha'ar HaHakdamot        | **Shaar HaHakdamot**          | I §19                                                                               | OFFICIAL |                                                                                 |
| אדרא זוטא                  | Idra Zuta                | **Idra Zuta**                 | C ch.37                                                                             | OFFICIAL |                                                                                 |
| אד"ר                       | the Idra Rabba           | **la Idra Rabá**              | 0                                                                                   | PROPOSED | Formed like Bereshit Rabá (2).                                                  |
| ספר יצירה                  | Sefer Yetzira            | **el Libro de Yetzirá**       | Libro de Yetzirá 1 (P) · Séfer Yetzirá 1 (I)                                        | OFFICIAL |                                                                                 |
| אדם הראשון / אה"ר          | Adam HaRishon            | **Adam HaRishón**             | 8                                                                                   | OFFICIAL |                                                                                 |
| הקב"ה / השי"ת              | the Creator              | **el Creador**                | 133                                                                                 | OFFICIAL |                                                                                 |
| חז"ל                       | our sages                | **nuestros sabios**           | 44                                                                                  | OFFICIAL |                                                                                 |
| שכינה                      | the Shechina             | **la Shejiná**                | 12                                                                                  | OFFICIAL |                                                                                 |
| משנה / גמרא / תלמוד        | Mishna / Gemara / Talmud | **Mishná / Guemará / Talmud** | Mishná 14 · Guemará 7 · Talmud 7                                                    | OFFICIAL |                                                                                 |
| ז"ל, זצ"ל, זיע"א, ית', ב"ה | honorifics               | **(dropped)**                 | BB drops them: 'del ARI', 'Rabí Jaim Vital', 'Su Esencia', 'Ein Sof'                | OFFICIAL | Same rule as the English run.                                                   |

### 2.9 Citation formulae (17 rows)

| Hebrew            | English canon                      | Español                                         | Evidence (I / P / C)                                                                                                                                 | Status   | Note                                                                                                                             |
| ----------------- | ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ד"ה               | the passage beginning              | **el pasaje que comienza «…»**                  | BB never renders it: it drops ד"ה (I §35 '(ver punto 16)' for 'כנ"ל אות ט"ז, ד"ה "והנה"') or converts page refs to Parte/Ítem (C)                    | PROPOSED | Catchword in «…».                                                                                                                |
| עש"ה              | study it there well                | **estúdialo bien allí**                         | BB drops it (P §69 '(Ítem 35)' for '(כנ"ל באות ל"ה, עש"ה)'); nearest BB: 'estudialo allí' 1 (C, ומשם תדרשנו), 'Estúdielo a fondo' 1 (C, והבן זה מאד) | PROPOSED | tú form, as the Pticha addresses the reader.                                                                                     |
| ע"ש               | See there                          | **ver allí**                                    | BB drops it (P §40, §58, §84 …); BB's 'see' is ver 5 (I2 C3) / véase 1                                                                               | PROPOSED | Two senses: ע"ש = על שם → 'recibe el nombre de' (C ch.49).                                                                       |
| עכ"ל              | End of quote                       | **Hasta aquí sus palabras.**                    | I §76 · variant 'Hasta aquí lo escrito por él' 1 (I §19) · BB drops it 3×                                                                            | OFFICIAL |                                                                                                                                  |
| וז"ל              | and these are his words            | **y estas son sus palabras:**                   | 'Estas son sus palabras:' 1 (I §31); elsewhere BB paraphrases ('dice lo siguiente:', 'interpreta:')                                                  | OFFICIAL | 'sus' even when a book (El Zóhar) is quoted.                                                                                     |
| אכמ"ל             | this is not the place to elaborate | **no hay necesidad de elaborar aquí**           | C ch.35, for the spelled-out ואין זה מקום להאריך בו                                                                                                  | OFFICIAL |                                                                                                                                  |
| דף N              | page N                             | **Página N**                                    | Página 7 (I) · pág. 1 · página 0                                                                                                                     | OFFICIAL | Gematria, Arabic numerals, thousand rule unchanged (דף אלף ז' → Página 1007). Folio side as in English: Página 131b.             |
| אות N             | item N                             | **Ítem N**                                      | Ítem 111 (P) · ítem 10 (C9 P1) · punto 10 · Artículo/Art. 5                                                                                          | OFFICIAL | The most frequent formula. Plural Ítems (P 'Ítems 89-94'). אות = letter → la letra (la letra Hey).                               |
| תשובה N           | answer N                           | **Respuesta N**                                 | 0                                                                                                                                                    | PROPOSED | Formed like BB's capitalized labels Parte / Capítulo / Página / Ítem.                                                            |
| שאלה N            | question N                         | **Pregunta N**                                  | 0                                                                                                                                                    | PROPOSED | As Respuesta.                                                                                                                    |
| חלק N             | Part N                             | **Parte N**                                     | Parte 9 (C) · parte 1 (P)                                                                                                                            | OFFICIAL |                                                                                                                                  |
| פרק N             | chapter N                          | **Capítulo N**                                  | 2 (I1 C1)                                                                                                                                            | OFFICIAL | Also abbreviated: פ"ו → Capítulo 6 (e.g. חלק ד' פ"ו אות ג' → Parte 4, Capítulo 6, Ítem 3). פרקין (body joints) → articulaciones. |
| שער N (Etz Chaim) | Gate N                             | **Shaar N**                                     | I §150 '(Shaar 48:83)'                                                                                                                               | OFFICIAL |                                                                                                                                  |
| כנ"ל / הנ"ל       | as mentioned above                 | **mencionado anteriormente / antes mencionado** | mencionado anteriormente 8 · antes mencionado 5                                                                                                      | OFFICIAL | Not locked — either BB form.                                                                                                     |
| עי' / עיין        | see                                | **ver**                                         | ver 5 · véase 1                                                                                                                                      | OFFICIAL |                                                                                                                                  |
| וכו'              | etc.                               | **etc.**                                        | 36                                                                                                                                                   | OFFICIAL |                                                                                                                                  |
| inline (ב)        | (2)                                | **(2)**                                         | BB Spanish drops the markers (C)                                                                                                                     | PROPOSED | Keep them, gematria → Arabic numerals, exactly as the English run.                                                               |

### 2.10 Letters, vowel points, numerology (19 rows)

| Hebrew                                 | English canon              | Español                                                                    | Evidence (I / P / C)                   | Status   | Note                                          |
| -------------------------------------- | -------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | -------- | --------------------------------------------- |
| י' / יו"ד                              | Yod                        | **Yod**                                                                    | 25                                     | OFFICIAL |                                               |
| ה' (letter)                            | Hey                        | **Hey**                                                                    | 62                                     | OFFICIAL |                                               |
| ו' / וי"ו                              | Vav                        | **Vav**                                                                    | 25                                     | OFFICIAL |                                               |
| א' / אל"ף                              | Aleph                      | **Álef**                                                                   | 7                                      | OFFICIAL |                                               |
| ב'                                     | Bet                        | **Bet**                                                                    | 5                                      | OFFICIAL |                                               |
| ג'                                     | Gimel                      | **Guímel**                                                                 | 5                                      | OFFICIAL |                                               |
| ד'                                     | Dalet                      | **Dálet**                                                                  | 2                                      | OFFICIAL |                                               |
| ז'                                     | Zayin                      | **Zain**                                                                   | 2 (P 'Zain Tajtonot')                  | OFFICIAL |                                               |
| ע' / עין                               | Ayin                       | **Ayin**                                                                   | 21 (C, the Eye)                        | OFFICIAL |                                               |
| ח' ט' כ' ל' מ' נ' ס' פ' צ' ק' ר' ש' ת' | Het … Tav                  | **Jet, Tet, Kaf, Lámed, Mem, Nun, Sámej, Pe, Tzadi, Kof, Resh, Shin, Tav** | 0                                      | PROPOSED | Standard Spanish letter names in BB's scheme. |
| חולם                                   | Holam                      | **Jolam**                                                                  | 17                                     | OFFICIAL |                                               |
| שורק / מלאפום                          | Shuruk / Melafum           | **Shuruk / Melafom**                                                       | Shuruk 23 · Melafom 2                  | OFFICIAL |                                               |
| חירק                                   | Hirik                      | **Jirik**                                                                  | 10                                     | OFFICIAL |                                               |
| קמץ, פתח                               | Kamatz, Patach             | **Kamatz, Pataj**                                                          | 8 · 9                                  | OFFICIAL |                                               |
| צירי, סגול, שבא, קבוץ                  | Tzere, Segol, Shva, Kubutz | **Tzeré, Segol, Shvá, Kubutz**                                             | 1 each (C ch.47)                       | OFFICIAL |                                               |
| ניקוד                                  | Nikud                      | **Nikud**                                                                  | Nikud (puntuación) 1 (C)               | OFFICIAL |                                               |
| גימטריא                                | Gematria                   | **Guematria**                                                              | Guematria 5 · Guematría 2 · Gematria 2 | OFFICIAL |                                               |
| עם הכולל / ע"ה                         | with the kollel            | **con el Kolel**                                                           | Kolel (totalidad) 3 (C)                | OFFICIAL |                                               |
| אהי"ה                                  | EKYE                       | **Ekie**                                                                   | 6 (C)                                  | OFFICIAL |                                               |

## 3. Traps

### 3.1 English-run calls that do NOT carry over

The English canon is right for English. BB's Spanish decided differently, and
Spanish follows BB:

| Hebrew            | English run                 | Spanish (BB)                      | count                                                        |
| ----------------- | --------------------------- | --------------------------------- | ------------------------------------------------------------ |
| generic `בחינת X` | the discernment of X        | **la fase de X**                  | fase de 162 : discernimiento de 12                           |
| `קטנות` / `גדלות` | Katnut / Gadlut             | **pequeñez / grandeza**           | 26 : 3 and 42 : 7                                            |
| `אחורים`, `פנים`  | posterior, anterior         | **Ajoraim, Panim**                | 41 : 27 and 65 : ~35                                         |
| `פב"פ` / `אב"א`   | face to face / back to back | **Panim be Panim / Ajor be Ajor** | 14 : 3 and 8 : 4 (BB's Spanish words appear only as glosses) |
| `קליפות`          | shells                      | **Klipot**                        | 24 : 12                                                      |
| `יניקה`           | nursing                     | **Yeniká**                        | 9 : 1 (gloss)                                                |
| `טעמים`           | Taamim [tastes]             | **Teamim** (sabores)              | 26 : 20                                                      |
| `עצמות`           | self                        | **esencia**                       | Su Esencia 13 : 0                                            |
| `ירכין`           | legs                        | **Yerejaim** (muslos)             | 2                                                            |
| glosses           | `[head]`                    | **(cabeza)**                      | () 149 : [] 18                                               |
| `אות N`           | item N                      | **Ítem N** (capitalized label)    | 111 : 10                                                     |
| `דף N`            | page N                      | **Página N** (capitalized label)  | 7 : 0                                                        |

### 3.2 Sense splits and false friends

- **Luz Interior ≠ Luz Interna.** _Luz Interior_ is the commentary, Ohr Pnimi
  (8). _Luz Interna_ is the technical inner light (25). `או"פ` can be either:
  read the sentence. "en la Luz Interior (Ítem 5)" is a citation; "la Luz Interna
  y la Luz Circundante" is the concept.
- **rompimiento ≠ ruptura / brecha.** rompimiento = `שבירה` (19).
  ruptura / brecha = `בקיעה`, the breach of the Parsá (C: "Dos rupturas", "la
  primera brecha").
- **partida ≠ salida.** partida = `הסתלקות` (24); salida = `יציאה` (13).
- **grado ≠ nivel.** grado = `מדרגה` (195); nivel = `קומה` (320).
- **Three "refinements".** refinación = `הזדככות` (31); refinamiento = `זכות`;
  refinado = `זך`.
- **Nekudot vs punto.** Nekudot (TaNTA, the ten dots) vs **punto**: a single
  vowel-point or geometric point (el punto de Jolam, el punto de este mundo).
  BB's Intro also uses _punto_ for "item" (10×) — don't: items are **Ítem**.
- **Otiot vs letras.** Otiot = the TaNTA vessels; **letras** = letters of a word
  or name (las veintidós letras, la letra Yod).
- **טעם is also "reason"** → razón ("por dos razones", C). It is not Teamim.
- **Raglaim vs Raglin.** Write the form the Hebrew has: Sium Raglin (17) for
  `סיום רגלין`, Raglaim (22) for `רגלים`.
- **Mojin vs Móaj.** Mojin (106) is the plural light; Móaj (cerebro) is a
  single brain.
- **Sabiduría is not Jojmá.** _Sabiduría_ only for `חכמת הקבלה` (la Sabiduría
  de la Cabalá) and the gloss "Luz de Jojmá (Luz de Sabiduría)". The Sefirá is
  always Jojmá.
- **הרב is the ARI** → el ARI (13). Never "el Rav": the Intro's single "el Rav"
  is Rabí Jaim Vital.
- **"haya" is not Jayá.** haya is the Spanish verb ("que haya Luz").
- **Pe is two words.** Pe (boca) is the part of a Partzuf; Pe is also the letter
  פ. Ayin is both the Eye (עין, C 21) and the letter.
- **Two-sense abbreviations — read the clause:**
  - `ע"ש`: "ver allí", or `על שם` → "recibe el nombre de" (C ch.49).
  - `ה"ר`: la primera Hey, or `ה' ראשונות` → las cinco primeras.
  - `ה"ס`: es el secreto de, or `ה' ספירות` → cinco Sefirot.
  - `ז"א`: ZA, or `זאת אומרת` → es decir.
  - `א"א`: AA, or `אי אפשר` → es imposible.
  - `אות`: Ítem, or la letra.
  - `תשובה`: Respuesta N, or arrepentimiento.

### 3.3 Where BB's Spanish is inconsistent, and what I ruled

| point                       | BB forms (count)                                                                                | ruled                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| plural of Luz               | Luces 116 / luces 48                                                                            | **Luces**                                |
| vocalized acronyms          | GaR 60 / GAR 30 · ZaT 63 / ZAT 11 · VaK 33 / VAK 21 · ZoN 126 / ZON 24 · MaN 57 / MAN 8         | **GaR, ZaT, VaK, ZoN, MaN**              |
| Níkvey / Nikvey             | 46 / 15                                                                                         | **Níkvey**                               |
| Jazé / Jaze                 | 79 / 1                                                                                          | **Jazé**                                 |
| Dáat / Daat                 | 42 / 2                                                                                          | **Dáat**                                 |
| Luz Retornante / retornante | 47 / 2                                                                                          | **Luz Retornante**                       |
| Luz Directa / directa       | 3 / 2                                                                                           | **Luz Directa**                          |
| item word                   | Ítem 111 / ítem 10 / punto 10 / Artículo 5                                                      | **Ítem**                                 |
| TaNTA                       | Teamim 26 / sabores 20 · Taguín 9 / coronas 6 · Otiot 26 / letras ~10 · Nekudot 87 / puntos (C) | **Teamim, Nekudot, Taguín, Otiot**       |
| anterior / posterior        | Panim 65, Ajoraim 41, Ajor 28 / anterior, posterior ~35 + 27 (C)                                | **Panim, Ajoraim, Ajor**                 |
| Katnut / Gadlut             | pequeñez 26 / Katnut 3 · grandeza 42 / Gadlut 7                                                 | **pequeñez, grandeza**                   |
| shells                      | Klipot + Klipá 24 / cáscaras 12                                                                 | **Klipot, Klipá**                        |
| clothing                    | revestidura 29 / vestidura 4 / vestimenta 6 / revestimiento 6                                   | **revestidura**                          |
| breaking                    | rompimiento 19 / ruptura 2                                                                      | **rompimiento**                          |
| הזדככות                     | refinación 31 / refinamiento 2                                                                  | **refinación**                           |
| תבונה                       | Tvuná 2 (C) / Tevuná 1 (P)                                                                      | **Tevuná** — majority overridden, see §5 |
| מיין נוקבין                 | Mein 2 / Mayin 1 / Meyin 1                                                                      | **Mein Nukvin**                          |
| סבה ומסובב                  | causa y efecto 2 / causa y consecuencia 2                                                       | **causa y efecto** (tie)                 |
| עץ חיים                     | Árbol de Vida 5 / Árbol de la Vida 4 / Etz Jaim 3                                               | **el Árbol de Vida**                     |
| Zóhar / Zohar               | 20 / 3 · de El Zóhar 6 / del Zóhar 2                                                            | **El Zóhar, de El Zóhar**                |
| Galgalta ועינים             | ve 4 / y 3 / comma 3                                                                            | **Galgalta ve Einaim**                   |
| או"א עילאין                 | AVI Superior 2 / AVI superiores 1                                                               | **AVI Superior**                         |
| Rabí / Rabi · ARI / Arí     | 42 / 2 · 14 / 5                                                                                 | **Rabí · el ARI**                        |
| quotes                      | «» 706 / “” 54                                                                                  | **«» outer, “” inner**                   |
| glosses                     | () 149 / [] 18                                                                                  | **()**                                   |
| Emanador · Su Esencia       | 16 / 3 · 8 / 5                                                                                  | **el Emanador · Su Esencia**             |
| Guematria                   | Guematria 5 / Guematría 2 / Gematria 2                                                          | **Guematria**                            |
| "Superior" mid-sentence     | C capitalizes at random                                                                         | **lower-case outside fixed names**       |

### 3.4 Never write (the `banned` list in `terms-es.json`)

Every pattern below occurs **0** times in I + P + C, against a counted
majority. The table names the right form for each:

- **English-style spellings:** Keter, Hochma / Chochma / Jojma, Bina,
  Hesed / Jesed, Gevura, Tiferet / Tifferet, Netzah / Netzaj, Malchut, Sefira,
  sefirot (lower-case), Hasadim, Mochin, Hotem, Peh, Toch, Chazeh, Parsa, Atik,
  Beria / Yetzira / Asiya / Asiyá, Abba, BAN, Einayim, Nikvei, Nefesh, Ruach,
  Neshama, Yechida, Tvuna / Tevuna (unaccented), Shimón, Partzufin, Yeshsut.
- **English acronyms:** AHP, HGT, NHY, NHYM, KHB, KHBD, HBD.
- **Transliterations BB never uses:** Masaj / Masach, Behiná / Bejiná,
  Reshimo, Ohr.
- **Translations BB never uses:** voluntad de recibir / otorgar, diferencia de
  forma, igualdad de forma, Luz Reflejada / Envolvente.
- **Other spellings:** Kelipot, Cábala / Kabbalah.

Not banned, because BB has a handful of real uses, but **don't write them**:

- Kli (27, the Pticha's alternation) — write vasija.
- Zivug / Tzimtzum / Hitlabshut / Or Jozer — BB uses them only as parenthetical
  glosses.
- GAR / ZAT / VAK / ZON / MAN — C's minority forms.
- Katnut / Gadlut — the minority forms.
- "parte posterior" — C's minority form.
- Tvuná — C's minority form.
- "el Rav" for הרב — 1 official use, but that one is the Intro's Rabí Jaim
  Vital. The `required` entry הרב → ARI enforces the right form instead.

## 4. Mismatches with the repo (flagged, not changed — the repo is read-only for this task)

These Spanish strings already exist in the repo and disagree with BB's
counted usage. An orchestrator should decide whether to align them, in a
separate change:

| where                                                                     | repo says                         | BB says                                                                                                                                    |
| ------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `i18n/locales/es.json`, 20 lines (tab label, pane names, status messages) | Observación Interior              | **Histaklut Pnimit** (I ×2; BB never translates it). Options: rename the UI, or keep it and accept that the text says Histaklut Pnimit.    |
| `i18n/locales/es.json`, 14 lines ("El texto del Ari", descriptions)       | Ari (unaccented)                  | **el ARI** (ARI 14 : Arí 5 : Ari 0)                                                                                                        |
| `i18n/locales/es.json` line 52                                            | (Ohr Pnimi)                       | **(Or Pnimí)** — BB's form of the name (I §156)                                                                                            |
| `content/toc.volumes.json`, part-03 title                                 | Luz directa y luz reflejada       | **Luz Directa y Luz Retornante** (Luz Reflejada 0, Luz Retornante 47)                                                                      |
| same file, part-13 title                                                  | …de Arij Anpin                    | **Árij Anpin** (2 : 0)                                                                                                                     |
| same file, part-16 title                                                  | …Beriá, Yetzirá y Asiyá           | **Asiá** (59 : 0)                                                                                                                          |
| same file, part-14 title                                                  | Los Mojin de Gadlut de Zeir Anpin | **Los Mojin de grandeza** (42 : 7)                                                                                                         |
| same file, 15 section titles                                              | Respuestas sobre los temas        | BB says "…sobre todas las palabras y **asuntos**" (I §156) — minor                                                                         |
| same file, part-05 title                                                  | …Matei ve Lo Matei                | Unattested in BB Spanish (C ch.26 says "el presente y el no presente" once); the English canon writes Mati / Lo Mati. Orchestrator's call. |

The UI's "Luz Interior" **agrees** with BB. "Kabbalah" in the UI appears only
in site names (Kabbalah Media, Kabbalah.info), which is fine.

## 5. Decisions I am least sure of

1. **Mixed-case acronyms** (GaR, ZaT, VaK, ZoN, MaN). The majority is clear
   (60 : 30, 63 : 11, 33 : 21, 126 : 24, 57 : 8), but all of it comes from the
   Pticha. The TES corpus itself (C) writes the capitals, and the part-6 pane
   will show the capitals beside our notes.
2. **Ítem / Página capitalized.** BB capitalizes these labels (111 : 10 and
   7 : 0) the way it capitalizes Parte and Capítulo. RAE orthography would
   lower-case them. The gate patterns are case-sensitive, so this is a real
   choice.
3. **Tevuná over Tvuná** (1 : 2). This breaks the majority rule on the grounds
   that C copies BB English, against BB's own sheva-as-e scheme and the English
   canon's ban on Tvuna.
4. **Histaklut Pnimit**, against the shipped UI's "Observación Interior". The
   BB evidence is only 2 occurrences.
5. **TaNTA transliterated** (Teamim / Taguín / Otiot). The Pticha says 26 / 9 /
   26 against C's sabores / coronas / letras (20 / 6 / ~10). These are near
   ties if only the technical sense is counted.
6. **Panim / Ajoraim and Panim be Panim transliterated**, against C's anterior /
   posterior and the English run's plain-language rule.
7. **pequeñez / grandeza translated.** The English run and C transliterate.
8. **fase for generic בחינה** (162 : 12). This reverses the English run's
   "discernment", which was argued over three rounds.
9. **el Árbol de Vida** (5) over Árbol de la Vida (4) and Etz Jaim (3). A coin
   flip; most readers know the book as _Etz Jaim_.
10. **The PROPOSED citation formulae.** BB never renders ד"ה, עש"ה or ע"ש — it
    deletes them — so "el pasaje que comienza", "estúdialo bien allí" and "ver
    allí" are my wording. For אכמ"ל I kept BB's one calque, "no hay necesidad
    de elaborar aquí".

**Orchestrator decisions outside terminology:**

- Whether to italicize transliterations as BB does (§1.8). I ruled no.
- Whether to align the repo strings in §4.

## 6. How to re-count

```sh
cd <scratchpad>/terms/es/work
printf 'label\t<python regex>\n' | python3 -I cnt.py      # I / P / C / total
python3 -I gen.py                                       # rebuilds terms-es.md/json and re-validates
```

`gen.py` refuses to build in three cases:

- a banned pattern has any official hit;
- a banned pattern matches a binding form;
- a glossary id is missing.
