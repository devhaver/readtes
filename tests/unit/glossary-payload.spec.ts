/**
 * Guardrail, same class as `no-full-toc-import.spec.ts`: the glossary must
 * cost bytes only on `/glossary`, and its 216KB of citation excerpts must
 * cost bytes only once someone opens a term.
 *
 * Three ways that regresses, all of which look fine in review:
 *  1. importing the canonical 307KB `content/glossary/tes-en.json` from
 *     `app/` instead of the derived split files;
 *  2. turning either split file's `await import()` into a static top-level
 *     import, which welds it into whatever chunk the importer lands in;
 *  3. loading the citations eagerly from the page instead of on first open.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isContentChunkId } from "~~/shared/utils/manifestPrefetch";

const appDir = join(process.cwd(), "app");

const APP_FILE_PATTERN = /\.(ts|vue)$/;
/** The canonical glossary, as a quoted import specifier (not as prose in a comment). */
const CANONICAL_GLOSSARY_IMPORT =
  /["'][^"']*\/content\/glossary\/tes-en\.json["']/;
/** A *static* import of either split file — `import … from "…"`, not `import("…")`. */
const STATIC_SPLIT_IMPORT =
  /\bfrom\s+["'][^"']*\/content\/glossary\/tes-en\.(index|citations)\.json["']/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : APP_FILE_PATTERN.test(name)
        ? [path]
        : [];
  });

const appFiles = walk(appDir);

describe("guardrail: app/ never bundles the full glossary", () => {
  it("has zero quoted imports of the canonical content/glossary/tes-en.json", () => {
    const offenders = appFiles.filter((path) =>
      CANONICAL_GLOSSARY_IMPORT.test(readFileSync(path, "utf-8")),
    );

    expect(offenders).toEqual([]);
  });

  it("loads both split files only through a dynamic import()", () => {
    const offenders = appFiles.filter((path) =>
      STATIC_SPLIT_IMPORT.test(readFileSync(path, "utf-8")),
    );

    expect(offenders).toEqual([]);
  });
});

describe("guardrail: the glossary composables stay payload-safe", () => {
  const read = (relativePath: string) =>
    readFileSync(join(appDir, relativePath), "utf-8");

  it("useGlossaryIndex never reintroduces useAsyncData", () => {
    // Same reasoning as useLocalizedVolumes/useChapterContent: this is a
    // statically bundled JSON module, and wrapping it would serialize the
    // whole index into the page payload on top of the chunk.
    expect(read("composables/useGlossaryIndex.ts")).not.toContain(
      "useAsyncData(",
    );
  });

  it("useGlossaryCitations keeps the citations chunk behind loadCitations()", () => {
    const contents = read("composables/useGlossaryCitations.ts");
    const importIndex = contents.indexOf(
      'import("~~/content/glossary/tes-en.citations.json")',
    );
    const loaderIndex = contents.indexOf("const loadCitations");

    expect(importIndex).toBeGreaterThan(-1);
    expect(loaderIndex).toBeGreaterThan(-1);
    expect(importIndex).toBeGreaterThan(loaderIndex);
  });

  it("the page never calls loadCitations on setup", () => {
    const contents = read("pages/glossary.vue");

    // Wired to the row's `open` event, never invoked at the top level.
    expect(contents).toContain('@open="loadCitations"');
    expect(contents).not.toContain("await loadCitations(");
    expect(contents).not.toContain("loadCitations()");
  });
});

describe("guardrail: both glossary chunks are stripped of prefetch hints", () => {
  it.each([
    "../content/glossary/tes-en.index.json",
    "../content/glossary/tes-en.citations.json",
  ])("%s is recognised as a content chunk", (id) => {
    expect(isContentChunkId(id)).toBe(true);
  });
});
