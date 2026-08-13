/**
 * Standalone CLI: refreshes `content/sefaria-index-offsets.json` from
 * Sefaria's index for this book. `pnpm emit:sefaria-offsets`.
 *
 * One cached request. `import-sefaria.ts` merges the same map into the same
 * file on every run (via `collectOffsetNodes`/`mergeOffsetNodes`), so this is
 * only needed to bootstrap the file, or to pick up an upstream re-numbering
 * without re-importing the whole corpus.
 *
 * Merges rather than replaces, for the same reason the importer does: a
 * refresh must not drop a node the current index happens not to expose.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHttpClient } from "./lib/http-client.ts";
import type { SefariaIndex } from "./lib/sefaria-api-types.ts";
import {
  collectOffsetNodes,
  mergeOffsetNodes,
  readOffsetNodes,
  writeOffsetNodes,
} from "./lib/sefaria-offset-nodes.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");
const cacheDir = join(repoRoot, ".superpowers/import-cache");

const SEFARIA_BASE = "https://www.sefaria.org/api";
const BOOK_INDEX_TITLE = "Talmud_Eser_HaSefirot";

export const main = async (): Promise<void> => {
  const client = createHttpClient({ cacheDir });
  const index = await client.getJson<SefariaIndex>(
    `${SEFARIA_BASE}/v2/index/${BOOK_INDEX_TITLE}`,
  );

  const merged = mergeOffsetNodes(
    readOffsetNodes(contentDir) ?? undefined,
    collectOffsetNodes(index),
  );
  writeOffsetNodes(contentDir, merged);

  console.log(
    `✓ Wrote content/sefaria-index-offsets.json (${Object.keys(merged.nodes).length} offset-carrying node(s)).`,
  );
};

const isRunAsScript = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === `file://${entry}`;
};

if (isRunAsScript()) await main();
