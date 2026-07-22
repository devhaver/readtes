/**
 * Delegated click handling for "tap a source paragraph" (mobile panes swipe
 * mode's `CommentarySheet` trigger — T9): mirrors `useAnchorActivation`'s
 * shape/wiring (a single delegated listener on the pane's own scroll
 * container) so `SourcePane` keeps the same pattern for both of its
 * container-level click behaviours, but reports the seif number a plain
 * paragraph tap landed in rather than an anchor id.
 *
 * Ignores a click on any `<a>` — `.tes-anchor` markers are
 * `useAnchorActivation`'s concern, and any other in-content citation link
 * (e.g. the rewritten Sefaria cross-references — see `sanitizeHtml.ts`)
 * should navigate normally rather than open the sheet. `SourcePane` gives
 * each segment's own `<li>` a `data-seif="N"` attribute for this to key off.
 */
import type { Ref } from "vue";

export const useSeifTapActivation = (
  containerRef: Ref<HTMLElement | null | undefined>,
  onTapSeif: (seifN: number) => void,
): void => {
  const onContainerClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a")) return;

    const li = target?.closest<HTMLElement>("li[data-seif]");
    const seifAttr = li?.dataset.seif;
    if (!seifAttr) return;

    const seifN = Number.parseInt(seifAttr, 10);
    if (Number.isNaN(seifN)) return;

    onTapSeif(seifN);
  };

  watchEffect((onCleanup) => {
    const container = containerRef.value;
    if (!container) return;

    container.addEventListener("click", onContainerClick);
    onCleanup(() => container.removeEventListener("click", onContainerClick));
  });
};
