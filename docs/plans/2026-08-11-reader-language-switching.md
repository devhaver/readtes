# Reader Language Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the reader's per-pane _edition_ picker with a per-pane _language_ picker, resolving the best available edition automatically and surfacing provenance as a label instead of a control.

**Architecture:** A pure priority-chain resolver (`app/utils/readerVersions.ts`) maps `(availableVersionIds, language) → versionId`. The composable formerly known as `useReaderVersions` persists a _language_ per pane instead of a version id, and exposes both the language (for the `<select>`) and the resolved version id (for content lookup). The pane header component renders the language `<select>` plus a provenance badge derived from the resolved version's `source` field.

**Tech Stack:** Nuxt 4, Vue 3 `<script setup>`, TypeScript, Tailwind v4 (design tokens), `@nuxtjs/i18n`, `@vueuse/core` `useLocalStorage`, Vitest + `@nuxt/test-utils` (`nuxt` environment), `mountSuspended`.

**Spec:** `docs/specs/2026-08-11-reader-language-switching.md`

## Global Constraints

- **Arrow functions only** — `const doThing = () => {}`, never `function`.
- **Logical CSS only** — `ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`. Never `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`.
- **Design tokens only, never a literal hex.**
- **pnpm only**, never npm/yarn. Dev server port **6217** (HMR **6218**).
- **No AI attribution** in commits, PRs, issues, or comments. Conventional commit subjects. The one exception: the `en-ai` version **must** stay badged "AI translated" in the UI.
- **Git only when asked.** The commit steps below are written out so the sequence is unambiguous, but per project `CLAUDE.md` do not run them without the user's explicit go-ahead. Otherwise leave changes in the working tree.
- **App code must never `import { ... }` from `~~/shared/types/content`** — type-only imports (`import type`) only, so `zod` never enters the client bundle.
- **Definition of done:** `task check` (lint, format:check, typecheck, validate:content, test, generate) passes.

## File Structure

