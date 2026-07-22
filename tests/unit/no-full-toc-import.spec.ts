/**
 * Guardrail against regressing back to the pre-T11 shape: `app/` code
 * bundling the full (2.9MB+ at full-corpus scale) `content/toc.json` into
 * every page's payload — see AGENTS.md "Content model" / the T11 scaling
 * notes. Crude on purpose (a grep, not a lint rule): silently regressing to
 * 400KB reader pages is a far worse failure mode than this test being
 * "too blunt".
 *
 * Only matches `content/toc.json` as an actual quoted import specifier
 * (`"~~/content/toc.json"`, `'../content/toc.json'`, …), not as prose in a
 * doc comment — several composables/utils legitimately *mention*
 * `content/toc.json` (backtick-quoted, in explanatory comments) as the
 * canonical build-time file app code must instead avoid.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = join(process.cwd(), "app");

const APP_FILE_PATTERN = /\.(ts|vue)$/;
const FULL_TOC_IMPORT_PATTERN = /["'][^"']*\/content\/toc\.json["']/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path)
      : APP_FILE_PATTERN.test(name)
        ? [path]
        : [];
  });

describe("guardrail: app/ never imports the full content/toc.json", () => {
  it("has zero quoted imports of content/toc.json anywhere under app/", () => {
    const offenders = walk(appDir).filter((path) =>
      FULL_TOC_IMPORT_PATTERN.test(readFileSync(path, "utf-8")),
    );

    expect(offenders).toEqual([]);
  });
});

describe("guardrail: the bundled-JSON composables never reintroduce useAsyncData", () => {
  // These three load statically bundled JSON (toc.volumes.json,
  // toc.parts/*.json, content/parts/**/*.json) via direct `await import()` —
  // wrapping that in `useAsyncData` would re-add the payload-serialization
  // cost T11 removed (see each file's own docblock).
  const composableFiles = [
    "composables/useLocalizedVolumes.ts",
    "composables/useLocalizedParts.ts",
    "composables/useChapterContent.ts",
  ];

  it.each(composableFiles)(
    "%s has zero useAsyncData( calls",
    (relativePath) => {
      const contents = readFileSync(join(appDir, relativePath), "utf-8");
      expect(contents).not.toContain("useAsyncData(");
    },
  );
});
