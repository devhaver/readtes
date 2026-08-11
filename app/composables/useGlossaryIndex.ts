/**
 * Loads the app-facing glossary index (`content/glossary/tes-en.index.json`)
 * via a direct `await import()` and exposes it as `computed()` refs.
 *
 * The canonical `content/glossary/tes-en.json` is 307KB and must never be
 * imported from `app/` — ~77% of it is the citation excerpt pairs, which
 * only matter once a reader opens a term. This file is the derived index
 * (terms, variants, conventions, gaps; no citations, see
 * `scripts/lib/glossary-splits.ts`); `useGlossaryCitations` fetches the
 * other half on demand.
 *
 * No `useAsyncData`, for the same reason as `useLocalizedVolumes`: this is
 * a statically bundled JSON module, so the client gets byte-identical data
 * by importing the same chunk during hydration — there is no fetch to
 * coordinate, and wrapping it would serialize the whole index into the
 * page payload on top of the chunk.
 *
 * Async: `await useGlossaryIndex()` at the top of `<script setup>`.
 *
 * `zod` never enters this file: only the inferred types are imported.
 */
import type { GlossaryIndexFile } from "~~/shared/types/content";

export const useGlossaryIndex = async () => {
  const indexModule = await import("~~/content/glossary/tes-en.index.json");
  const data = indexModule.default as GlossaryIndexFile;

  return {
    meta: computed(() => data.meta),
    entries: computed(() => data.entries),
    conventions: computed(() => data.conventions),
    knownGaps: computed(() => data.knownGaps),
  };
};
