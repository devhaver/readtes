/**
 * Derives `content/glossary/tes-en.index.json` and
 * `content/glossary/tes-en.citations.json` (the app-facing split glossary —
 * see AGENTS.md "Content model") from `content/glossary/tes-en.json`, and
 * writes them to disk. A pure local transform: never touches the network,
 * only the already-on-disk canonical glossary.
 *
 * Same shape as `toc-splits.ts`, and for the same reason. The canonical
 * glossary is 307KB and ~77% of it is `citations` — the aligned
 * Hebrew/English excerpt pairs evidencing each term. A reader browsing 125
 * terms needs the terms, not 358 excerpt pairs, so the index carries
 * everything but the citations (plus a `citationCount`) and the citations
 * ride in their own file, imported only when a term is opened.
 *
 * `deriveGlossaryIndexFile`/`deriveGlossaryCitationsFile` are also the
 * reference implementation `scripts/validate-content.ts`'s equivalence check
 * compares the committed split files against, so the two can never silently
 * drift from `tes-en.json`. Idempotent: running it twice against an
 * unchanged `tes-en.json` produces a byte-identical pair of files.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  GlossaryCitation,
  GlossaryCitationsFile,
  GlossaryFile,
  GlossaryIndexFile,
} from "../../shared/types/content.ts";

/** Canonical glossary file name, relative to `content/glossary/`. */
export const GLOSSARY_FILE_NAME = "tes-en.json";
/** Derived, app-facing index file name, relative to `content/glossary/`. */
export const GLOSSARY_INDEX_FILE_NAME = "tes-en.index.json";
/** Derived, app-facing citations file name, relative to `content/glossary/`. */
export const GLOSSARY_CITATIONS_FILE_NAME = "tes-en.citations.json";

export const deriveGlossaryIndexFile = (
  glossary: GlossaryFile,
): GlossaryIndexFile => ({
  meta: {
    sourceVersion: glossary.generatedFrom.sourceVersion,
    referenceVersion: glossary.generatedFrom.referenceVersion,
    generatedOn: glossary.generatedFrom.generatedOn,
    method: glossary.generatedFrom.method,
    alignedChapters: glossary.generatedFrom.alignedChapters,
    alignedItemPairs: glossary.generatedFrom.alignedItemPairs,
    entryCount: glossary.entries.length,
    partsCovered: glossary.generatedFrom.partsCovered,
    partsNotCovered: glossary.generatedFrom.partsNotCovered,
  },
  // Destructures `citations` out rather than listing the ~10 fields that
  // stay, so a new field on a future glossary entry reaches the app by
  // default instead of being silently dropped here.
  entries: glossary.entries.map(({ citations, ...entry }) => ({
    ...entry,
    citationCount: citations.length,
  })),
  conventions: glossary.conventions,
  knownGaps: glossary.knownGaps,
});

export const deriveGlossaryCitationsFile = (
  glossary: GlossaryFile,
): GlossaryCitationsFile => ({
  citations: Object.fromEntries(
    glossary.entries
      .filter((entry) => entry.citations.length > 0)
      .map((entry): [string, GlossaryCitation[]] => [
        entry.id,
        entry.citations,
      ]),
  ),
});

const writeJsonFile = (path: string, data: unknown): void => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
};

/** Derives and writes both split files from an in-memory canonical glossary. */
export const writeGlossarySplitFiles = (
  contentDir: string,
  glossary: GlossaryFile,
): void => {
  const glossaryDir = join(contentDir, "glossary");

  writeJsonFile(
    join(glossaryDir, GLOSSARY_INDEX_FILE_NAME),
    deriveGlossaryIndexFile(glossary),
  );
  writeJsonFile(
    join(glossaryDir, GLOSSARY_CITATIONS_FILE_NAME),
    deriveGlossaryCitationsFile(glossary),
  );
};
