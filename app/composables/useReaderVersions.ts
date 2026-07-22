/**
 * Per-layer version selection state for the reader: which version of the
 * source/commentary/summary layer is currently shown. Defaults follow
 * `resolveDefaultVersion` (`~/utils/readerVersions`); the user's last choice
 * persists via `localStorage`, keyed per LAYER (not per chapter) — picking
 * Hebrew source once keeps defaulting to Hebrew source on later chapters
 * too, until overridden again — falling back to the default rule whenever
 * the persisted choice isn't among the current chapter's available
 * versions for that layer.
 *
 * Hydration note: `useLocalStorage` reads `localStorage` synchronously in
 * `setup`, but prerendering has no `localStorage` and always resolves via
 * `resolveDefaultVersion`. Consulting the persisted prefs immediately would
 * make a returning visitor's first client render (used for hydration)
 * diverge from the prerendered HTML - a hydration mismatch + content flash.
 * `hydrated` gates persisted reads until `onMounted`, so the very first
 * render (server and client alike) always resolves via the default rule;
 * the persisted override reconciles in right after mount.
 */
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef } from "vue";
import {
  buildVersionsById,
  resolveDefaultVersion,
} from "~/utils/readerVersions";
import type {
  ContentVersion,
  LayerKind,
  TocChapter,
} from "~~/shared/types/content";

type ReaderVersionPrefs = Record<LayerKind, string | null>;

const STORAGE_KEY = "readtes:reader-versions";
const DEFAULT_PREFS: ReaderVersionPrefs = {
  source: null,
  commentary: null,
  summary: null,
};

export interface ReaderVersions {
  source: ComputedRef<string | null>;
  commentary: ComputedRef<string | null>;
  summary: ComputedRef<string | null>;
  setVersion: (layer: LayerKind, versionId: string) => void;
}

export const useReaderVersions = (
  chapter: TocChapter,
  versions: ContentVersion[],
): ReaderVersions => {
  const { locale } = useI18n();
  const versionsById = computed(() => buildVersionsById(versions));

  const prefs = useLocalStorage<ReaderVersionPrefs>(STORAGE_KEY, {
    ...DEFAULT_PREFS,
  });

  // Gates persisted-preference reads until after mount so the first render
  // (SSR and the client's pre-mount render alike) always matches the
  // default-rule resolution baked into the prerendered HTML. See the
  // module-doc hydration note above.
  const hydrated = ref(false);
  onMounted(() => {
    hydrated.value = true;
  });

  const resolvedFor = (layer: LayerKind): ComputedRef<string | null> =>
    computed(() => {
      const available = chapter.availableVersions[layer];
      const preferred = hydrated.value ? prefs.value[layer] : null;

      if (preferred && available.includes(preferred)) return preferred;
      return resolveDefaultVersion(available, locale.value, versionsById.value);
    });

  const setVersion = (layer: LayerKind, versionId: string) => {
    prefs.value = { ...prefs.value, [layer]: versionId };
  };

  return {
    source: resolvedFor("source"),
    commentary: resolvedFor("commentary"),
    summary: resolvedFor("summary"),
    setVersion,
  };
};
