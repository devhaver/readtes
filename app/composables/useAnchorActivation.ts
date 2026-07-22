/**
 * Delegated click/keyboard activation for a container's `a.tes-anchor[data-anchor]`
 * markers (Sefaria's inline commentary anchors, normalized at import time —
 * see `app/utils/anchors.ts`). Bound imperatively via `addEventListener`
 * (not a template `@click`) so the container itself — not an interactive
 * element — isn't flagged by `vuejs-accessibility/no-static-element-interactions`;
 * the actual interactive elements are the `<a>` tags, which already have a
 * working `href="#op-N"` no-JS fallback.
 *
 * Extracted from `SourcePane` (T7) so `StudyStream` (T8) gets the exact
 * same activation behaviour — including the Enter-key double-fire guard
 * below — without duplicating it: only what happens on activation (`onActivate`)
 * differs between panes mode (`activateAnchor`) and study mode
 * (`activateAnchor` + `toggleInline`).
 */
import type { Ref } from "vue";

const anchorIdFromEvent = (event: Event): string | undefined => {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest<HTMLAnchorElement>(
    "a.tes-anchor[data-anchor]",
  );
  return anchor?.dataset.anchor;
};

export const useAnchorActivation = (
  containerRef: Ref<HTMLElement | null | undefined>,
  onActivate: (anchorId: string) => void,
): void => {
  // A focused `<a href>`'s native Enter activation fires both a `keydown`
  // (handled here, since Space also needs handling and anchors don't
  // natively activate on Space) and a browser-synthesized `click` right
  // after — without a guard, that click would re-run `onActivate` for the
  // same Enter press. `suppressNextClickId` records the id an Enter keydown
  // just activated so the following synthetic click for that same id is a
  // no-op; cleared on a microtask so it can never suppress a later *real*
  // click.
  let suppressNextClickId: string | null = null;

  const onContainerClick = (event: MouseEvent) => {
    const id = anchorIdFromEvent(event);
    if (!id) return;
    if (suppressNextClickId === id) {
      suppressNextClickId = null;
      return;
    }
    event.preventDefault();
    onActivate(id);
  };

  const onContainerKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const id = anchorIdFromEvent(event);
    if (!id) return;
    event.preventDefault();
    onActivate(id);

    if (event.key === "Enter") {
      suppressNextClickId = id;
      queueMicrotask(() => {
        if (suppressNextClickId === id) suppressNextClickId = null;
      });
    }
  };

  watchEffect((onCleanup) => {
    const container = containerRef.value;
    if (!container) return;

    container.addEventListener("click", onContainerClick);
    container.addEventListener("keydown", onContainerKeydown);
    onCleanup(() => {
      container.removeEventListener("click", onContainerClick);
      container.removeEventListener("keydown", onContainerKeydown);
    });
  });
};
