/**
 * Persists an independently scrolling reader pane on its browser-history
 * entry. Leaving a chapter replaces only the current entry's state; Back or
 * Forward then restores each pane after its DOM has mounted.
 */
const STATE_KEY = "readtesPaneScroll";

type PaneScrollState = Record<string, number>;

export const withPaneScrollPosition = (
  state: Record<string, unknown> | null,
  paneId: string,
  scrollTop: number,
): Record<string, unknown> => {
  const current = state ?? {};
  const existing = (current[STATE_KEY] ?? {}) as PaneScrollState;
  return {
    ...current,
    [STATE_KEY]: { ...existing, [paneId]: scrollTop },
  };
};

export const paneScrollPosition = (
  state: Record<string, unknown> | null,
  paneId: string,
): number | null => {
  const value = ((state?.[STATE_KEY] ?? {}) as PaneScrollState)[paneId];
  return typeof value === "number" ? value : null;
};

export const usePaneScrollHistory = (
  containerRef: Ref<HTMLElement | null>,
  paneId: string,
): void => {
  const save = () => {
    if (!import.meta.client || !containerRef.value) return;
    history.replaceState(
      withPaneScrollPosition(
        history.state,
        paneId,
        containerRef.value.scrollTop,
      ),
      "",
    );
  };

  const restore = async () => {
    if (!import.meta.client) return;
    await nextTick();
    const scrollTop = paneScrollPosition(history.state, paneId);
    if (containerRef.value && scrollTop !== null) {
      containerRef.value.scrollTop = scrollTop;
    }
  };

  onMounted(() => void restore());
  onBeforeRouteLeave(() => save());
  onBeforeUnmount(save);
};
