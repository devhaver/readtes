/**
 * Mirrors a persisted reader preference onto `<html>` as a `data-pref-*`
 * attribute, so CSS can apply it BEFORE hydration.
 *
 * The preference composables (`useReadingPreferences`,
 * `useReaderThirdPane`, `useCollapsedReaderChrome`, `useReaderMode`)
 * deliberately ignore `localStorage` until `onMounted`, so the first client
 * render matches the prerendered HTML. The cost was a visible layout jump
 * for every returning visitor (CLS 0.356): text size, the collapsed third
 * pane and the collapsed toolbar all applied a frame after first paint.
 *
 * The inline script in `nuxt.config.ts` (`READER_PREFS_HEAD_SCRIPT`) sets
 * these attributes from the same storage keys before first paint — the way
 * color-mode sets its class — and `main.css` drives layout from them. This
 * composable keeps them in step afterwards, when the reader changes a
 * preference. It reads the PERSISTED value, never the hydration-gated one:
 * the gated value is the default until mount and would clear the
 * attribute the script just set. `<html>` sits outside Vue's root, so
 * touching it cannot cause a hydration mismatch.
 */
import type { WatchSource } from "vue";

export const useRootDataAttribute = (
  name: string,
  value: WatchSource<string | null>,
): void => {
  if (!import.meta.client) return;

  watch(
    value,
    (next) => {
      const root = document.documentElement;
      if (next === null) root.removeAttribute(name);
      else root.setAttribute(name, next);
    },
    { immediate: true },
  );
};
