/**
 * Pure client-manifest mutation — no Nuxt/Nitro runtime context, so it's
 * directly unit-testable (`tests/unit/manifest-prefetch.spec.ts`).
 * `nuxt.config.ts`'s `build:manifest` hook is the thin wiring that calls
 * this against the real Vite/Nitro client manifest at build time.
 *
 * Why this exists (T11 scaling fix, see AGENTS.md "Content model" > "Known
 * limitation" for the full writeup): `useChapterContent`/`useLocalizedParts`
 * load per-chapter/per-part JSON via `import.meta.glob(..., { lazy: true
 * })`, so every one of the ~5,200 matched `content/parts/**` +
 * `content/toc.parts/**` files becomes its own chunk with a real `import()`
 * call site literally present in the composable's compiled module.
 * Rollup's client manifest records every such call as a "dynamic import" of
 * that module — regardless of which one actually runs at request time — and
 * Nitro's renderer (`vue-bundle-renderer`) turns every dynamic import of an
 * always-touched module into a `<link rel="prefetch">` on every page that
 * touches it (i.e. every reader page, unconditionally). Measured before
 * this fix: 5,212 prefetch links, 373KB of a 391KB generated
 * `read/part-05/chapter-01` page (95.4%) — present from the very first
 * route rendered, not something that "grows" over a crawl.
 *
 * There is no user-facing Nuxt config flag for this (checked
 * `experimental.prefetchPreloadTags` — a similarly-named but unrelated,
 * separate opt-in feature) — `vue-bundle-renderer` sets `prefetch`/`preload`
 * unconditionally per manifest entry with no built-in opt-out. Fix: mutate
 * the manifest directly. For every entry whose own key/src lives under
 * `content/parts/` or `content/toc.parts/`, clear its `prefetch`/`preload`
 * flags so `vue-bundle-renderer`'s `getModuleDependencies` filters it out of
 * any page's dependency set; and, belt-and-suspenders, strip any reference
 * to such an id out of *every* entry's own `dynamicImports` list, so it's
 * never even discovered as a "dynamic import of a touched module" in the
 * first place (see that package's `dist/runtime.mjs`,
 * `getModuleDependencies`/`getAllDependencies`) — either change alone is
 * sufficient per that source, both together is defense in depth.
 *
 * Functionality is untouched: these chunks still load on demand via the
 * glob's own dynamic `import()` the moment a page actually needs one — they
 * were never legitimately prefetchable/preloadable at this scale
 * (prefetching "every chapter in the corpus" on every page defeats the
 * entire point of splitting content into per-chapter chunks).
 */

/** The subset of a `vue-bundle-renderer` manifest entry this mutates. */
export interface PrefetchableManifestEntry {
  prefetch?: boolean;
  preload?: boolean;
  dynamicImports?: string[];
}

/** Matches a manifest entry's key/src, or a `dynamicImports` target id. */
export const isContentChunkId = (id: string): boolean =>
  id.includes("content/parts/") || id.includes("content/toc.parts/");

/**
 * Mutates `manifest` in place: clears `prefetch`/`preload` on every
 * content-chunk entry, and drops content-chunk ids from every entry's
 * `dynamicImports` list. Returns `manifest` for convenience.
 */
export const stripContentChunkPrefetchHints = <
  T extends PrefetchableManifestEntry,
>(
  manifest: Record<string, T>,
): Record<string, T> => {
  for (const [key, entry] of Object.entries(manifest)) {
    if (isContentChunkId(key)) {
      entry.prefetch = false;
      entry.preload = false;
    }
    entry.dynamicImports = entry.dynamicImports?.filter(
      (id) => !isContentChunkId(id),
    );
  }

  return manifest;
};
