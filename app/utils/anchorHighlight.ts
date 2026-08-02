/**
 * Flashes `.is-highlighted` on a jump target, then fades it back out over
 * ~2s via the CSS transition defined on `.reader-anchor-target`/`.tes-anchor`
 * (see `main.css`). Disabling the transition while applying the "on" state
 * (then re-enabling it a frame later, right before removing the class)
 * makes the highlight appear instantly and only the fade-out animate — a
 * plain class toggle would animate the fade-IN too.
 *
 * Shared by `useHighlightedAnchor` (the cross-pane anchor sync) and
 * `ReaderSummaryBody`'s mini-ToC (a same-pane jump — see that component —
 * that still benefits from the same "you're here now" flash without
 * needing any of the cross-pane sync machinery).
 */
import { prefersReducedMotion } from "~/utils/motion";

export const flashAnchorHighlight = (el: HTMLElement): void => {
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
