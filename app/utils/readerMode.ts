/**
 * Pure default-resolution rule for the reader's mode toggle
 * (`useReaderMode`): study (single scrolling stream, commentary folds in
 * inline) vs panes (the T7 three-aligned-panes layout).
 *
 * Viewport is unknowable during prerendering/SSR (there is no `window`),
 * and re-checking it in the very first client render (used for hydration)
 * would diverge from that prerendered markup — the same hydration hazard
 * `useReaderVersions` documents for persisted version prefs. The fix here
 * is the same shape: `resolveReaderMode` always returns the fixed,
 * viewport-independent `FIXED_PREMOUNT_MODE` until `hydrated` is true, so
 * SSR output and the client's pre-mount render are always identical byte
 * for byte. Only after `onMounted` does the real viewport (and any
 * persisted user override) get consulted — see `useReaderMode`.
 *
 * `FIXED_PREMOUNT_MODE` is "panes" specifically because that's what every
 * one of this repo's 238 prerendered `/read/**` routes already ships
 * (T7 — the three-pane layout with no viewport branching at all): keeping
 * it as the fixed pre-mount default means this task changes zero bytes of
 * existing prerendered HTML, and mobile visitors see that same markup for
 * one frame before JS swaps them into study mode, instead of any route's
 * static output changing shape.
 */
export type ReaderMode = "study" | "panes";

/** Matches Tailwind's `lg` breakpoint (1024px) — study mode below it, panes at/above. */
export const STUDY_MODE_MEDIA_QUERY = "(max-width: 1023.98px)";

export const FIXED_PREMOUNT_MODE: ReaderMode = "panes";

export const resolveReaderMode = (params: {
  hydrated: boolean;
  /** The user's persisted explicit choice, if any — always wins once hydrated. */
  override: ReaderMode | null;
  /** `true` when `STUDY_MODE_MEDIA_QUERY` currently matches. */
  prefersStudyViewport: boolean;
}): ReaderMode => {
  if (!params.hydrated) return FIXED_PREMOUNT_MODE;
  if (params.override) return params.override;
  return params.prefersStudyViewport ? "study" : "panes";
};