| File                                                                                      | Responsibility                                                                                                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/utils/readerVersions.ts` (modify)                                                    | Pure resolution: language → version chain → version id; which languages a layer offers; native language names; default language rule. No Vue, no state. |
| `app/composables/useReaderLanguages.ts` (create, replaces `useReaderVersions.ts`)         | Per-pane language state: default rule, `localStorage` persistence, hydration gating. Exposes language + resolved version id per layer.                  |
| `app/components/reader/ReaderPaneHeader.vue` (create, replaces `ReaderVersionHeader.vue`) | Layer title + language `<select>` + provenance badge.                                                                                                   |
| `app/components/reader/ReaderPane.vue` (modify)                                           | Pane chrome; forwards renamed props to the header.                                                                                                      |
| `app/components/reader/StudyStream.vue` (modify)                                          | Renders the same header inline; renamed props/events.                                                                                                   |
| `app/pages/read/[part]/[chapter].vue` (modify)                                            | Wires the composable to the three panes and both stream modes.                                                                                          |
| `i18n/locales/{en,he}.json` (modify)                                                      | `reader.languageLabel`, `reader.sefariaTranslated`.                                                                                                     |
| `tests/unit/reader-languages.spec.ts` (create, replaces `reader-versions.spec.ts`)        | Chain resolution, language listing, default rule, hydration/persistence.                                                                                |
| `tests/unit/reader-pane-header.spec.ts` (create)                                          | Provenance badge rules.                                                                                                                                 |

Native language names live in `readerVersions.ts` as a plain constant, **not** in the i18n catalogs: a native name ("עברית", "English") is the same string regardless of UI locale, so duplicating nine entries per locale file would be pure churn.

---

### Task 1: Language resolution utility

**Files:**

- Modify: `app/utils/readerVersions.ts` (whole-file rewrite)
- Test: `tests/unit/reader-languages.spec.ts` (create)
- Delete: `tests/unit/reader-versions.spec.ts`

**Interfaces:**

- Consumes: `ContentVersion` from `~~/shared/types/content` (type-only).
- Produces:
  - `buildVersionsById(versions: ContentVersion[]): VersionsById` — unchanged, still exported.
  - `versionChainForLanguage(language: string): string[]`
  - `resolveVersionForLanguage(available: string[], language: string, versionsById: VersionsById): string | null`
  - `languagesAvailable(available: string[], versionsById: VersionsById): string[]`
  - `resolveDefaultLanguage(available: string[], uiLocale: string, versionsById: VersionsById): string | null`
  - `nativeLanguageName(language: string): string`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/reader-languages.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ContentVersion } from "~~/shared/types/content";

const versions: ContentVersion[] = [
  {
    id: "he-jerusalem-1956",
    language: "he",
    direction: "rtl",
    title: "ירושלים",
    license: "Public Domain",
    source: "sefaria",
  },
  {
    id: "he-bb",
    language: "he",
    direction: "rtl",
    title: "Bnei Baruch — עברית",
    license: "Used with permission",
    source: "kabbalahmedia",
  },
  {
    id: "en-bb",
    language: "en",
    direction: "ltr",
    title: "Bnei Baruch (KabbalahMedia)",
    license: "Used with permission",
    source: "kabbalahmedia",
  },
  {
    id: "en-sefaria-community",
    language: "en",
    direction: "ltr",
    title: "Sefaria Community Translation",
    license: "CC0",
    source: "sefaria",
  },
  {
    id: "en-ai",
    language: "en",
    direction: "ltr",
    title: "English (AI translation)",
    license: "CC0",
    source: "ai",
    translatedFrom: "he-jerusalem-1956",
  },
  {
    id: "en-curated",
    language: "en",
    direction: "ltr",
    title: "Read TES Curated Summary",
    license: "CC-BY",
    source: "curated",
  },
  {
    id: "ru-bb",
    language: "ru",
    direction: "ltr",
    title: "Bnei Baruch — Русский",
    license: "Used with permission",
    source: "kabbalahmedia",
  },
  {
    id: "ru-ai",
    language: "ru",
    direction: "ltr",
    title: "Русский (AI)",
    license: "CC0",
    source: "ai",
  },
];

const versionsById = buildVersionsById(versions);

describe("resolveVersionForLanguage", () => {
  it("prefers the Jerusalem edition for Hebrew, even when he-bb exists", () => {
    expect(
      resolveVersionForLanguage(
        ["he-bb", "he-jerusalem-1956"],
        "he",
        versionsById,
      ),
    ).toBe("he-jerusalem-1956");
  });

  it("falls through to he-bb when the Jerusalem edition is absent", () => {
    expect(resolveVersionForLanguage(["he-bb"], "he", versionsById)).toBe(
      "he-bb",
    );
  });

  it("prefers en-bb over en-sefaria-community and en-ai", () => {
    expect(
      resolveVersionForLanguage(
        ["en-ai", "en-sefaria-community", "en-bb"],
        "en",
        versionsById,
      ),
    ).toBe("en-bb");
  });

  it("prefers en-sefaria-community over en-ai when en-bb is absent", () => {
    expect(
      resolveVersionForLanguage(
        ["en-ai", "en-sefaria-community"],
        "en",
        versionsById,
      ),
    ).toBe("en-sefaria-community");
  });

  it("falls through to en-ai when it is the only English edition", () => {
    expect(resolveVersionForLanguage(["en-ai"], "en", versionsById)).toBe(
      "en-ai",
    );
  });

  it("uses the generic <lang>-bb then <lang>-ai chain for other languages", () => {
    expect(
      resolveVersionForLanguage(["ru-ai", "ru-bb"], "ru", versionsById),
    ).toBe("ru-bb");
    expect(resolveVersionForLanguage(["ru-ai"], "ru", versionsById)).toBe(
      "ru-ai",
    );
  });

  it("falls back to any version in that language when no chain id matches", () => {
    expect(resolveVersionForLanguage(["en-curated"], "en", versionsById)).toBe(
      "en-curated",
    );
  });

  it("returns null when the language has no version available", () => {
    expect(
      resolveVersionForLanguage(["he-jerusalem-1956"], "en", versionsById),
    ).toBeNull();
    expect(resolveVersionForLanguage([], "en", versionsById)).toBeNull();
  });
});

describe("languagesAvailable", () => {
  it("lists distinct languages with Hebrew first, then English, then the rest alphabetically", () => {
    expect(
      languagesAvailable(
        ["ru-ai", "en-ai", "he-jerusalem-1956", "en-bb"],
        versionsById,
      ),
    ).toEqual(["he", "en", "ru"]);
  });

  it("is stable regardless of the order version ids arrive in", () => {
    expect(languagesAvailable(["en-bb", "he-bb"], versionsById)).toEqual([
      "he",
      "en",
    ]);
    expect(languagesAvailable(["he-bb", "en-bb"], versionsById)).toEqual([
      "he",
      "en",
    ]);
  });

  it("ignores ids with no registry entry", () => {
    expect(languagesAvailable(["nonexistent-id"], versionsById)).toEqual([]);
  });

  it("returns an empty list for no available versions", () => {
    expect(languagesAvailable([], versionsById)).toEqual([]);
  });
});

describe("resolveDefaultLanguage", () => {
  it("picks the UI locale's language when it is available", () => {
    expect(
      resolveDefaultLanguage(
        ["he-jerusalem-1956", "en-bb"],
        "he",
        versionsById,
      ),
    ).toBe("he");
    expect(
      resolveDefaultLanguage(
        ["he-jerusalem-1956", "en-bb"],
        "en",
        versionsById,
      ),
    ).toBe("en");
  });

  it("falls back to English when the UI locale has no version", () => {
    expect(resolveDefaultLanguage(["en-ai"], "he", versionsById)).toBe("en");
  });

  it("falls back to Hebrew when neither the UI locale nor English is available", () => {
    expect(
      resolveDefaultLanguage(["he-jerusalem-1956"], "ru", versionsById),
    ).toBe("he");
  });

  it("falls back to the first available language otherwise", () => {
    expect(resolveDefaultLanguage(["ru-bb"], "de", versionsById)).toBe("ru");
  });

  it("returns null when nothing is available", () => {
    expect(resolveDefaultLanguage([], "en", versionsById)).toBeNull();
  });
});

describe("nativeLanguageName", () => {
  it("returns the native name for known languages", () => {
    expect(nativeLanguageName("he")).toBe("עברית");
    expect(nativeLanguageName("en")).toBe("English");
    expect(nativeLanguageName("ru")).toBe("Русский");
  });

  it("passes unknown codes through unchanged rather than guessing", () => {
    expect(nativeLanguageName("zz")).toBe("zz");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/reader-languages.spec.ts`
