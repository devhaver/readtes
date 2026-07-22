/**
 * Provides a `ReaderPane`'s scroll container element to whatever pane
 * content (`SourcePane`/`CommentaryPane`/`SummaryPane`) it wraps, so those
 * components can pass it to `useHighlightedAnchor` without `ReaderPane`
 * needing to know anything about anchor highlighting itself.
 */
import type { InjectionKey, Ref } from "vue";

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
