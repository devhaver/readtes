/**
 * Pure helpers over a Sefaria `/api/v2/index/{title}` response: resolving a
 * part's main-text node and its sibling nodes, and mapping sibling node
 * titles to our `ChapterKind`s.
 */
import type { ChapterKind } from "../../shared/types/content.ts";
import type { SefariaIndex, SefariaIndexNode } from "./sefaria-api-types.ts";

/**
 * Sibling node title (English, primary) -> ChapterKind. Deliberately not
 * exhaustive of every section — Sefaria's sibling node set varies slightly
 * per section (Section VI is the only one with the Cause and Effect tables,
 * some sections omit "Histaklut Penimit" entirely). Unknown titles
 * are reported by `mapNodeTitleToKind` returning `undefined` — callers must
 * surface that as a warning, never guess a kind.
 */
const KIND_BY_NODE_TITLE: Record<string, ChapterKind> = {
  Introduction: "introduction",
  "Histaklut Penimit": "inner-observation",
  "List of Questions on Terminology": "questions-terminology",
  "List of Questions on Topics": "questions-topics",
  "List of Answers on Terminology": "answers-terminology",
  "List of Answers on Topics": "answers-topics",
  "List of Questions on Cause and Effect": "questions-cause-effect",
  "List of Answers on Cause and Effect": "answers-cause-effect",
};

export const mapNodeTitleToKind = (
  nodeTitle: string,
): ChapterKind | undefined => KIND_BY_NODE_TITLE[nodeTitle];

/**
 * Given `toc.json`'s `sefariaNode` (e.g. `"Talmud Eser HaSefirot, Section
 * I"`) and the book's index, finds that section's schema node (the branch
 * holding the main-text "default" node and its siblings).
 */
export const findSectionNode = (
  index: SefariaIndex,
  sefariaNode: string,
): SefariaIndexNode | undefined => {
  const prefix = `${index.title}, `;
  const sectionTitle = sefariaNode.startsWith(prefix)
    ? sefariaNode.slice(prefix.length)
    : sefariaNode;
  return index.schema.nodes.find((node) => node.title === sectionTitle);
};

/**
 * The book-level nodes: top-level schema nodes that are NOT a Section, and so
 * are reached by no part's `sefariaNode` (issue #86).
 *
 * There is exactly one today — `Introduction`, Baal HaSulam's Introduction to
 * the Study of the Ten Sefirot, which Sefaria carries beside Section I…XVI
 * rather than inside any of them. It is recognised by the same
 * `mapNodeTitleToKind` every other node goes through, so an unmapped
 * book-level node is reported and skipped exactly like an unmapped sibling,
 * rather than silently disappearing because nothing walks it.
 *
 * Identified by shape, not by a name list: a Section node branches into
 * children (a `"default"` main text plus its siblings), while a book-level
 * node holds its own text directly.
 */
export const findBookLevelNodes = (index: SefariaIndex): SefariaIndexNode[] =>
  index.schema.nodes.filter((node) => (node.nodes ?? []).length === 0);

/** The section node's main-text node — the child keyed `"default"`. */
export const findMainTextNode = (
  sectionNode: SefariaIndexNode,
): SefariaIndexNode | undefined =>
  (sectionNode.nodes ?? []).find((node) => node.key === "default");

/** The section node's sibling nodes — every child that isn't the main-text `"default"` node. */
export const findSiblingNodes = (
  sectionNode: SefariaIndexNode,
): SefariaIndexNode[] =>
  (sectionNode.nodes ?? []).filter((node) => node.key !== "default");
