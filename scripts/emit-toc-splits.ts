/**
 * Standalone CLI: regenerates `content/toc.volumes.json` +
 * `content/toc.parts/part-NN.json` from the committed `content/toc.json` +
 * `content/versions.json`. `pnpm emit:toc-splits`.
 *
 * A pure local transform — never touches the network. Both importers
 * (`import-sefaria.ts`, `import-kabbalahmedia.ts`) call the same
 * `writeTocSplitFiles` helper (`scripts/lib/toc-splits.ts`) directly after
 * they rewrite `toc.json`, so this script only needs running by hand after
 * a manual edit to `content/toc.json`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tocSchema, versionsFileSchema } from "../shared/types/content.ts";
import { writeTocSplitFiles } from "./lib/toc-splits.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");

export const main = (): void => {
  const toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );

  writeTocSplitFiles(contentDir, toc, versions);

  const partCount = toc.volumes.reduce(
    (sum, volume) => sum + volume.parts.length,
    0,
  );
  console.log(
    `✓ Wrote content/toc.volumes.json and ${partCount} content/toc.parts/*.json file(s).`,
  );
};

const isRunAsScript = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === `file://${entry}`;
};

if (isRunAsScript()) {
  try {
    main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}
