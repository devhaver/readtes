/**
 * Resolves the commentary pane's "not available in this edition" notice: a
 * source anchor was activated, but the commentary version currently shown
 * doesn't have an item for it (e.g. the chapter's English commentary is
 * missing, or doesn't cover that anchor). Pure and testable independent of
 * the DOM — `useHighlightedAnchor` finding no matching element would work
 * too, but can't distinguish "not in this edition" from "not mounted yet".
 */
import type { CommentaryItem } from "~~/shared/types/content";
import type { PaneId } from "./readerAnchorState";

/** Anchor id grammar for Ohr Penimi commentary markers (see AGENTS.md). */
const isCommentaryAnchor = (id: string): boolean => id.startsWith("op-");

export interface MissingAnchorNotice {
  anchorId: string;
  /** Whether the chapter's Hebrew commentary version does have this anchor. */
  canSwitchToHebrew: boolean;
}

export interface AnchorAvailability {
  /** `true` when `anchorId` has no item in the currently-displayed version. */
  missing: boolean;
  /** Whether the chapter's Hebrew commentary version does have this anchor. */
  canSwitchToHebrew: boolean;
}

/**
 * Core "is this anchor missing from the commentary version currently
 * shown, and can the reader one-click over to Hebrew instead" rule, keyed
 * by a single `anchorId` — shared by `resolveMissingAnchorNotice` (panes
 * mode's single global toast, gated to the one `activeAnchor`) and study
 * mode's `StudyStream`, which runs this once per anchor in
 * `expandedAnchors` (several can be open at once, unlike panes mode's
 * single active anchor).
 */
export const resolveAnchorAvailability = (params: {
  anchorId: string;
  /** Items of the commentary version currently displayed (empty if none loaded). */
  displayedItems: CommentaryItem[];
  /** The chapter's currently-selected commentary version id, if any. */
  selectedVersionId: string | null;
  /** Items of the chapter's `he-jerusalem-1956` commentary version, if it exists. */
  hebrewItems: CommentaryItem[] | null;
  hebrewVersionId: string;
}): AnchorAvailability => {
  const alreadyShown = params.displayedItems.some(
    (item) => item.anchorId === params.anchorId,
  );
  if (alreadyShown) return { missing: false, canSwitchToHebrew: false };

  const isHebrewSelected = params.selectedVersionId === params.hebrewVersionId;
  const hebrewHasAnchor =
    !isHebrewSelected &&
    (params.hebrewItems?.some((item) => item.anchorId === params.anchorId) ??
      false);

  return { missing: true, canSwitchToHebrew: hebrewHasAnchor };
};

export const resolveMissingAnchorNotice = (params: {
  activeAnchor: string | null;
  anchorOrigin: PaneId | null;
  /** Items of the commentary version currently displayed (empty if none loaded). */
  displayedItems: CommentaryItem[];
  /** The chapter's currently-selected commentary version id, if any. */
  selectedVersionId: string | null;
  /** Items of the chapter's `he-jerusalem-1956` commentary version, if it exists. */
  hebrewItems: CommentaryItem[] | null;
  hebrewVersionId: string;
}): MissingAnchorNotice | null => {
  const { activeAnchor, anchorOrigin } = params;

  // Only a source-originated click is "found nothing in this edition" — a
  // summary-pane mini-toc jump targets a `seif-N` source id, not a
  // commentary anchor, and a commentary-originated click can't be missing
  // from its own pane.
  if (anchorOrigin !== "source") return null;
  if (!activeAnchor || !isCommentaryAnchor(activeAnchor)) return null;

  const availability = resolveAnchorAvailability({
    anchorId: activeAnchor,
    displayedItems: params.displayedItems,
    selectedVersionId: params.selectedVersionId,
    hebrewItems: params.hebrewItems,
    hebrewVersionId: params.hebrewVersionId,
  });
  if (!availability.missing) return null;

  return {
    anchorId: activeAnchor,
    canSwitchToHebrew: availability.canSwitchToHebrew,
  };
};
