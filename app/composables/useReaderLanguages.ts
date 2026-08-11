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
  paneLanguageOptions,
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

      // The preference is honoured only within the pane's OFFERED set
      // (parent language + Hebrew, issue #94) — not merely "any language
      // with text". Otherwise a preference persisted under one UI locale
      // (say, en) would surface under another (/he) as a selection the
      // switcher doesn't even list, binding the control to a value with
      // no matching option.
      if (
        preferred &&
        paneLanguageOptions(
          available,
          locale.value,
          versionsById.value,
        ).includes(preferred) &&
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
