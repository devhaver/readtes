/**
 * Dispatches to one part's `content/parts/part-NN/**` glob map
 * (`useChapterContent`'s docblock has the measurement/rationale for why
 * this is split per part). The map is one hand-written file per part
 * (`part-01.ts`…`part-16.ts`) rather than a single helper parameterized by
 * `partId`, because `import.meta.glob` patterns are statically analyzed by
 * Vite's glob-import plugin at build time and must be literal strings — a
 * template-literal or computed pattern simply isn't seen by the plugin.
 *
 * Resolved modules are cached in `resolvedModules` keyed by `partId` so
 * loading a second chapter from the same part (the common case — a reader
 * page's own part, then `usePartScopedSections`'s part-scoped pane)
 * doesn't re-run `import()` for a module already resolved.
 */
type PartContentModules = Record<string, () => Promise<{ default: unknown }>>;

const partLoaders: Record<
  string,
  () => Promise<{ default: PartContentModules }>
> = {
  "part-01": () => import("./part-01"),
  "part-02": () => import("./part-02"),
  "part-03": () => import("./part-03"),
  "part-04": () => import("./part-04"),
  "part-05": () => import("./part-05"),
  "part-06": () => import("./part-06"),
  "part-07": () => import("./part-07"),
  "part-08": () => import("./part-08"),
  "part-09": () => import("./part-09"),
  "part-10": () => import("./part-10"),
  "part-11": () => import("./part-11"),
  "part-12": () => import("./part-12"),
  "part-13": () => import("./part-13"),
  "part-14": () => import("./part-14"),
  "part-15": () => import("./part-15"),
  "part-16": () => import("./part-16"),
};

const resolvedModules = new Map<string, PartContentModules>();

export const loadPartContentModules = async (
  partId: string,
): Promise<PartContentModules | null> => {
  const cached = resolvedModules.get(partId);
  if (cached) return cached;

  const loader = partLoaders[partId];
  if (!loader) return null;

  const mod = (await loader()).default;
  resolvedModules.set(partId, mod);
  return mod;
};