Expected: FAIL — `resolveVersionForLanguage is not defined` (and the other new helpers). Nuxt auto-imports `app/utils/**`, so these resolve once Step 3 exports them.

- [ ] **Step 3: Rewrite the utility**

Replace the entire contents of `app/utils/readerVersions.ts`:

```ts
/**
 * Pure language → version resolution for the reader.
 *
 * The reader picks a LANGUAGE per pane; this module picks the edition.
 * Rule: the official Bnei Baruch translation, else a human translation,
 * else the AI one — and in Hebrew the original (Jerusalem 1956) always
 * wins, because Hebrew is the source language, not a translation.
 *
 * Chains are a preference, not a whitelist: if none of a language's
 * chain ids are available, any version in that language is still better
 * than nothing (covers `en-curated` and any future id naming).
 */
import type { ContentVersion } from "~~/shared/types/content";

export type VersionsById = Map<string, ContentVersion>;

/**
 * Per-language edition preference, best first. Languages absent from this
 * map use the generic `<lang>-bb` then `<lang>-ai` chain, which is how
 * every KabbalahMedia language is named — so adding a language needs
 * content, not a code change.
 */
const LANGUAGE_VERSION_CHAINS: Record<string, string[]> = {
  he: ["he-jerusalem-1956", "he-bb"],
  en: ["en-bb", "en-sefaria-community", "en-ai"],
};

/**
 * Languages pinned to the front of every switcher, in this order. Hebrew
 * is the original and English is the most complete translation, so they
 * lead; everything else sorts alphabetically behind them. Pinning keeps
 * the `<select>` order identical from chapter to chapter — deriving it
 * from each chapter's own version list would make options jump around.
 */
const LANGUAGE_DISPLAY_ORDER = ["he", "en"];

/** Native-language names — identical in every UI locale, hence not i18n keys. */
const NATIVE_LANGUAGE_NAMES: Record<string, string> = {
  he: "עברית",
  en: "English",
  bg: "Български",
  de: "Deutsch",
  ru: "Русский",
  fr: "Français",
  es: "Español",
  tr: "Türkçe",
  hi: "हिन्दी",
  pt: "Português",
  uk: "Українська",
};

export const buildVersionsById = (versions: ContentVersion[]): VersionsById =>
  new Map(versions.map((version) => [version.id, version]));

export const versionChainForLanguage = (language: string): string[] =>
  LANGUAGE_VERSION_CHAINS[language] ?? [`${language}-bb`, `${language}-ai`];

export const nativeLanguageName = (language: string): string =>
  NATIVE_LANGUAGE_NAMES[language] ?? language;

export const resolveVersionForLanguage = (
  available: string[],
  language: string,
  versionsById: VersionsById,
): string | null => {
  for (const preferred of versionChainForLanguage(language)) {
    if (available.includes(preferred)) return preferred;
  }

  return (
    available.find((id) => versionsById.get(id)?.language === language) ?? null
  );
};

export const languagesAvailable = (
  available: string[],
  versionsById: VersionsById,
): string[] => {
  const languages = new Set(
    available
      .map((id) => versionsById.get(id)?.language)
      .filter((language): language is string => language !== undefined),
  );

  return [...languages].sort((a, b) => {
    const aRank = LANGUAGE_DISPLAY_ORDER.indexOf(a);
    const bRank = LANGUAGE_DISPLAY_ORDER.indexOf(b);
    if (aRank !== -1 || bRank !== -1) {
      return (
        (aRank === -1 ? LANGUAGE_DISPLAY_ORDER.length : aRank) -
        (bRank === -1 ? LANGUAGE_DISPLAY_ORDER.length : bRank)
      );
    }
    return a.localeCompare(b);
  });
};

export const resolveDefaultLanguage = (
  available: string[],
  uiLocale: string,
  versionsById: VersionsById,
): string | null => {
  const languages = languagesAvailable(available, versionsById);
  if (languages.length === 0) return null;

  if (languages.includes(uiLocale)) return uiLocale;
  if (languages.includes("en")) return "en";
  if (languages.includes("he")) return "he";
  return languages[0] ?? null;
};
```

- [ ] **Step 4: Delete the superseded test file**

```bash
rm tests/unit/reader-versions.spec.ts
```

Its `resolveDefaultVersion` cases are all covered by the new chain and default-language cases above; its hydration cases move to Task 2.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/reader-languages.spec.ts`
Expected: PASS, all cases.

- [ ] **Step 6: Commit** _(only with the user's go-ahead — see Global Constraints)_

```bash
git add app/utils/readerVersions.ts tests/unit/reader-languages.spec.ts
git rm tests/unit/reader-versions.spec.ts
git commit -m "refactor(reader): resolve editions from a language chain"
```

---

### Task 2: Per-pane language composable

**Files:**

- Create: `app/composables/useReaderLanguages.ts`
- Delete: `app/composables/useReaderVersions.ts`
- Test: `tests/unit/reader-languages.spec.ts` (append a describe block)

**Interfaces:**

- Consumes: `resolveVersionForLanguage`, `resolveDefaultLanguage`, `buildVersionsById` (Task 1); `TocChapter`, `ContentVersion` (type-only).
- Produces:

  ```ts
  interface ReaderLanguages {
    source: ComputedRef<string | null>; // language code
    commentary: ComputedRef<string | null>; // language code
    sourceVersion: ComputedRef<string | null>; // resolved version id
    commentaryVersion: ComputedRef<string | null>; // resolved version id
    setLanguage: (layer: "source" | "commentary", language: string) => void;
  }
  const useReaderLanguages: (
    chapter: TocChapter,
    versions: ContentVersion[],
  ) => ReaderLanguages;
  ```

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/reader-languages.spec.ts` (and add `mountSuspended`, `defineComponent`, `nextTick`, `beforeEach`, and the `TocChapter` type to the existing imports at the top of the file):

