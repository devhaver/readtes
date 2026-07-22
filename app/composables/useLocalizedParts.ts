/**
 * Loads one or more parts' full ToC files (`content/toc.parts/part-NN.json`
 * — a part's `TocChapter[]` plus its own and its parent volume's identity,
 * see AGENTS.md "Content model"). Only the parts a page actually needs are
 * ever fetched — `import.meta.glob(..., { lazy: default })` over every
 * `content/toc.parts/*.json` file gives each one its own dynamically
 * imported chunk, the same relative-path glob style `useChapterContent`
 * uses over `content/parts/**`.
 *
 * Direct `await import()`, no `useAsyncData` — see `useLocalizedVolumes`'s
 * docblock for why. The reader page calls this with a single part id; a
 * volume's contents page calls it with that volume's 2-3 part ids.
 *
 * A requested part id with no matching file resolves to `undefined` in the
 * returned map (never a throw) — callers 404 on a missing part themselves,
 * the same way a missing chapter/layer file already does elsewhere.
 */
import type { ComputedRef } from "vue";
import type { TocPartFile } from "~~/shared/types/content";

// Relative path, not the `~~` alias — `import.meta.glob` patterns are
// statically analyzed by Vite's glob-import plugin rather than run through
// normal module resolution (verified against `useChapterContent`'s own
// comment on this).
const tocPartModules = import.meta.glob<{ default: TocPartFile }>(
  "../../content/toc.parts/*.json",
);

const findLoader = (partId: string) => {
  const suffix = `/toc.parts/${partId}.json`;
  const key = Object.keys(tocPartModules).find((candidate) =>
    candidate.endsWith(suffix),
  );
  return key ? tocPartModules[key] : undefined;
};

export const useLocalizedParts = async (
  partIds: string[],
): Promise<{ parts: ComputedRef<Record<string, TocPartFile | undefined>> }> => {
  const entries = await Promise.all(
    partIds.map(async (partId) => {
      const loader = findLoader(partId);
      const file = loader ? (await loader()).default : undefined;
      return [partId, file] as const;
    }),
  );

  const data = Object.fromEntries(entries) as Record<
    string,
    TocPartFile | undefined
  >;
  const parts = computed<Record<string, TocPartFile | undefined>>(() => data);

  return { parts };
};
