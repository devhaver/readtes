/**
 * The committed record of which Sefaria nodes do not start numbering at 1,
 * and the checks that read it.
 *
 * `sefaria-refs.ts` composes refs correctly given a node's
 * `index_offsets_by_depth` (issue #103), but that field only exists while
 * the importer is holding a freshly fetched index. Everything downstream of
 * an import — `validate-content.ts` on a committed tree, the one-off
 * `migrate-sefaria-refs.ts` — has no network and no index, so a ref that
 * silently dropped its offset is indistinguishable from a correct one.
 *
 * `content/sefaria-index-offsets.json` closes that. It is a small map of
 * `refBase -> node shape + offsets` (37 nodes today; every other node in the
 * book starts at 1 and is simply absent), written by the importer from the
 * index it already fetches and refreshable on its own with
 * `pnpm emit:sefaria-offsets`. Committing it is what turns "did this ref
 * apply its offset?" from an upstream question into a local one.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  sefariaOffsetNodesFileSchema,
  type IndexOffsetsByDepth,
  type SefariaOffsetNode,
  type SefariaOffsetNodesFile,
} from "../../shared/types/content.ts";
import type { SefariaIndex, SefariaIndexNode } from "./sefaria-api-types.ts";

export const SEFARIA_OFFSETS_FILE_NAME = "sefaria-index-offsets.json";

/**
 * Nodes are keyed by the ref base the importer composes for each
 * (`"Talmud Eser HaSefirot, Section I, Histaklut Penimit"` —
 * `${part.sefariaNode}, ${node.title}`). `depth`/`sectionNames` are stored
 * alongside the offsets because which address component an offset lands on
 * depends on them (see `sefaria-refs.ts`), and a checker holding only the
 * numbers cannot tell.
 */

const sortedByKey = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );

const hasOffsets = (node: SefariaIndexNode): boolean =>
  Object.keys(node.index_offsets_by_depth ?? {}).length > 0;

/**
 * Every offset-carrying leaf node in the index, keyed by its ref base.
 *
 * Walks the whole schema tree rather than the section/sibling helpers in
 * `sefaria-index.ts`: this file describes the book, not one part's import,
 * and a node whose `ChapterKind` we haven't mapped yet still needs its
 * offsets recorded — Section VI's Cause-and-Effect tables (issue #86) carry
 * 137 and would otherwise be imported wrong the day they gain a kind.
 */
export const collectOffsetNodes = (
  index: SefariaIndex,
): SefariaOffsetNodesFile => {
  const nodes: Record<string, SefariaOffsetNode> = {};

  const walk = (node: SefariaIndexNode, titlePath: string[]): void => {
    const path = node.title ? [...titlePath, node.title] : titlePath;

    if (node.nodes) {
      for (const child of node.nodes) walk(child, path);
      return;
    }
    if (!hasOffsets(node)) return;

    // The main-text node is keyed `"default"` and titled `""` — its ref base
    // is the section itself, which `path` already spells.
    nodes[path.join(", ")] = {
      depth: node.depth ?? 1,
      sectionNames: node.sectionNames ?? [],
      indexOffsetsByDepth: node.index_offsets_by_depth as IndexOffsetsByDepth,
    };
  };

  for (const node of index.schema.nodes) walk(node, [index.title]);

  return { nodes: sortedByKey(nodes) };
};

/**
 * Merge for a single-part import, which only ever sees its own section's
 * nodes: `incoming` wins where it has an entry, everything else is carried
 * through, so `--part 6` cannot drop the other fifteen sections' offsets.
 */
export const mergeOffsetNodes = (
  existing: SefariaOffsetNodesFile | undefined,
  incoming: SefariaOffsetNodesFile,
): SefariaOffsetNodesFile => ({
  nodes: sortedByKey({ ...(existing?.nodes ?? {}), ...incoming.nodes }),
});

/**
 * The committed map, or `null` when the file does not exist yet (the state
 * every tree was in before issue #103). Callers decide whether that is fatal:
 * `validate-content.ts` reports it, the migration refuses to run.
 */