```ts
describe("useReaderLanguages (hydration + persistence)", () => {
  const STORAGE_KEY = "readtes:reader-languages";

  const chapter: TocChapter = {
    id: "part-01/chapter-01",
    kind: "chapter",
    number: 1,
    title: { en: "Chapter 1", he: "פרק 1" },
    availableLayers: ["source"],
    availableVersions: {
      summary: [],
      source: ["he-jerusalem-1956", "en-sefaria-community"],
      commentary: [],
    },
  };

  // Default UI locale in tests is "en" (nuxt.config.ts), so the default
  // rule resolves to English — distinct from the persisted Hebrew below.
  const SSR_DEFAULT_LANGUAGE = "en";
  const PERSISTED_LANGUAGE = "he";

  const Host = defineComponent({
    setup() {
      const readerLanguages = useReaderLanguages(chapter, versions);
      // Captured in `setup`, i.e. before `onMounted` — this is what the
      // very first render (and the prerendered markup) resolves to.
      const preMountLanguage = readerLanguages.source.value;
      return { readerLanguages, preMountLanguage };
    },
    render: () => null,
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("resolves the default before mount, then reconciles to the persisted language", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ source: PERSISTED_LANGUAGE, commentary: null }),
    );

    const wrapper = await mountSuspended(Host);

    // Hydration-mismatch guard: the pre-mount value must be the default
    // rule's, not the persisted override's.
    expect(wrapper.vm.preMountLanguage).toBe(SSR_DEFAULT_LANGUAGE);

    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe(PERSISTED_LANGUAGE);
  });

  it("exposes the resolved version id alongside the language", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe("en");
    expect(wrapper.vm.readerLanguages.sourceVersion.value).toBe(
      "en-sefaria-community",
    );

    wrapper.vm.readerLanguages.setLanguage("source", "he");
    await nextTick();

    expect(wrapper.vm.readerLanguages.sourceVersion.value).toBe(
      "he-jerusalem-1956",
    );
  });

  it("ignores a persisted language this chapter has no version for", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ source: "ru", commentary: null }),
    );

    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe(SSR_DEFAULT_LANGUAGE);
  });

  it("persists a language choice via setLanguage", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    wrapper.vm.readerLanguages.setLanguage("source", PERSISTED_LANGUAGE);
    await nextTick();

    expect(wrapper.vm.readerLanguages.source.value).toBe(PERSISTED_LANGUAGE);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      source: PERSISTED_LANGUAGE,
      commentary: null,
    });
  });

  it("resolves a null version for a layer with no versions at all", async () => {
    const wrapper = await mountSuspended(Host);
    await nextTick();

    expect(wrapper.vm.readerLanguages.commentary.value).toBeNull();
    expect(wrapper.vm.readerLanguages.commentaryVersion.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/reader-languages.spec.ts`
Expected: FAIL — `useReaderLanguages is not defined`.

- [ ] **Step 3: Create the composable**

Create `app/composables/useReaderLanguages.ts`:

```ts
/**
 * Per-layer LANGUAGE selection state for the reader. The reader chooses a
 * language; `resolveVersionForLanguage` chooses the edition (see
 * `~/utils/readerVersions`). The user's last choice persists via
 * `localStorage`, keyed per LAYER (not per chapter) — picking Hebrew for
 * the source pane once keeps it Hebrew on later chapters too — falling
 * back to the default rule whenever the persisted language has no version
 * for the current chapter's layer.
 *
 * Storage key note: deliberately NOT the old `readtes:reader-versions`.
 * That key holds version ids ("en-bb"), which are not valid values here;
 * a fresh key means a returning visitor falls cleanly back to the default
 * rule instead of needing a migration path for a UI preference.
 *
 * No `summary` field: the summary layer has no switching UI anywhere
 * (exactly 1 file exists across the whole corpus — the reader no longer
 * loads or renders it, see `useChapterContent`).
 *
 * Hydration note: `useLocalStorage` reads `localStorage` synchronously in
 * `setup`, but prerendering has no `localStorage` and always resolves via
 * `resolveDefaultLanguage`. Consulting the persisted prefs immediately
 * would make a returning visitor's first client render (used for
 * hydration) diverge from the prerendered HTML — a hydration mismatch +
 * content flash. `hydrated` gates persisted reads until `onMounted`, so
 * the very first render (server and client alike) always resolves via the
 * default rule; the persisted override reconciles in right after mount.
 */
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef } from "vue";
import {
  buildVersionsById,
  resolveDefaultLanguage,
  resolveVersionForLanguage,
} from "~/utils/readerVersions";
import type { ContentVersion, TocChapter } from "~~/shared/types/content";

type ReaderLayerKind = "source" | "commentary";
type ReaderLanguagePrefs = Record<ReaderLayerKind, string | null>;

const STORAGE_KEY = "readtes:reader-languages";
const DEFAULT_PREFS: ReaderLanguagePrefs = {
  source: null,
  commentary: null,
};

export interface ReaderLanguages {
  source: ComputedRef<string | null>;
  commentary: ComputedRef<string | null>;
  sourceVersion: ComputedRef<string | null>;
  commentaryVersion: ComputedRef<string | null>;
  setLanguage: (layer: ReaderLayerKind, language: string) => void;
}

export const useReaderLanguages = (
  chapter: TocChapter,
  versions: ContentVersion[],
): ReaderLanguages => {
  const { locale } = useI18n();
  const versionsById = computed(() => buildVersionsById(versions));

  const prefs = useLocalStorage<ReaderLanguagePrefs>(STORAGE_KEY, {
    ...DEFAULT_PREFS,
  });

  // Gates persisted-preference reads until after mount so the first render
  // (SSR and the client's pre-mount render alike) always matches the
  // prerendered HTML. See the module-doc hydration note above.
  const hydrated = ref(false);
  onMounted(() => {
    hydrated.value = true;
  });

  const languageFor = (layer: ReaderLayerKind): ComputedRef<string | null> =>
    computed(() => {
      const available = chapter.availableVersions[layer];
      const preferred = hydrated.value ? prefs.value[layer] : null;

      if (
        preferred &&
        resolveVersionForLanguage(available, preferred, versionsById.value)
      ) {
        return preferred;
      }
      return resolveDefaultLanguage(
        available,
        locale.value,
        versionsById.value,
      );
    });

  const versionFor = (
    layer: ReaderLayerKind,
    language: ComputedRef<string | null>,
  ): ComputedRef<string | null> =>
    computed(() =>
      language.value
        ? resolveVersionForLanguage(
            chapter.availableVersions[layer],
            language.value,
            versionsById.value,
          )
        : null,
    );

  const setLanguage = (layer: ReaderLayerKind, language: string) => {
    prefs.value = { ...prefs.value, [layer]: language };
  };

  const source = languageFor("source");
  const commentary = languageFor("commentary");

  return {
    source,
    commentary,
    sourceVersion: versionFor("source", source),
    commentaryVersion: versionFor("commentary", commentary),
    setLanguage,
  };
};
```

- [ ] **Step 4: Delete the superseded composable**

```bash
rm app/composables/useReaderVersions.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/reader-languages.spec.ts`
Expected: PASS. Typecheck will still fail repo-wide until Tasks 3–5 land — that is expected at this point; do not "fix" it by editing the page yet.

- [ ] **Step 6: Commit** _(only with the user's go-ahead)_

```bash
git add app/composables/useReaderLanguages.ts tests/unit/reader-languages.spec.ts
git rm app/composables/useReaderVersions.ts
git commit -m "refactor(reader): persist a language per pane, not an edition"
```

---

### Task 3: Pane header — language select + provenance badge

**Files:**

- Create: `app/components/reader/ReaderPaneHeader.vue`
- Delete: `app/components/reader/ReaderVersionHeader.vue`
- Test: `tests/unit/reader-pane-header.spec.ts` (create)

**Interfaces:**

- Consumes: `nativeLanguageName` (Task 1); `ContentVersion` (type-only).
- Produces: component `<ReaderPaneHeader>` with props
  ```ts
  {
    title: string;
    languageOptions: string[];       // language codes, already ordered
    modelValue: string | null;       // selected language code
    meta: ContentVersion | null;     // the RESOLVED version, for the badge
  }
  ```
  and emit `"update:modelValue": [value: string]`.

Note the prop shape change: `languageOptions` is a plain `string[]` of codes, not `{id,label}[]`. The label is derived from the code via `nativeLanguageName`, so callers no longer build option objects.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/reader-pane-header.spec.ts`:

```ts
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import type { ContentVersion } from "~~/shared/types/content";
import ReaderPaneHeader from "~/components/reader/ReaderPaneHeader.vue";

const version = (
  overrides: Partial<ContentVersion> &
    Pick<ContentVersion, "id" | "language" | "source">,
): ContentVersion => ({
  direction: "ltr",
  title: overrides.id,
  license: "CC0",
  ...overrides,
});

const mountHeader = async (
  meta: ContentVersion | null,
  languageOptions = ["he", "en"],
) =>
  mountSuspended(ReaderPaneHeader, {
    props: { title: "The Ari's Text", languageOptions, modelValue: "en", meta },
  });

describe("ReaderPaneHeader provenance badge", () => {
  it("badges an AI translation", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-ai", language: "en", source: "ai" }),
    );
    expect(wrapper.text()).toContain("AI translated");
  });

  it("badges a Sefaria translation", async () => {
    const wrapper = await mountHeader(
      version({
        id: "en-sefaria-community",
        language: "en",
        source: "sefaria",
      }),
    );
    expect(wrapper.text()).toContain("Sefaria translation");
  });

  it("does not badge the official Bnei Baruch translation", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    expect(wrapper.text()).not.toContain("AI translated");
    expect(wrapper.text()).not.toContain("Sefaria translation");
  });

  it("never badges Hebrew — it is the original, not a translation", async () => {
    const wrapper = await mountHeader(
      version({
        id: "he-jerusalem-1956",
        language: "he",
        direction: "rtl",
        source: "sefaria",
      }),
    );
    expect(wrapper.text()).not.toContain("Sefaria translation");
  });
});

