/**
 * Which source seif the reader is currently looking at, shared across panes.
 *
 * The commentary pane needs this and cannot get it on its own: each pane
 * owns an independent scroll container (`ReaderPane`/`useReaderPaneContainer`)
 * and only the source pane's container holds the `[data-seif]` elements. So
 * the source pane measures (`useTrackedSeifPosition`) and writes here, and
 * the commentary pane reads — the same provide/inject singleton shape as
 * `useCommentarySheet`/`useReaderState`, with the reader page calling it
 * first so every pane beneath injects the one instance.
 *
 * Deliberately NOT folded into `useReaderState`: that state is the
 * *anchor* pipeline (a discrete activation with an origin pane, which
 * scrolls and flashes a highlight). This is a continuous scroll-derived
 * position that must never scroll anything by itself, and conflating the
 * two would make every scroll look like an anchor activation.
 */
import type { InjectionKey, Ref } from "vue";

export interface CurrentSeifState {
  /** `null` until the source pane has measured — never assume a seif exists. */
  currentSeif: Ref<number | null>;
  setCurrentSeif: (seifN: number | null) => void;
}

const CURRENT_SEIF_KEY: InjectionKey<CurrentSeifState> = Symbol("current-seif");

const createCurrentSeif = (): CurrentSeifState => {
  const currentSeif = ref<number | null>(null);

  return {
    currentSeif,
    setCurrentSeif: (seifN) => {
      currentSeif.value = seifN;
    },
  };
};

export const useCurrentSeif = (): CurrentSeifState => {
  const existing = inject(CURRENT_SEIF_KEY, null);
  if (existing) return existing;

  const state = createCurrentSeif();
  provide(CURRENT_SEIF_KEY, state);
  return state;
};

/**
 * The observation band: the top 35% of the scroll container. `rootMargin`'s
 * bottom inset of -65% shrinks the observed area to that strip, so
 * "intersecting" means "in the band the reader's eye is actually in" rather
 * than "anywhere on screen" — without it, a short seif at the very bottom
 * of a tall viewport would count as current while the reader is still three
 * seifim above it.
 */
const OBSERVATION_BAND_MARGIN = "0px 0px -65% 0px";

/**
 * Reports the topmost seif inside `containerRef`'s observation band into
 * `useCurrentSeif`, for as long as the calling component is mounted.
 *
 * Holds the last value when the band contains no seif at all instead of
 * falling back to `null`: a seif longer than the band (common — Inner
 * Observation aside, plenty of seifim run past a third of the viewport)
 * would otherwise blank the position out mid-paragraph and make anything
 * keyed off it flicker.
 */
export const useTrackedSeifPosition = (
  containerRef: Ref<HTMLElement | null>,
  /**
   * Anything whose change means the container's `[data-seif]` elements have
   * been replaced — pass the segment list. Watched, not read, so the caller
   * decides what identity means.
   */
  segmentsKey?: () => unknown,
): void => {
  const { setCurrentSeif } = useCurrentSeif();

  const visible = new Set<number>();
  let observer: IntersectionObserver | null = null;

  const commit = () => {
    if (visible.size === 0) return;
    setCurrentSeif(Math.min(...visible));
  };

  const onIntersect: IntersectionObserverCallback = (entries) => {
    for (const entry of entries) {
      const raw = (entry.target as HTMLElement).dataset.seif;
      const seifN = raw === undefined ? Number.NaN : Number(raw);
      if (!Number.isFinite(seifN)) continue;

      if (entry.isIntersecting) visible.add(seifN);
      else visible.delete(seifN);
    }
    commit();
  };

  const detach = () => {
    observer?.disconnect();
    observer = null;
    visible.clear();
  };

  const attach = () => {
    const container = containerRef.value;
    if (typeof IntersectionObserver === "undefined" || !container) return;

    detach();
    observer = new IntersectionObserver(onIntersect, {
      root: container,
      rootMargin: OBSERVATION_BAND_MARGIN,
    });
    for (const el of container.querySelectorAll<HTMLElement>("[data-seif]")) {
      observer.observe(el);
    }
  };

  // Re-attaches when the container element OR its segment list changes — a
  // chapter navigation keeps this component (and usually the container
  // element itself) mounted while replacing every `[data-seif]` inside it,
  // and an observer still holding the old nodes reports a position from a
  // chapter the reader has left. `flush: "post"` so the new segments are in
  // the DOM before we query for them.
  watch([containerRef, () => segmentsKey?.()], attach, { flush: "post" });

  onMounted(attach);
  onUnmounted(detach);
};
