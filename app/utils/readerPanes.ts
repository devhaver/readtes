/**
 * Which reader panes actually exist for a chapter — pure resolution rule
 * for the panes-mode layout (`ReaderShell`/`MobileSwipePanes`/
 * `MobilePanePill` all render from this list).
 *
 * The corpus is honest about its own gaps and the reader must be too:
 * Sefaria's Ohr Penimi index covers only 25 of the 5,148 chapters, so the
 * Inner Light layer is *absent* (no version in any edition) for ~99.5% of
 * chapters, and five parts have no Inner Observation chapters at all (see
 * AGENTS.md / the content model skill). Rendering a pane for an absent
 * layer produced a full-height empty column — this list is what lets the
 * layout collapse to two panes or a single centered reading column
 * instead, with `ReaderLayerAbsenceNote` carrying the "not digitized yet"
 * explanation inside the Source pane.
 *
 * Source is unconditionally present: every chapter in the corpus has a
 * Hebrew source text at minimum (`validate:content` enforces the file's
 * existence), so there is always at least one pane.
 */
import { PANE_ORDER } from "~/utils/mobilePaneSync";
import type { PaneId } from "~/utils/readerAnchorState";

export interface ReaderPaneAvailability {
  /** The chapter has at least one commentary (Inner Light) version. */
  hasCommentary: boolean;
  /** The chapter's part has `kind: "inner-observation"` chapters. */
  hasInnerObservation: boolean;
}

export const resolveReaderPanes = ({
  hasCommentary,
  hasInnerObservation,
}: ReaderPaneAvailability): PaneId[] =>
  PANE_ORDER.filter(
    (pane) =>
      pane === "source" ||
      (pane === "commentary" && hasCommentary) ||
      (pane === "inner-observation" && hasInnerObservation),
  );
