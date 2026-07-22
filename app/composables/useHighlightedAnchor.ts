/**
 * Runs a single pane's side of the reader's two-way anchor sync: watches
 * the shared `activeAnchor`/`anchorOrigin`, and — only when the anchor
 * didn't originate in this pane — finds the target element inside this
 * pane's OWN container (never another pane's DOM), scrolls it into view,
 * and flashes a fading highlight.
 *
 * Anchor grammar per the content model: source uses `[data-anchor="id"]`
 * (the inline `<a class="tes-anchor">` marker); commentary items and the
 * summary mini-toc's `seif-N` source targets use a plain `id="…"` on the
 * item/segment element itself.
 */
import type { Ref } from "vue";
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

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Flashes `.is-highlighted` on `el`, then fades it back out over ~2s via
 * the CSS transition defined on `.reader-anchor-target` (see main.css).
 * Disabling the transition while applying the "on" state (then re-enabling
 * it a frame later, right before removing the class) makes the highlight
 * appear instantly and only the fade-out animate — a plain class toggle
 * would animate the fade-IN too.
 */
const flashHighlight = (el: HTMLElement) => {
  if (prefersReducedMotion()) {
    el.classList.add("is-highlighted-instant");
    setTimeout(() => el.classList.remove("is-highlighted-instant"), 900);
    return;
  }

  el.style.transition = "none";
  el.classList.add("is-highlighted");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = "";
      el.classList.remove("is-highlighted");
    });
  });
};

export const useHighlightedAnchor = (
  paneId: PaneId,
  containerRef: Ref<HTMLElement | null | undefined>,
): void => {
  const { activeAnchor, anchorOrigin } = useReaderState();

  watch([activeAnchor, anchorOrigin], ([anchorId, origin]) => {
    if (!anchorId || origin === paneId) return;

    const container = containerRef.value;
    if (!container) return;

    const target = findAnchorElement(container, anchorId);
    if (!target) return;

    target.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    flashHighlight(target);
  });
};