export const readOffsetNodes = (
  contentDir: string,
): SefariaOffsetNodesFile | null => {
  const path = join(contentDir, SEFARIA_OFFSETS_FILE_NAME);
  if (!existsSync(path)) return null;
  return sefariaOffsetNodesFileSchema.parse(
    JSON.parse(readFileSync(path, "utf-8")),
  );
};

export const writeOffsetNodes = (
  contentDir: string,
  offsets: SefariaOffsetNodesFile,
): void => {
  writeFileSync(
    join(contentDir, SEFARIA_OFFSETS_FILE_NAME),
    `${JSON.stringify(offsets, null, 2)}\n`,
    "utf-8",
  );
};

/**
 * The node a ref belongs to, plus its numeric address components.
 *
 * Longest-prefix match, so `"…, Section VI, List of Answers on Topics"` is
 * never mistaken for `"…, Section VI"`. Returns `undefined` for a ref under
 * no offset-carrying node (the overwhelming majority — nothing to check) and
 * for one whose trailing address isn't plain integers.
 */
export const resolveOffsetNodeRef = (
  offsets: SefariaOffsetNodesFile,
  ref: string,
): {
  refBase: string;
  node: SefariaOffsetNode;
  components: number[];
} | null => {
  let refBase: string | null = null;
  for (const candidate of Object.keys(offsets.nodes)) {
    if (!ref.startsWith(`${candidate} `) && ref !== candidate) continue;
    if (refBase === null || candidate.length > refBase.length) {
      refBase = candidate;
    }
  }
  if (refBase === null) return null;

  const address = ref.slice(refBase.length).trim();
  if (address === "") return null;
  if (!/^\d+(:\d+)*$/.test(address)) return null;

  return {
    refBase,
    node: offsets.nodes[refBase] as SefariaOffsetNode,
    components: address.split(":").map(Number),
  };
};

/**
 * The lowest value each address component may legally take once the node's
 * offsets are applied — `undefined` where a component carries no offset.
 *
 * A component below its floor names an item that does not exist upstream: the
 * 404s issue #103 is about. This is deliberately a floor and not an equality
 * check against a recomposed ref — the validator sees committed items, not
 * the node's own item list, so it can prove a ref *skipped* its offset but
 * not that a given item sits at a particular index. `migrate-sefaria-refs.ts`
 * does the exact recomposition, from position.
 */
export const offsetFloors = (
  node: SefariaOffsetNode,
  components: number[],
): (number | undefined)[] =>
  components.map((_, position) => {
    const offset = node.indexOffsetsByDepth[String(position + 1)];
    if (offset === undefined) return undefined;
    if (typeof offset === "number") return offset + 1;

    // An array is indexed by the parent address. The parent's own offset has
    // to come back off to index it, since the ref carries the offset value
    // rather than the raw position. No node in this book carries offsets at
    // both depths, so that term is zero today — it is here so the two
    // shapes cannot silently disagree if one ever does.
    const parent = components[position - 1];
    if (parent === undefined) return undefined;
    const parentOffset = node.indexOffsetsByDepth[String(position)];
    const parentBase = typeof parentOffset === "number" ? parentOffset : 0;
    return (offset[parent - parentBase - 1] ?? 0) + 1;
  });

/**
 * Components of `ref` that fall below the floor their node's offsets impose.
 * Empty for a correctly offset ref, and for every ref outside an
 * offset-carrying node.
 */
export const offsetViolations = (
  offsets: SefariaOffsetNodesFile,
  ref: string,
): { position: number; value: number; floor: number }[] => {
  const resolved = resolveOffsetNodeRef(offsets, ref);
  if (resolved === null) return [];

  const floors = offsetFloors(resolved.node, resolved.components);
  const violations: { position: number; value: number; floor: number }[] = [];

  for (const [position, value] of resolved.components.entries()) {
    const floor = floors[position];
    if (floor === undefined || value >= floor) continue;
    violations.push({ position: position + 1, value, floor });
  }

  return violations;
};
