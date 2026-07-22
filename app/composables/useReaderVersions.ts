/**
 * Per-layer version selection state for the reader: which version of the
 * source/commentary/summary layer is currently shown. Defaults follow
 * `resolveDefaultVersion` (`~/utils/readerVersions`); the user's last choice
 * persists via `localStorage`, keyed per LAYER (not per chapter) — picking
 * Hebrew source once keeps defaulting to Hebrew source on later chapters
 * too, until overridden again — falling back to the default rule whenever
 * the persisted choice isn't among the current chapter's available
 * versions for that layer.
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

  const resolvedFor = (layer: LayerKind): ComputedRef<string | null> =>
    computed(() => {
      const available = chapter.availableVersions[layer];
      const preferred = prefs.value[layer];

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
