/**
 * Standalone CLI: regenerates `content/glossary/tes-en.index.json` +
 * `content/glossary/tes-en.citations.json` from the canonical
 * `content/glossary/tes-en.json`. `pnpm emit:glossary-splits`.
 *
 * A pure local transform — never touches the network. The canonical
 * glossary is hand-authored/audited rather than produced by either
 * importer, so unlike `emit-toc-splits.ts` there is no import run that
 * calls the derivation for you: run this after any edit to `tes-en.json`.
 * `pnpm validate:content` fails if you forget.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { glossaryFileSchema } from "../shared/types/content.ts";
import {
  GLOSSARY_FILE_NAME,
  writeGlossarySplitFiles,
} from "./lib/glossary-splits.ts";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const contentDir = join(repoRoot, "content");

export const main = (): void => {
  const glossary = glossaryFileSchema.parse(
    JSON.parse(
      readFileSync(join(contentDir, "glossary", GLOSSARY_FILE_NAME), "utf-8"),
    ),
  );

  writeGlossarySplitFiles(contentDir, glossary);

  console.log(
    `✓ Wrote content/glossary/tes-en.index.json (${glossary.entries.length} entries) and content/glossary/tes-en.citations.json.`,
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