describe("ReaderPaneHeader language select", () => {
  it("labels options with native language names", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    const options = wrapper.findAll("option");
    expect(options.map((option) => option.text())).toEqual([
      "עברית",
      "English",
    ]);
  });

  it("hides the select when only one language is available", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
      ["en"],
    );
    expect(wrapper.find("select").exists()).toBe(false);
  });

  it("emits the chosen language code", async () => {
    const wrapper = await mountHeader(
      version({ id: "en-bb", language: "en", source: "kabbalahmedia" }),
    );
    const select = wrapper.find("select");
    await select.setValue("he");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["he"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/reader-pane-header.spec.ts`
Expected: FAIL — cannot resolve `~/components/reader/ReaderPaneHeader.vue`.

- [ ] **Step 3: Create the component**

Create `app/components/reader/ReaderPaneHeader.vue`:

```vue
<script setup lang="ts">
// A layer's title + language <select> (when the layer has more than one
// language) + a provenance badge. Extracted from `ReaderPane` so
// `StudyStream` can offer the same language switching inline in the
// stream without duplicating the markup.
//
// Provenance is a LABEL, never a control: the reader picks a language and
// `resolveVersionForLanguage` picks the edition, so the only thing worth
// telling them is when the text they're reading isn't the official Bnei
// Baruch translation. Hebrew is never badged — it is the original.
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{
  title: string;
  /** Language codes, already in display order (`languagesAvailable`). */
  languageOptions: string[];
  /** The selected language code. */
  modelValue: string | null;
  /** The RESOLVED version — drives the badge, and `dir`/`lang` in `ReaderPane`. */
  meta: ContentVersion | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { t } = useI18n();

const selectId = useId();

const provenance = computed(() => {
  const meta = props.meta;
  if (!meta || meta.language === "he") return null;
  if (meta.source === "ai") {
    return { label: t("reader.aiTranslated"), tone: "warning" as const };
  }
  if (meta.source === "sefaria") {
    return { label: t("reader.sefariaTranslated"), tone: "muted" as const };
  }
  return null;
});

const onLanguageChange = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
};
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <h2
      class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
    >
      {{ title }}
    </h2>

    <div class="flex items-center gap-2">
      <span
        v-if="provenance"
        class="rounded-button border px-1.5 py-0.5 text-xs font-medium"
        :class="
          provenance.tone === 'warning'
            ? 'border-orange-cta text-(--warning-text)'
            : 'border-(--border) text-(--text-muted)'
        "
      >
        {{ provenance.label }}
      </span>

      <template v-if="languageOptions.length > 1">
        <label :for="selectId" class="sr-only">{{
          t("reader.languageLabel")
        }}</label>
        <select
          :id="selectId"
          class="rounded-input border border-(--border) bg-(--surface) px-2 py-1 text-xs text-(--text-primary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          :value="modelValue ?? ''"
          @change="onLanguageChange"
        >
          <option
            v-for="language in languageOptions"
            :key="language"
            :value="language"
          >
            {{ nativeLanguageName(language) }}
          </option>
        </select>
      </template>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Add the i18n key**

In `i18n/locales/en.json`, inside `"reader"`, replace `"versionLabel": "Edition"` with:

```json
    "languageLabel": "Language",
    "sefariaTranslated": "Sefaria translation",
```

In `i18n/locales/he.json`, inside `"reader"`, replace `"versionLabel": "מהדורה"` with:

```json
    "languageLabel": "שפה",
    "sefariaTranslated": "תרגום ספריא",
```

- [ ] **Step 5: Delete the superseded component**

```bash
rm app/components/reader/ReaderVersionHeader.vue
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/reader-pane-header.spec.ts`
Expected: PASS, all 7 cases.

- [ ] **Step 7: Commit** _(only with the user's go-ahead)_

```bash
git add app/components/reader/ReaderPaneHeader.vue tests/unit/reader-pane-header.spec.ts i18n/locales/en.json i18n/locales/he.json
git rm app/components/reader/ReaderVersionHeader.vue
git commit -m "feat(reader): switch panes by language, label provenance"
```

---

### Task 4: Wire `ReaderPane` and `StudyStream`

**Files:**

- Modify: `app/components/reader/ReaderPane.vue`
- Modify: `app/components/reader/StudyStream.vue`
- Modify: `app/components/reader/OriginalStream.vue` (comment only)

**Interfaces:**

- Consumes: `<ReaderPaneHeader>` (Task 3).
- Produces:
  - `ReaderPane` props `{ title: string; languageOptions: string[]; modelValue: string | null; meta: ContentVersion | null }`, emit `"update:modelValue": [value: string]`. The exported `ReaderVersionOption` interface is **removed** — no caller builds option objects any more.
  - `StudyStream` props `sourceLanguageOptions: string[]`, `commentaryLanguageOptions: string[]`, `sourceLanguage: string | null`, `commentaryLanguage: string | null` (replacing the four `*Version*` equivalents), emits `"update:sourceLanguage": [value: string]`, `"update:commentaryLanguage": [value: string]`.

- [ ] **Step 1: Update `ReaderPane.vue`**

Replace the `<script setup>` block's prop/interface section — delete the `ReaderVersionOption` interface entirely and change `defineProps` to:

```ts
defineProps<{
  title: string;
  /** Language codes in display order; the header hides its select when length <= 1. */
  languageOptions: string[];
  modelValue: string | null;
  meta: ContentVersion | null;
}>();
```

In the template, replace the `<ReaderVersionHeader ... />` element with:

```vue
<ReaderPaneHeader
  :title="title"
  :language-options="languageOptions"
  :model-value="modelValue"
  :meta="meta"
  class="flex-1"
  @update:model-value="(value) => emit('update:modelValue', value)"
/>
```

Also update the header comment at the top of the file: `ReaderVersionHeader` → `ReaderPaneHeader`, and "version `<select>`" → "language `<select>`".

The scroll container's `:dir="meta?.direction ?? 'ltr'"` and `:lang="meta?.language"` bindings are unchanged and still correct — `meta` is now the _resolved_ version, which still carries the right direction and language.

- [ ] **Step 2: Update `StudyStream.vue`**

In `defineProps`, replace:

```ts
sourceVersionOptions: {
  id: string;
  label: string;
}
[];
commentaryVersionOptions: {
  id: string;
  label: string;
}
[];
sourceVersion: string | null;
commentaryVersion: string | null;
```

with:

```ts
  sourceLanguageOptions: string[];
  commentaryLanguageOptions: string[];
  sourceLanguage: string | null;
  commentaryLanguage: string | null;
  /** The resolved commentary version id — for the "not in this edition" notice. */
  commentaryVersionId: string | null;
```

In `defineEmits`, replace `"update:sourceVersion"` / `"update:commentaryVersion"` with `"update:sourceLanguage"` / `"update:commentaryLanguage"` (same `[value: string]` payload).

Update the three internal usages:

- `resolveMissingAnchorNotice({ ..., selectedVersionId: props.commentaryVersion, ... })` → `selectedVersionId: props.commentaryVersionId`.
- The "switch to Hebrew" handler `emit("update:commentaryVersion", props.hebrewVersionId)` → `emit("update:commentaryLanguage", "he")`.
- The `computed(() => props.commentaryVersionOptions.length > 0)` guard → `props.commentaryLanguageOptions.length > 0`.

In the template, both `<ReaderVersionHeader>` elements become `<ReaderPaneHeader>` with `:language-options` / `:model-value` / `@update:model-value` bound to the renamed props and events, and the `v-if="...VersionOptions.length > 1"` guards become `...LanguageOptions.length > 1`.

- [ ] **Step 3: Update the stale comment in `OriginalStream.vue`**

No functional change — this component has never had a selector. Update its header comment's `useReaderVersions` reference to `useReaderLanguages`, and "standing version" to "standing language".

- [ ] **Step 4: Verify no stale references remain**

Run: `grep -rn "ReaderVersionHeader\|useReaderVersions\|versionOptions\|resolveDefaultVersion\|ReaderVersionOption" app/ tests/`
Expected: no output. Any hit is a missed rename.

- [ ] **Step 5: Commit** _(only with the user's go-ahead)_

```bash
git add app/components/reader/
git commit -m "refactor(reader): rename pane version props to languages"
```

---

### Task 5: Wire the chapter page

**Files:**

- Modify: `app/pages/read/[part]/[chapter].vue`

**Interfaces:**

- Consumes: `useReaderLanguages` (Task 2), `languagesAvailable`/`resolveVersionForLanguage`/`resolveDefaultLanguage` (Task 1), the renamed `ReaderPane`/`StudyStream` props (Task 4).
- Produces: nothing downstream — this is the top of the tree.

- [ ] **Step 1: Replace the version wiring in `<script setup>`**

Replace `const readerVersions = useReaderVersions(chapter, versions.value);` with:

```ts
const readerLanguages = useReaderLanguages(chapter, versions.value);
```

Replace the `versionOptions` / `sourceVersionOptions` / `commentaryVersionOptions` / `innerObservationVersionOptions` block with:

```ts
const sourceLanguageOptions = computed(() =>
  languagesAvailable(sourceVersions.value, versionsById.value),
);
const commentaryLanguageOptions = computed(() =>
  languagesAvailable(commentaryVersions.value, versionsById.value),
);
const innerObservationLanguageOptions = computed(() =>
  languagesAvailable(innerObservationVersionIds.value, versionsById.value),
);
```

Replace the `sourceMeta` / `commentaryMeta` / `sourceFile` / `commentaryFile` definitions with ones reading the composable's resolved version ids:

```ts
const sourceMeta = computed(() => metaFor(readerLanguages.sourceVersion.value));
const commentaryMeta = computed(() =>
  metaFor(readerLanguages.commentaryVersion.value),
);

const sourceFile = computed(() =>
  readerLanguages.sourceVersion.value
    ? (sourceByVersion.value[readerLanguages.sourceVersion.value] ?? null)
    : null,
);
const commentaryFile = computed(() =>
  readerLanguages.commentaryVersion.value
    ? (commentaryByVersion.value[readerLanguages.commentaryVersion.value] ??
      null)
    : null,
);
```

- [ ] **Step 2: Convert the Inner Observation ref to a language**

Replace the `innerObservationVersion` ref + `watch` block with a language ref and a derived version id. Inner Observation is part-scoped and has exactly one pane, so it still keeps no persisted preference of its own:

```ts
// Inner Observation has no persisted language preference of its own
// (unlike source/commentary via `useReaderLanguages`) — there's exactly
// one pane for it, so nothing needs remembering across chapters; it just
// follows the same default rule, recomputed whenever the part's available
// versions load.
const innerObservationLanguage = ref<string | null>(null);
watch(
  innerObservationVersionIds,
  (ids) => {
    if (
      innerObservationLanguage.value &&
      resolveVersionForLanguage(
        ids,
        innerObservationLanguage.value,
        versionsById.value,
      )
    ) {
      return;
    }
    innerObservationLanguage.value = resolveDefaultLanguage(
      ids,
      locale.value,
      versionsById.value,
    );
  },
  { immediate: true },
);

const innerObservationVersion = computed(() =>
  innerObservationLanguage.value
    ? resolveVersionForLanguage(
        innerObservationVersionIds.value,
        innerObservationLanguage.value,
        versionsById.value,
      )
    : null,
);
```

`innerObservationMeta` and `innerObservationSections` are unchanged — they already read `innerObservationVersion`, which is now a computed instead of a ref.

- [ ] **Step 3: Update the missing-anchor wiring**

`missingAnchorNotice` takes the resolved version id:

```ts
    selectedVersionId: readerLanguages.commentaryVersion.value,
```

and the switch handler sets a language instead of a version id:

```ts
const switchCommentaryToHebrew = () => {
  readerLanguages.setLanguage("commentary", "he");
  reactivateAnchor();
};
```

Update its preceding comment: "Switching versions doesn't change `activeAnchor`" → "Switching languages doesn't change `activeAnchor`".

- [ ] **Step 4: Update the template**

Three `<ReaderPane>` elements: `:version-options` → `:language-options` bound to the new computeds, `:model-value` bound to `readerLanguages.source.value` / `readerLanguages.commentary.value` / `innerObservationLanguage`, and `@update:model-value` calling `readerLanguages.setLanguage('source', language)` / `setLanguage('commentary', language)` / `(language) => (innerObservationLanguage = language)`.

The `<ReaderStudyStream>` element: `:source-version-options` → `:source-language-options`, `:commentary-version-options` → `:commentary-language-options`, `:source-version` → `:source-language="readerLanguages.source.value"`, `:commentary-version` → `:commentary-language="readerLanguages.commentary.value"`, plus the new `:commentary-version-id="readerLanguages.commentaryVersion.value"`. Both `@update:*-version` handlers become `@update:*-language` calling `readerLanguages.setLanguage(...)`.

`HEBREW_VERSION_ID` stays — `hebrewItems` / `hebrew-version-id` still key off it for the missing-anchor notice.

- [ ] **Step 5: Verify no stale references remain**

Run: `grep -rn "readerVersions\|versionOptions\|:version-options\|update:sourceVersion\|update:commentaryVersion" app/`
Expected: no output.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. This is the first point in the plan where the whole app typechecks again.

- [ ] **Step 7: Commit** _(only with the user's go-ahead)_

```bash
git add app/pages/read/
git commit -m "feat(reader): drive panes from language selection"
```

---

### Task 6: Full verification

**Files:** none modified unless a check fails.

- [ ] **Step 1: Run the full gate**

Run: `task check`
Expected: PASS — lint, format:check, typecheck, validate:content, test (503+ unit tests), generate.

- [ ] **Step 2: Fix anything the gate catches**

Most likely failures and their causes:

- `format:check` — run `pnpm format` and re-run.
- Lint `vuejs-accessibility` — the language `<select>` needs its `<label for>`; it is in Task 3's markup, keep it.
- A guardrail spec asserting the no-full-ToC-import rule — unrelated to this change; if it fires, something imported `content/toc.json` wholesale.

- [ ] **Step 3: Verify in the running app**

Run: `pnpm dev` (port 6217) and check, at 1440px and 390px:

1. `/read/part-01/chapter-01` — source pane offers "עברית" and "English"; selecting English shows no badge if it resolves `en-bb`, "AI translated" if it resolves `en-ai`.
2. `/read/part-07/chapter-01` — English resolves to `en-ai` (part 7 has no `en-bb`), so the badge shows.
3. Selecting "עברית" shows no badge, and the pane flips to RTL.
4. Reload — the language choice persists, with no flash of the other language on load (the hydration guard).
5. `/he/read/part-01/chapter-01` — Hebrew UI locale defaults the panes to Hebrew.

- [ ] **Step 4: Commit** _(only with the user's go-ahead)_

```bash
git add -A
git commit -m "test(reader): cover language resolution and provenance badges"
```

---

## Self-Review

**Spec coverage:**

| Spec section                  | Task                                   |
| ----------------------------- | -------------------------------------- |
| Resolution rule (chain table) | 1                                      |
| Which languages a pane offers | 1 (`languagesAvailable`), 5 (wiring)   |
| Default and persistence       | 2                                      |
| Provenance tag table          | 3                                      |
| URLs — no change required     | none needed; verified in Task 6 step 3 |
| Files touched                 | 1–5, one task per cluster              |
| Testing                       | 1, 2, 3 (unit), 6 (gate + manual)      |

**Type consistency:** `languageOptions` is `string[]` everywhere (Tasks 3, 4, 5). `setLanguage(layer, language)` is used identically in Tasks 2, 4, 5. `sourceVersion`/`commentaryVersion` are the composable's _resolved id_ computeds throughout; `source`/`commentary` are the _language_ computeds. `StudyStream`'s `commentaryVersionId` prop is the one place a resolved id crosses a component boundary, and it is declared in Task 4 and passed in Task 5.

**Known deviation from the spec:** the spec's "Files touched" table listed `OriginalStream.vue` as needing a switcher swap. It has no switcher — Task 4 step 3 updates only its stale comment. The spec has been corrected.
