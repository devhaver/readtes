/**
 * On-demand half of the split glossary: the aligned Hebrew/English excerpt
 * pairs evidencing each term (`content/glossary/tes-en.citations.json`,
 * 216KB on disk / 150KB minified — see `scripts/lib/glossary-splits.ts`).
 *
 * Deliberately NOT loaded with the page. `/glossary` renders 125 terms from
 * the 77KB index; the citations are about three times as many bytes as the
 * list itself and are only read when someone opens a term, so the import
 * lives behind `loadCitations()` and its chunk is stripped of prefetch
 * eligibility (`shared/utils/manifestPrefetch.ts`) so nothing fetches it
 * speculatively.
 *
 * The in-flight promise is shared, so opening three terms in quick
 * succession still only fetches the chunk once.
 *
 * `loadCitations()` never rejects. It is wired straight to a `@open` handler
 * on 125 rows, so a rejected promise would be an unhandled rejection and
 * every open row would sit on "Loading passages…" forever; instead a failed
 * fetch flips `hasFailed`, which the rows render as a message with a retry.
 * Calling it again clears `hasFailed` and re-attempts the import.
 *
 * `zod` never enters this file: only the inferred types are imported.
 */
import type {
  GlossaryCitation,
  GlossaryCitationsFile,
} from "~~/shared/types/content";

export const useGlossaryCitations = () => {
  const citationsByEntry = ref<Record<string, GlossaryCitation[]>>({});
  const isLoading = ref(false);
  const hasLoaded = ref(false);
  const hasFailed = ref(false);

  let inFlight: Promise<void> | null = null;

  const loadCitations = (): Promise<void> => {
    if (hasLoaded.value) return Promise.resolve();
    if (inFlight) return inFlight;

    isLoading.value = true;
    hasFailed.value = false;
    inFlight = import("~~/content/glossary/tes-en.citations.json")
      .then((citationsModule) => {
        citationsByEntry.value = (
          citationsModule.default as GlossaryCitationsFile
        ).citations;
        hasLoaded.value = true;
      })
      .catch(() => {
        hasFailed.value = true;
      })
      .finally(() => {
        isLoading.value = false;
        inFlight = null;
      });

    return inFlight;
  };

  const citationsFor = (entryId: string): GlossaryCitation[] =>
    citationsByEntry.value[entryId] ?? [];

  return { citationsFor, hasFailed, hasLoaded, isLoading, loadCitations };
};
