/**
 * Runs a single pane's side of the reader's two-way anchor sync: watches
 * the shared `activeAnchor`/`anchorOrigin`, and — only when the anchor
 * didn't originate in this pane — finds the target element inside this
 * pane's OWN container (never another pane's DOM), scrolls it into view,
 * and flashes a fading highlight.
 *
 * Anchor grammar per the content model: source uses `[data-anchor="id"]`
 * (the inline `<a class="tes-anchor">` marker); commentary items use a
 * plain `id="…"` on the item element itself.
 *
 * Finding (and highlighting) the target here is also the single source of
 * truth for `activePane` in mobile panes swipe mode (T9): whichever pane
 * actually resolves the current anchor calls `setActivePane(paneId)`, so a
 * source-origin activation correctly lands the swipe track on the
 * *commentary* slide (where the highlight lands), not back on the source
 * slide it started from — see `setActivePaneState`'s doc comment. This is a
 * no-op call in desktop panes mode and study mode (neither reads
 * `activePane`), so it costs nothing there.
 */
import type { Ref } from "vue";
import { flashAnchorHighlight } from "~/utils/anchorHighlight";
import { prefersReducedMotion } from "~/utils/motion";
import type { PaneId } from "~/utils/readerAnchorState";

const findAnchorElement = (
  container: HTMLElement,
  anchorId: string,
): HTMLElement | null => {
  const escaped =
    typeof CSS !== "undefined" && "escape" in CSS
      ? CSS.escape(anchorId)
      : anchorId;

  return (
    container.querySelector<HTMLElement>(`[data-anchor="${escaped}"]`) ??
    container.querySelector<HTMLElement>(`#${escaped}`)
  );
};

/**
 * Opens every collapsed `<details>` between `target` and `container`.
 *
 * Without this, a cross-pane activation into a folded group silently does
 * nothing that the reader can see: the element is still in the document (it
 * is found above, and in-page find can still reach it), but a closed
 * `<details>` renders its contents `display: none`, so `scrollIntoView` has
 * no box to scroll to and the highlight flashes where nobody is looking.
 * Clicking `(20)` in the Ari's text must open the seif group holding note
 * 20, not appear to do nothing.
 *
 * Stops at the pane container so this can never reach out and open chrome
 * that happens to wrap the pane.
 */
const revealInsideCollapsedGroups = (
  target: HTMLElement,
  container: HTMLElement,
): void => {
  let node: HTMLElement | null = target.parentElement;
  while (node && node !== container) {
    if (node instanceof HTMLDetailsElement && !node.open) node.open = true;
    node = node.parentElement;
  }
};

export const useHighlightedAnchor = (
  paneId: PaneId,
  containerRef: Ref<HTMLElement | null | undefined>,
): void => {
  const { activeAnchor, anchorOrigin, activationSeq, setActivePane } =
    useReaderState();

  // Watches `activationSeq` alongside the anchor id/origin so the highlight
  // re-fires on events that don't change those values themselves: re-
  // clicking the same anchor (`activateAnchor` always bumps the sequence),
  // and a version switch reconciling which element the current anchor now
  // targets (`reactivateAnchor`). `flush: "post"` runs the callback after
  // the DOM has been patched, so a version switch's newly-rendered element
  // (e.g. the commentary item that only exists once the Hebrew version
  // loads) is present in the container by the time this queries for it.
  watch(
    [activeAnchor, anchorOrigin, activationSeq],
    ([anchorId, origin]) => {
      if (!anchorId || origin === paneId) return;

      const container = containerRef.value;
      if (!container) return;

      const target = findAnchorElement(container, anchorId);
      if (!target) return;

      revealInsideCollapsedGroups(target, container);

      setActivePane(paneId);
      target.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      flashAnchorHighlight(target);
    },
    { flush: "post" },
  );
};
