# Bulgarian (`bg`) binding terminology — initial TES core

This table governs the first Bulgarian TES translation batches. It is based on
Bulgarian texts in Bnei Baruch's official `kabbalah.info/bg` library, especially
_Предговор към Книгата Зоар_, _Предговор към коментарите „Сулам”_, and
_Предисловие към ТЕС_. KabbalahMedia's TES collection contains no Bulgarian
document (verified by `pnpm import:kabbalahmedia --part 1 --dry-run`).

`OFFICIAL` means the Bulgarian form occurs in that library. `PROPOSED` means the
library material inspected so far is silent; use the stated form consistently
and flag it for native review. Expand this table before translating vocabulary
it does not cover. Never infer Bulgarian from Russian merely because both use
Cyrillic.

## Style

- Bulgarian quotation marks: `„…“`; nested quotations: `‘…’`.
- Preserve Hebrew technical names in the spelling below; translate ordinary
  conceptual nouns.
- References: `част N`, `глава N`, `т. N`; use `пасажът, започващ с „…“` for
  `ד"ה` and `виж добре там` for `עש"ה`.
- Capitalize fixed spiritual names (`Висшата светлина`, `Безкрайността`) and
  lowercase ordinary concepts (`светлина`, `екран`, `съсъд`).

## Binding core

| Hebrew           | Bulgarian                                 | Status   | Evidence / rule                                                            |
| ---------------- | ----------------------------------------- | -------- | -------------------------------------------------------------------------- |
| אור              | **светлина**                              | OFFICIAL | Official Bulgarian library usage.                                          |
| אור עליון        | **Висшата светлина**                      | OFFICIAL | Attested as `висша светлина`; capitalize the fixed name.                   |
| כלי / כלים       | **съсъд / съсъди**                        | OFFICIAL | _Предисловие към ТЕС_.                                                     |
| מסך              | **екран**                                 | OFFICIAL | Official texts: `екран на своя съсъд`.                                     |
| צמצום            | **съкращение**; named **Цимцум Алеф/Бет** | OFFICIAL | `Цимцум Алеф (Първото Съкращение)`.                                        |
| בחינה / בחינות   | **бхина / бхинот**                        | OFFICIAL | `бхина далет`; retain Hebrew phase names.                                  |
| בחי"א/ב/ג/ד      | **бхина алеф/бет/гимел/далет**            | OFFICIAL | Dalet attested; remaining letter names follow the same scheme.             |
| מלכות            | **Малхут**                                | OFFICIAL | Official Bulgarian library usage.                                          |
| א"ס / אין סוף    | **Безкрайността**                         | OFFICIAL | `света на Безкрайността`.                                                  |
| רצון לקבל        | **желание за получаване**                 | OFFICIAL | Repeated throughout official Bulgarian texts.                              |
| רצון להשפיע      | **желание за отдаване**                   | OFFICIAL | Official Bulgarian library usage.                                          |
| השתוות הצורה     | **подобие по форма**                      | OFFICIAL | Attested in _Предговор към Книгата Зоар_.                                  |
| שינוי הצורה      | **различие по форма**                     | OFFICIAL | Use the parallel established construction.                                 |
| דבקות            | **сливане**                               | OFFICIAL | Official text: `пълно сливане с Твореца`.                                  |
| מאציל            | **Творецът**                              | OFFICIAL | Do not calque Russian `Излъчващият`.                                       |
| נאצל             | **творението**                            | OFFICIAL | Use `творението` where the Hebrew denotes the emanated being.              |
| אור חוזר / או"ח  | **отразена светлина**                     | OFFICIAL | Official Sulam preface.                                                    |
| אור מקיף / או"מ  | **обкръжаваща светлина**                  | OFFICIAL | Official Bulgarian BB usage; also glossed there as `ор макиф`.             |
| זווג דהכאה       | **зивуг де-акаа (ударно съединяване)**    | PROPOSED | Transliteration plus one first-use gloss.                                  |
| עביות            | **авиют (грубост)**                       | PROPOSED | Transliteration plus first-use gloss.                                      |
| זכות             | **чистота**                               | PROPOSED | Conceptual opposite of `авиют`.                                            |
| הזדככות          | **изтъняване**                            | PROPOSED | Technical reduction of the screen's `авиют`; avoid ordinary `пречистване`. |
| קו               | **линия**                                 | OFFICIAL | Geometric term; translate.                                                 |
| עגולים           | **кръгове**                               | PROPOSED | Translate the geometric term.                                              |
| יושר             | **праволинейност**                        | PROPOSED | Avoid `праведност`, which changes the sense.                               |
| התפשטות          | **разпространение**                       | OFFICIAL | Standard form in official Bulgarian exposition.                            |
| הסתלקות          | **оттегляне**                             | PROPOSED | Use for departure of light.                                                |
| סבה ומסובב       | **причина и следствие**                   | OFFICIAL | Ordinary established Bulgarian phrase.                                     |
| הסתכלות פנימית   | **Вътрешно съзерцание**                   | PROPOSED | Fixed section title.                                                       |
| אור פנימי / או"פ | **Вътрешна светлина**                     | OFFICIAL | Translate the named light.                                                 |

