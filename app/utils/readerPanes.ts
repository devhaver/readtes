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
 * instead, with `ReaderLayerAbsenceNote` carrying the explanation inside
 * the Source pane. The two absences are different in kind and must not read
 * the same to a reader — see `ReaderLayerAbsenceNote`'s docblock.
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
  /**
   * The chapter's part has content for at least one of the third pane's
   * tabs — Inner Observation, Questions, or Answers.
   *
   * This used to be `hasInnerObservation` alone, and the pane vanished for
   * the five parts Baal HaSulam wrote no Inner Observation for. Since the
   * pane became tabbed, every part has Questions and Answers (issue #91
   * consolidated them to one chapter per kind), so in practice this is now
   * always true — it stays a parameter rather than becoming an assumption
   * because "every part has a Q&A table" is a fact about the corpus, not
   * about the layout, and the layout should not silently break if a future
   * part arrives without one.
   *
   * The absence of Inner Observation specifically is still told to the
   * reader, unchanged, by `ReaderLayerAbsenceNote` in the Source pane —
   * those parts simply get a two-tab third pane rather than a tab that
   * opens onto an apology.
   */
  hasThirdPane: boolean;
}

export const resolveReaderPanes = ({
  hasCommentary,
  hasThirdPane,
}: ReaderPaneAvailability): PaneId[] =>
  PANE_ORDER.filter(
    (pane) =>
      pane === "source" ||
      (pane === "commentary" && hasCommentary) ||
      (pane === "inner-observation" && hasThirdPane),
  );
