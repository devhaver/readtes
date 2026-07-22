/**
 * The reading-preferences modal's font-size scale: 4 steps, persisted per
 * visitor. Theme and UI language already have their own persistence (colour
 * mode's own storage via `@nuxtjs/color-mode`; UI language via the route
 * locale/`switchLocalePath`, `@nuxtjs/i18n`'s own concern) — this composable
 * only owns the one preference that's genuinely new here.
 *
 * Provide/inject singleton, same shape as `useReaderMode`/`useReaderState`:
 * `layouts/reader.vue` calls this first (to read `scale` for the
 * `data-reading-scale` attribute on the reader root — see that layout and
 * `main.css`'s `--reading-scale` rules), so it becomes the provider;
 * `ReadingPreferencesModal`'s later call just injects that same instance.
 *
 * Hydration note (same shape as `useReaderMode`/`useReaderVersions`):
 * `useLocalStorage` reads `localStorage` synchronously in `setup`, but
 * prerendering has no `localStorage` and always renders at the default
 * scale. Consulting the persisted value immediately would make a returning
 * visitor's first client render (used for hydration) diverge from the
 * prerendered HTML - a hydration mismatch. `hydrated` gates the persisted
 * read until `onMounted`, so the very first render (server and client
 * alike) always resolves to `DEFAULT_SCALE`; the persisted value reconciles
 * in right after mount.
 */
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef, InjectionKey } from "vue";

/** 1 = smallest, 4 = largest — see `main.css`'s `[data-reading-scale]` rules for the actual multipliers. */
export type ReadingScale = 1 | 2 | 3 | 4;

export const READING_SCALE_STEPS: readonly ReadingScale[] = [1, 2, 3, 4];
export const DEFAULT_READING_SCALE: ReadingScale = 2;

const STORAGE_KEY = "readtes:reading-scale";

export interface ReadingPreferences {
  scale: ComputedRef<ReadingScale>;
  setScale: (scale: ReadingScale) => void;
}

const READING_PREFERENCES_KEY: InjectionKey<ReadingPreferences> = Symbol(
  "reading-preferences",
);

const createReadingPreferences = (): ReadingPreferences => {
  const persisted = useLocalStorage<ReadingScale>(
    STORAGE_KEY,
    DEFAULT_READING_SCALE,
  );

  // Gates the persisted read until after mount — see the module doc above.
  const hydrated = ref(false);
  onMounted(() => {
    hydrated.value = true;
  });

  const scale = computed(() =>
    hydrated.value ? persisted.value : DEFAULT_READING_SCALE,
  );

  const setScale = (next: ReadingScale) => {
    persisted.value = next;
  };

  return { scale, setScale };
};

export const useReadingPreferences = (): ReadingPreferences => {
  const existing = inject(READING_PREFERENCES_KEY, null);
  if (existing) return existing;

  const state = createReadingPreferences();
  provide(READING_PREFERENCES_KEY, state);
  return state;
};
