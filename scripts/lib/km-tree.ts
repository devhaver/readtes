/**
 * Pure helpers over KabbalahMedia's `/backend/sqdata` tree: locating the
 * Study of the Ten Sefirot collection, walking VOLUME -> PART -> ARTICLE,
 * and classifying each PART/ARTICLE name into the role this importer knows
 * how to fetch content for.
 *
 * The collection uid below is verified against the live API (see AGENTS.md
 * "KabbalahMedia import") — there is no discovery endpoint for "find the TES
 * collection", so this one root uid is the single hardcoded starting point;
 * everything under it (volumes, parts, articles) is walked structurally,
 * never hardcoded.
 */

/** Verified `sqdata` uid for the "Study of the Ten Sefirot" COLLECTION node. */
export const KM_TES_COLLECTION_UID = "xtKmrbb9";

export interface KmRawTreeNode {
  id: string;
  parent_id?: string;
  type?: string;
  name: string;
  description?: string;
  children?: KmRawTreeNode[];
}

/** Shape of the `/backend/sqdata` response this importer reads (only the `sources` root matters). */
export interface KmSqData {
  sources: KmRawTreeNode[];
}

export interface KmTreeArticle {
  id: string;
  name: string;
}

export interface KmTreePart {
  id: string;
  name: string;
  articles: KmTreeArticle[];
}

export interface KmTreeVolume {
  id: string;
  name: string;
  parts: KmTreePart[];
}

/** Depth-first search for a node by id anywhere under `nodes` (including `nodes` itself). */
export const findKmNodeById = (
  nodes: KmRawTreeNode[],
  id: string,
): KmRawTreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findKmNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * Walks the collection node (found by `KM_TES_COLLECTION_UID`) into
 * `KmTreeVolume[]`. Throws if the collection uid isn't present in `sqdata`
 * — a structural precondition the importer cannot proceed without, not a
 * per-part/per-language absence to report and skip.
 */
export const extractKmTesTree = (sqdata: KmSqData): KmTreeVolume[] => {
  const collection = findKmNodeById(sqdata.sources, KM_TES_COLLECTION_UID);
  if (!collection) {
    throw new Error(
      `extractKmTesTree: collection uid "${KM_TES_COLLECTION_UID}" not found in sqdata — the tree shape may have changed upstream`,
    );
  }

  return (collection.children ?? []).map((volumeNode) => ({
    id: volumeNode.id,
    name: volumeNode.name,
    parts: (volumeNode.children ?? []).map((partNode) => ({
      id: partNode.id,
      name: partNode.name,
      articles: (partNode.children ?? []).map((articleNode) => ({
        id: articleNode.id,
        name: articleNode.name,
      })),
    })),
  }));
};

/** `"Part 5"` -> `5`. Returns `undefined` for anything else — never guessed. */
export const parseKmPartNumber = (partName: string): number | undefined => {
  const match = /^Part (\d+)$/.exec(partName.trim());
  return match ? Number.parseInt(match[1] as string, 10) : undefined;
};

export const indexKmTreePartsByNumber = (
  tree: readonly KmTreeVolume[],
): Map<number, KmTreePart> => {
  const parts = new Map<number, KmTreePart>();
  for (const volume of tree) {
    for (const part of volume.parts) {
      const number = parseKmPartNumber(part.name);
      if (number === undefined) continue;
      const existing = parts.get(number);
      if (existing) {
        throw new Error(
          `KabbalahMedia tree contains duplicate Part ${number} nodes: "${existing.id}" and "${part.id}"`,
        );
      }
      parts.set(number, part);
    }
  }
  return parts;
};

/** `"Chapter 3"` -> `3`. Returns `undefined` for anything else — never guessed. */
export const parseKmChapterLeafNumber = (
  articleName: string,
): number | undefined => {
  const match = /^Chapter (\d+)$/.exec(articleName.trim());
  return match ? Number.parseInt(match[1] as string, 10) : undefined;
};

/**
 * What this importer knows how to do with a PART's ARTICLE child, purely
 * from its name (never its content) — `"unmapped"` is reported and skipped,
 * same philosophy as `sefaria-index.ts`'s `mapNodeTitleToKind`.
 */
export type KmLeafRole =
  | "chapter"
  | "whole-part"
  | "inner-observation"
  | "questions-terminology"
  | "questions-topics"
  | "answers-terminology"
  | "answers-topics"
  | "unmapped";

const ROLE_BY_ARTICLE_NAME: Record<string, KmLeafRole> = {
  "Inner Observation": "inner-observation",
  "Table of Questions for the Meaning of the Words": "questions-terminology",
  "Table of Questions for Topics": "questions-topics",
  "Table of Answers for the Meaning of the Words": "answers-terminology",
  "Table of Answers for Topics": "answers-topics",
};

/**
 * Classifies one PART's ARTICLE child by name against that same part's own
 * name — `"whole-part"` when the leaf is itself named after the part (the
 * whole-part-doc leaves seen for Parts 6/7, as opposed to Parts 5/16 where
 * the whole-part doc attaches directly to the PART node — callers try both
 * places). `"inner-observation"` is recognized but not (yet) processed by
 * this importer — its KabbalahMedia doc structure has been seen to vary
 * per part (verified: Part 1 uses bare `"N)"` markers with no real
 * headings, Part 2 uses `"N."` markers under real heading levels), so it is
 * reported rather than force-parsed against an unverified shape. The Cause/
 * Consequence family has no `ChapterKind` at all yet (see
 * `sefaria-index.ts`'s `mapNodeTitleToKind` for the same situation on the
 * Sefaria side) and falls through to `"unmapped"`.
 */
export const classifyKmArticle = (
  articleName: string,
  partName: string,
): KmLeafRole => {
  const trimmed = articleName.trim();
  if (parseKmChapterLeafNumber(trimmed) !== undefined) return "chapter";
  if (trimmed === partName.trim()) return "whole-part";
  return ROLE_BY_ARTICLE_NAME[trimmed] ?? "unmapped";
};
