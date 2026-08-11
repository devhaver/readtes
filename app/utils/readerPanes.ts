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
 * the same to a reader — see `InnerObservationAbsence` below.
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

/**
 * Why no Inner Observation text is on screen — the two cases say different
 * things and get different copy.
 *
 * `never-written` is a fact about the corpus, not a hole in ours: Baal
 * HaSulam wrote a Histaklut Pnimit for eleven of the sixteen parts and none
 * for parts 5, 11, 14, 15 and 16 (2,193 chapters). Three independent sources
 * agree — Sefaria's index, his own 262 Hebrew cross-references (not one
 * points at those five parts, and each of their outbound references sends
 * the reader to *another* part's), and Bnei Baruch's published contents
 * listing. Telling those readers something is "not available yet" would
 * promise text that was never written.
 *
 * `not-in-this-edition` is the ordinary coverage gap the rest of the reader
 * already states honestly: the part does have an Inner Observation, the
 * selected edition just carries no text for it yet.
 *
 * Derived from the part's own `kind: "inner-observation"` chapter count
 * rather than a hardcoded list of part numbers — those chapters are absent
 * for exactly the five parts above, which
 * `tests/unit/inner-observation-absence.spec.ts` pins against the committed
 * ToC so a future import can never quietly turn a real gap into a claim
 * about what the author wrote.
 */
export type InnerObservationAbsence = "never-written" | "not-in-this-edition";

export const resolveInnerObservationAbsence = (
  partInnerObservationChapterCount: number,
): InnerObservationAbsence =>
  partInnerObservationChapterCount === 0
    ? "never-written"
    : "not-in-this-edition";

/** The one place each absence's sentence is named. */
export const INNER_OBSERVATION_ABSENCE_MESSAGE_KEYS: Record<
  InnerObservationAbsence,
  string
> = {
  "never-written": "reader.innerObservationNeverWritten",
  "not-in-this-edition": "reader.innerObservationEmpty",
};