## Part 2 terminology decisions

These forms were settled while translating Part 2's terminology questions and
answers. They are `PROPOSED` unless the core table already marks the concept as
official, and should receive native Bulgarian editorial review before a human
edition replaces `bg-ai`.

| Hebrew                 | Bulgarian                            | Rule                                                                   |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| אדם קדמון              | **Адам Кадмон**                      | Preserve the established proper name.                                  |
| אור ישר                | **пряка светлина**                   | Pair with `отразена светлина`; avoid `директна`.                       |
| גוף / ראש              | **Гуф / Рош**                        | Preserve the Partzuf divisions as technical names.                     |
| זעיר אנפין / ז"א       | **Зеир Анпин / ЗА**                  | Spell out on first use where context requires it.                      |
| ג"ר / ז"ת              | **ГАР / ЗАТ**                        | Expand ZAT as `седем долни сфирот` when defining it.                   |
| נפש רוח נשמה חיה יחידה | **нефеш, руах, нешама, хая, ехида**  | Preserve the five light names; lowercase in prose.                     |
| נרנח"י                 | **НАРАНХАЙ**                         | Bulgarian acronym formed from the five settled names.                  |
| חלון                   | **прозорец**                         | Technical opening through which light enters.                          |
| צנור                   | **тръбопровод**                      | Use for the bounded vessel of straightness.                            |
| גשמיות / רוחניות       | **материалност / духовност**         | Abstract states, not `материя / дух`.                                  |
| חיצוניות / פנימיות     | **външност / вътрешност**            | Fixed paired vessel properties.                                        |
| סיום / סוף             | **сиюм / соф**                       | Preserve the named technical states; explain as ending in definitions. |
| קומה זקופה             | **изправен ръст**                    | A Partzuf whose Rosh lights clothe its Rosh vessels.                   |
| דרך העברה / עובר       | **мимоходом / преминаваща светлина** | Preserve the distinction between the mode and the light.               |
| קצבה                   | **отмерване**                        | The reflected light sets the measure of received upper light.          |
| מסבב / סובב            | **пораждащ / причина**               | Keep the active cause distinct from the cause itself.                  |
| תכלית כולם             | **завършекът на всички**             | The final phase for whose correction all degrees appear.               |
| רשימו / רשימות         | **решимо / решимот**                 | Preserve the established technical name and Hebrew plural.             |
| אור חסדים              | **светлина хасадим**                 | Preserve `хасадим` as the name of the light; lowercase in prose.       |
| כח"ב / חג"ת / נה"י     | **КХБ / ХГТ / НХЙ**                  | Bulgarian Cyrillic acronyms for the corresponding groups of сфирот.    |
| נהי"מ                  | **НХЙМ**                             | Add Малхут to НХЙ when the Hebrew acronym includes it.                 |

## Part 3 terminology decisions

