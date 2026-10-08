import type { ChapterKind } from "~~/shared/types/content";

/**
 * What the reader's first pane holds depends on the chapter. Only a
 * `chapter` is the Ari's text; the Introduction and Inner Observation are
 * Baal HaSulam's own writing, and the Q&A tables are his questions and
 * answers. Labelling them all "The Ari's Text" attributed Baal HaSulam's
 * words to the Ari.
 */
export const sourcePaneLabelKey = (kind: ChapterKind): string => {
  if (kind === "introduction") return "reader.pane.introduction";
  if (kind === "inner-observation") return "reader.pane.innerObservation";
  if (kind.startsWith("questions-")) return "reader.pane.questions";
  if (kind.startsWith("answers-")) return "reader.pane.answers";
  return "reader.pane.source";
};
