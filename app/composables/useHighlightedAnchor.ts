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

/**
 * A target taller than this share of the pane is a long note, not a marker.
 */
const LONG_TARGET_RATIO = 0.5;

/**
 * Brings `target` into view inside `container`. Centring is right for a
 * marker or a short note, but a long commentary note centred is cut off at
 * its top — the reader lands mid-note, or under the sticky seif heading — so
 * those align to the top edge instead, below that heading via the item's
 * `scroll-margin-block-start`.
 */
const scrollTargetIntoView = (
  target: HTMLElement,
  container: HTMLElement,
): void => {
  const isLong =
    target.getBoundingClientRect().height >
    container.clientHeight * LONG_TARGET_RATIO;

  target.scrollIntoView({
    block: isLong ? "start" : "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
};

/**
 * When the activation came from the keyboard on a note marker in the OTHER
 * pane, focus follows the jump: otherwise it stays on the marker, and the
 * next Tab continues from a place the reader has just scrolled away from.
 * `:focus-visible` is the keyboard test (a mouse click on a marker does not
 * match it); the marker check keeps this from pulling focus out of anything
 * else that happens to trigger a re-activation (a language `<select>`).
 */
const moveFocusToTarget = (
  target: HTMLElement,
  container: HTMLElement,
): void => {
  const active = document.activeElement;
  if (
    !(active instanceof HTMLElement) ||
    container.contains(active) ||
    !active.matches(".tes-anchor:focus-visible")
  ) {
    return;
  }

  if (!target.matches("a[href], button, [tabindex]")) {
    target.setAttribute("tabindex", "-1");
  }
  target.focus({ preventScroll: true });
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
      scrollTargetIntoView(target, container);
      moveFocusToTarget(target, container);
      flashAnchorHighlight(target);
    },
    { flush: "post" },
  );
};
