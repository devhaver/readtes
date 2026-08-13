/**
 * The marker text the CURRENTLY DISPLAYED source version prints for each of
 * its anchors — so every surface that labels a commentary note can use the
 * very characters the reader sees and clicks in the Ari's text.
 *
 * The stored `CommentaryItem.label` now agrees with these markers —
 * `scripts/migrate-commentary-labels.ts` corrected the committed files from
 * this same source and `validate-content.ts`'s
 * `checkCommentaryLabelMatchesSourceMarker` keeps them in step (issue #96).
 * So this is no longer compensating for bad data.
 *
 * It stays the right rule on its own terms: the marker belongs to a source
 * VERSION, and the two panes can each be showing a different language. Taking
 * it from whichever source is on screen means a Hebrew source pane yields
 * "כ" and the commentary pane shows "כ" beside it, while an English source
 * pane yields "20" and the commentary shows "20" — always the characters the
 * reader can actually see and click.
 */
import type { SourceSegment } from "~~/shared/types/content";
import { anchorMarkersFromHtml } from "~~/shared/utils/anchorMarkers";

/** `anchorId` -> the marker these segments print for it. */
export const anchorMarkersFromSegments = (
  segments: SourceSegment[],
): Map<string, string> =>
  anchorMarkersFromHtml(segments.map((segment) => segment.html));
