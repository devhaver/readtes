# Reader: switch languages, not editions

Design spec — 2026-08-11.

## Problem

Each reader pane currently exposes an **edition** picker: "Jerusalem
1956", "Bnei Baruch (KabbalahMedia)", "English (AI translation)",
"Sefaria Community Translation". This asks the reader to make an
editorial choice they have no basis for making, and it varies chapter to
chapter — part 5 offers BB English, part 7 offers only the AI
translation, part 1 offers a mix within the same part.

Availability matters more than provenance. A reader wants _this chapter,
in this language_. Which edition supplies it is our problem, not theirs.

## Decision

The per-pane switcher stays. Its contents change from editions to
**languages**. Within a language, the best available edition is resolved
automatically by a fixed priority chain. Provenance is surfaced as a tag
on the text, never as a control, and never in the URL.

Restated:

- Reader picks a **language** per pane.
- App picks the **edition** silently.
- App **labels** the result when it isn't the reference text.

## Phasing

| Phase                 | Scope                                                                                 | When                      |
| --------------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| **1 — this spec**     | Switcher + resolution restructure, against the content that exists today (`he`, `en`) | now                       |
| **2 — separate spec** | Populate the remaining target languages                                               | immediately after phase 1 |

Phase 1 is written to be generic over language, so phase 2 adds content
and i18n locale entries without touching reader code.

Target language set for phase 2: Hebrew, English, Bulgarian, German,
Russian, French, Spanish, Turkish, Hindi.

## Resolution rule

Per chapter, per layer, per language — resolve the first available:

| Language           | Chain                                      |
| ------------------ | ------------------------------------------ |
| `he`               | `he-jerusalem-1956` → `he-bb`              |
| `en`               | `en-bb` → `en-sefaria-community` → `en-ai` |
| any other `<lang>` | `<lang>-bb` → `<lang>-ai`                  |

Generic form: **official Bnei Baruch translation, else a human
translation, else the AI one; in Hebrew, the original always wins.**

Hebrew resolves to `he-jerusalem-1956` in practice — it covers all 5,148
chapters, so `he-bb`'s 2 chapters never surface. It stays in the chain
rather than being special-cased, so the rule reads the same in every
language.

### Which languages a pane offers

The distinct languages among that chapter+layer's `availableVersions`.
A pane never offers a language it has no text for. Chapters where a
layer is absent entirely keep the existing `LayerAbsenceNote` treatment.

### Default and persistence

Unchanged in shape from today, with language substituted for version id:

1. Persisted per-pane language, if available for this chapter+layer.
2. Else the UI locale's language, if available.
3. Else English, else Hebrew, else first available.

Persistence stays per-pane (not per-chapter) in `localStorage`, and
stays gated behind `hydrated` so the first client render matches the
prerendered HTML.

## Provenance tag

Shown in the pane header where the edition `<select>` sits today.

| Condition                                  | Tag                                            |
| ------------------------------------------ | ---------------------------------------------- |
| language is `he`                           | none — it is the original                      |
| `version.source === "kabbalahmedia"`       | none — the reference translation               |
| `version.source === "ai"`                  | "AI translated" (existing key, existing style) |
| `version.source === "sefaria"`, non-Hebrew | "Sefaria translation" (new)                    |

The "AI translated" badge is a project requirement, not a nicety — it is
the single place AI attribution is mandatory.

## URLs

**No change required.** Routes are already `/read/[part]/[chapter]` with
only the `@nuxtjs/i18n` locale prefix. No version segment, no
`?version=` query exists today. Per-pane language is a UI preference and
stays out of the URL, which means the prerendered route set is
unaffected.

## Files touched

| File                                            | Change                                                                                                                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/utils/readerVersions.ts`                   | `resolveDefaultVersion` → `resolveVersionForLanguage(available, language, versionsById)` + `languagesAvailable(available, versionsById)`. Chain table above replaces `ENGLISH_PRIORITY_ORDER`. |
| `app/composables/useReaderVersions.ts`          | → `useReaderLanguages`. Same provide/persist/hydrate shape; stores a language code; exposes resolved version ids.                                                                              |
| `app/components/reader/ReaderVersionHeader.vue` | → `ReaderPaneHeader.vue`. `<select>` lists languages; badge per the provenance table.                                                                                                          |
| `app/components/reader/ReaderPane.vue`          | Prop rename `versionOptions` → `languageOptions`; passes through to the header.                                                                                                                |
| `app/components/reader/StudyStream.vue`         | Same prop/event rename — it renders the header inline for source + commentary.                                                                                                                 |
| `app/pages/read/[part]/[chapter].vue`           | `versionOptions` → `languageOptions`; the Inner Observation version `ref` + `watch` becomes a language ref; `switchCommentaryToHebrew` sets language `he`.                                     |
| `i18n/locales/{en,he}.json`                     | `reader.versionLabel` "Edition" → `reader.languageLabel` "Language"; add native language names; add `reader.sefariaTranslated`.                                                                |
| `tests/unit/reader-versions.spec.ts`            | Rewrite against the language chain.                                                                                                                                                            |

`resolveMissingAnchorNotice` and its "Switch to Hebrew" affordance keep
working — it already targets `HEBREW_VERSION_ID` and now sets a language
instead.

`OriginalStream.vue` needs no functional change: it has never had a
version selector (it renders whatever the reader's standing selection
resolves to), only a stale header comment referencing
`useReaderVersions` to update.

## Explicitly not in this work

- **A second Source pane.** Comparing the Ari's Hebrew side by side with
  its translation is a pane-count feature, not a language-switcher one.
- **Generating translations.** ~36,000 chapter translations across the 7
  new languages is phase 2's problem, with its own cost and prerender
  consequences (9 locales × 5,148 chapters ≈ 46,000 routes, against the
  Cloudflare Pages file-count constraint already being worked in issue
  #73).

## Testing

`tests/unit/reader-versions.spec.ts` rewritten to cover: each language's
chain, chain fallthrough when the preferred edition is absent, the
default rule, persisted-language fallback when unavailable for the next
chapter, and the provenance-tag table (including "Hebrew is never
tagged").

Definition of done is the project's own gate: `task check` — lint,
format:check, typecheck, validate:content, test, generate.

## Accepted trade-off

Hebrew collapses to a single "Hebrew" with no way to reach `he-bb`'s 2
chapters. Accepted — that is the simplification being asked for.
