/**
 * Generic focus-trap + Escape-to-close for a modal-like overlay
 * (`CommentarySheet`, `ReadingPreferencesModal`): while `active` is true,
 * Tab/Shift+Tab cycle only through the container's own focusable elements,
 * Escape calls `onClose`, and focus moves into the container on open and
 * back to whatever was focused before once `active` goes false again.
 * Shared rather than duplicated in each overlay since both need the exact
 * same semantics.
 *
 * `flush: "post"` on the `active` watch so the container ref is guaranteed
 * to point at the freshly-mounted overlay (rendered via `v-if`) by the time
 * this looks for its focusable elements — the same reasoning
 * `useHighlightedAnchor` documents for its own post-flush DOM query.
 */
import type { Ref } from "vue";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export const useFocusTrap = (
  containerRef: Ref<HTMLElement | null | undefined>,
  active: Ref<boolean>,
  onClose: () => void,
): void => {
  let previouslyFocused: HTMLElement | null = null;

  const focusableElements = (): HTMLElement[] =>
    containerRef.value
      ? Array.from(
          containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        )
      : [];

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const elements = focusableElements();
    if (elements.length === 0) return;

    const first = elements[0] as HTMLElement;
    const last = elements[elements.length - 1] as HTMLElement;
    const current = document.activeElement;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

  watch(
    active,
    (isActive, _previous, onCleanup) => {
      if (!isActive) return;

      previouslyFocused = document.activeElement as HTMLElement | null;
      document.addEventListener("keydown", onKeydown);

      const toFocus = focusableElements()[0] ?? containerRef.value;
      toFocus?.focus();

      onCleanup(() => {
        document.removeEventListener("keydown", onKeydown);
        previouslyFocused?.focus();
        previouslyFocused = null;
      });
    },
    // `immediate: true` so a component that mounts *already* open (e.g. a
    // test mounting straight into `open: true`, or a future caller that
    // starts pre-opened) still gets the trap wired up — without it, a
    // plain `watch` only reacts to *changes*, and would silently miss the
    // "open from the very first render" case entirely.
    { flush: "post", immediate: true },
  );
};