| Hebrew                  | Bulgarian                       | Rule                                                                                   |
| ----------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| אצילות בריאה יצירה עשיה | **Ацилут, Брия, Ецира, Асия**   | Preserve the established names of the four worlds.                                     |
| גדלות / קטנות           | **гадлут / катнут**             | Preserve the named states; lowercase in prose.                                         |
| נוקבא                   | **Нуква**                       | Preserve the technical name; capitalize it as a named Partzuf aspect.                  |
| נקב צר                  | **тесен отвор**                 | Pair with `прозорец`; do not transliterate this descriptive opening.                   |
| הרחקה / קירוב           | **отдалечаване / приближаване** | Use for diminished or renewed proximity to the light of Hochma.                        |
| דינים                   | **съждения**                    | Spiritual judgments; do not confuse with `כלים` (**съсъди**).                          |
| פה דראש                 | **Пе де-Рош**                   | Preserve the named mouth of the Rosh; capitalize the compound name.                    |
| סיום רגלים              | **Сиюм Раглаим**                | Preserve the named ending of the feet.                                                 |
| עיבור / יניקה           | **ибур / еника**                | Preserve the states; gloss first use as `зачатие / кърмене`.                           |
| אריך אנפין / א"א        | **Арих Анпин / АА**             | Spell out when context requires; retain the established acronym.                       |
| גלגלתא                  | **Галгалта**                    | Preserve the proper name of the first Partzuf of Adam Kadmon.                          |
| ע"ב ס"ג מ"ה ב"ן         | **АБ САГ МА БОН**               | Use the conventional Cyrillic spellings of the four Partzufim of AK.                   |
| הוי"ה                   | **АВАЯ**                        | Use the conventional Bulgarian rendering of the four-letter name.                      |
| אמא עילאה / אמא תתאה    | **Висшата Има / Долната Има**   | Preserve `Има`; translate the relational qualifier and capitalize it.                  |
| מסך סתום                | **запушен екран**               | A screen that blocks the higher light from appearing below it.                         |
| אופנים                  | **офаним**                      | Preserve the named external vessels of Assiya; lowercase in prose.                     |
| עקודים                  | **Акудим**                      | Preserve the technical name; gloss `акудим` as `свързани` where the source defines it. |
| אור העין                | **светлината на Айн**           | Preserve `Айн` as the technical name and gloss it as `окото` on first use.             |
| הסתכלות א׳ / ב׳         | **първо / второ съзерцание**    | Use `съзерцание` consistently for the paired technical operations.                     |
| פרסא                    | **Парса**                       | Preserve the technical name for the boundary established by the second restriction.    |
| רוחין / מלאכים          | **рухин / малахим**             | Preserve the named spirits and angels of Yetzira; lowercase in prose.                  |
| פנים / אחור             | **лице / гръб**                 | Vessel aspects; use **лицева / обратна страна** when naming the pair.                  |
| לבוש / היכל             | **одеяние / чертог**            | The surrounding vessels for the lights Haya and Yechida.                               |
| תוך / טבור / חזה        | **Тох / Табур / Хазе**          | Preserve the named Partzuf regions and boundaries.                                     |
| שנגל״ה                  | **ШНГЛХ**                       | Acronym for корен, душа, тяло, одеяние, чертог.                                        |
| אור הסתלקות             | **светлина на оттеглянето**     | The reflected light rejected by phase four and returning to its place.                 |
| אור המתמעט              | **намаляваща светлина**         | Direct light whose value diminishes as it clothes from the screen downward.            |
| אור של תולדה            | **производна светлина**         | Light derived below the screen; keep distinct from `пряка светлина`.                   |
| אותיות נפרדות / מחוברות | **разделени / свързани букви**  | Translate the paired states; their distinction follows авиют and изтъняване.           |
| עצמות האור              | **същност на светлината**       | The ten Sefirot of Rosh as the light itself, contrasted with derived light below Peh.  |
| קדש קדשים               | **Светая Светих**               | Fixed Bulgarian biblical expression for the innermost upper hall of Beria.             |
| רביעית דם               | **четвъртина кръв**             | Preserve the source's technical link between `четвъртина` and phase four.              |

## Part 4 terminology decisions

| Hebrew                   | Bulgarian                           | Rule                                                                                         |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| רשימו / רשימות           | **решимо / решимот**                | Continue the Part 2 decision; never replace the technical term with ordinary memory.         |
| אור זך / אור עב          | **чиста светлина / груба светлина** | Preserve the opposition between refinement and coarseness.                                   |
| פנים / אחוריים           | **лице / обратна страна**           | Use for the direction of bestowal; plural `обратни страни` where required.                   |
| רחמים / דין              | **милосърдие / съд**                | Fixed pair; use `свойството съд` where Bulgarian needs to distinguish it from a court.       |
| טעמים נקודות תגין אותיות | **таамим, некудот, тагин, отиот**   | Preserve the four technical names; gloss on first definition as вкусове/точки/коронки/букви. |
| ניצוצין                  | **искри**                           | Reflected-light sparks produced by the striking of differing lights.                         |
| ביטוש                    | **сблъсък**; verb **сблъскват се**  | Use for the mutual striking of inner and surrounding or opposing lights.                     |

## Sources

- https://www.kabbalah.info/bg/библиотека/баал-асулам/предисловие-към-тес
- https://www.kabbalah.info/bg/библиотека/баал-асулам/предговор-към-книгата-зоар
- https://www.kabbalah.info/bg/библиотека/баал-асулам/предговор-към-коментарите-„сулам”
