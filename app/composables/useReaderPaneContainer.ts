/**
 * Provides a `ReaderPane`'s scroll container element to whatever pane
 * content (`SourcePane`/`CommentaryPane`) it wraps, so those components can
 * pass it to `useHighlightedAnchor` without `ReaderPane` needing to know
 * anything about anchor highlighting itself. `InnerObservationPane` is also
 * wrapped in a `ReaderPane`, but never calls this — it never participates
 * in anchor sync (see that component).
 */
import type { ComputedRef, InjectionKey, Ref } from "vue";
import type { ContentVersion } from "~~/shared/types/content";

const READER_PANE_CONTAINER_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol(
  "reader-pane-container",
);

/** Called once by `ReaderPane` itself. */
export const provideReaderPaneContainer = (): Ref<HTMLElement | null> => {
  const containerRef = ref<HTMLElement | null>(null);
  provide(READER_PANE_CONTAINER_KEY, containerRef);
  return containerRef;
};

/** Called by the pane content rendered inside a `ReaderPane`. */
export const useReaderPaneContainer = (): Ref<HTMLElement | null> => {
  const containerRef = inject(READER_PANE_CONTAINER_KEY, null);
  if (!containerRef) {
    throw new Error(
      "useReaderPaneContainer() called without a ReaderPane ancestor",
    );
  }
  return containerRef;
};

/**
 * The `dir`/`lang` of the TEXT a `ReaderPane` shows — for the content lists
 * to bind, instead of the pane body carrying them. The body also holds UI
 * chrome (empty/failed notes, absence footnotes, status lines), and chrome
 * must keep the UI locale: a Hebrew edition on a Spanish page used to turn
 * the Spanish copy RTL in the Hebrew face, and a Russian page's copy got
 * `lang="en"` from an English edition.
 */
export interface ReaderPaneContentAttrs {
  dir?: "ltr" | "rtl";
  lang?: string;
}

const READER_PANE_CONTENT_KEY: InjectionKey<
  ComputedRef<ReaderPaneContentAttrs>
> = Symbol("reader-pane-content-attrs");

/** Called once by `ReaderPane` itself. */
export const provideReaderPaneContentAttrs = (
  meta: () => ContentVersion | null,
): void => {
  provide(
    READER_PANE_CONTENT_KEY,
    computed(() => {
      const version = meta();
      return version
        ? { dir: version.direction, lang: version.language }
        : { dir: "ltr" as const };
    }),
  );
};

/** Called by the pane content rendered inside a `ReaderPane`; empty outside one. */
export const useReaderPaneContentAttrs =
  (): ComputedRef<ReaderPaneContentAttrs> =>
    inject(
      READER_PANE_CONTENT_KEY,
      computed(() => ({})),
    );
