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

| Hebrew           | Bulgarian                                 | Status   | Evidence / rule                                                |
| ---------------- | ----------------------------------------- | -------- | -------------------------------------------------------------- |
| אור              | **светлина**                              | OFFICIAL | Official Bulgarian library usage.                              |
| אור עליון        | **Висшата светлина**                      | OFFICIAL | Attested as `висша светлина`; capitalize the fixed name.       |
| כלי / כלים       | **съсъд / съсъди**                        | OFFICIAL | _Предисловие към ТЕС_.                                         |
| מסך              | **екран**                                 | OFFICIAL | Official texts: `екран на своя съсъд`.                         |
| צמצום            | **съкращение**; named **Цимцум Алеф/Бет** | OFFICIAL | `Цимцум Алеф (Първото Съкращение)`.                            |
| בחינה / בחינות   | **бхина / бхинот**                        | OFFICIAL | `бхина далет`; retain Hebrew phase names.                      |
| בחי"א/ב/ג/ד      | **бхина алеф/бет/гимел/далет**            | OFFICIAL | Dalet attested; remaining letter names follow the same scheme. |
| מלכות            | **Малхут**                                | OFFICIAL | Official Bulgarian library usage.                              |
| א"ס / אין סוף    | **Безкрайността**                         | OFFICIAL | `света на Безкрайността`.                                      |
| רצון לקבל        | **желание за получаване**                 | OFFICIAL | Repeated throughout official Bulgarian texts.                  |
| רצון להשפיע      | **желание за отдаване**                   | OFFICIAL | Official Bulgarian library usage.                              |
| השתוות הצורה     | **подобие по форма**                      | OFFICIAL | Attested in _Предговор към Книгата Зоар_.                      |
| שינוי הצורה      | **различие по форма**                     | OFFICIAL | Use the parallel established construction.                     |
| דבקות            | **сливане**                               | OFFICIAL | Official text: `пълно сливане с Твореца`.                      |
| מאציל            | **Творецът**                              | OFFICIAL | Do not calque Russian `Излъчващият`.                           |
| נאצל             | **творението**                            | OFFICIAL | Use `творението` where the Hebrew denotes the emanated being.  |
| אור חוזר / או"ח  | **отразена светлина**                     | OFFICIAL | Official Sulam preface.                                        |
| זווג דהכאה       | **зивуг де-акаа (ударно съединяване)**    | PROPOSED | Transliteration plus one first-use gloss.                      |
| עביות            | **авиют (грубост)**                       | PROPOSED | Transliteration plus first-use gloss.                          |
| זכות             | **чистота**                               | PROPOSED | Conceptual opposite of `авиют`.                                |
| קו               | **линия**                                 | OFFICIAL | Geometric term; translate.                                     |
| עגולים           | **кръгове**                               | PROPOSED | Translate the geometric term.                                  |
| יושר             | **праволинейност**                        | PROPOSED | Avoid `праведност`, which changes the sense.                   |
| התפשטות          | **разпространение**                       | OFFICIAL | Standard form in official Bulgarian exposition.                |
| הסתלקות          | **оттегляне**                             | PROPOSED | Use for departure of light.                                    |
| סבה ומסובב       | **причина и следствие**                   | OFFICIAL | Ordinary established Bulgarian phrase.                         |
| הסתכלות פנימית   | **Вътрешно съзерцание**                   | PROPOSED | Fixed section title.                                           |
| אור פנימי / או"פ | **Вътрешна светлина**                     | OFFICIAL | Translate the named light.                                     |

## Sources

- https://www.kabbalah.info/bg/библиотека/баал-асулам/предисловие-към-тес
- https://www.kabbalah.info/bg/библиотека/баал-асулам/предговор-към-книгата-зоар
- https://www.kabbalah.info/bg/библиотека/баал-асулам/предговор-към-коментарите-„сулам”
