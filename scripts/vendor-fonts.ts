/**
 * Vendors the web fonts into the repository so a production build never talks
 * to `fonts.gstatic.com` (issue #121).
 *
 * The problem this removes. `@nuxt/fonts` downloads every subset at build
 * time, and a single 404 from Google fails the whole deploy. It did, twice in
 * one day, on commits with nothing wrong with them — and a failed deploy is
 * invisible from outside, because `main` merges and the site keeps serving the
 * previous build. Caching the downloads (PR #126) turned most of those into
 * cache hits; it could not fix a cold cache, and a build that can fail for
 * reasons unrelated to the change is the thing worth removing.
 *
 * What it writes, both committed:
 *
 *  - `public/fonts/*.woff2` — the font files themselves, served from our own
 *    origin like every other asset on this site.
 *  - `content-free` `fonts.manifest.json` — every `@font-face` the build
 *    currently emits: family, weight, style, `unicode-range`, and which file
 *    serves it. `scripts/lib/vendored-fonts.ts` reads it as a `@nuxt/fonts`
 *    provider, so the module keeps generating the CSS, the fallback metrics
 *    and the preloads exactly as before — only where the data comes from
 *    changed.
 *
 * Why it scrapes a build rather than fetching Google itself. The face set is
 * not a simple function of the config: Google splits a family into subsets,
 * reuses one variable-font file across several weights, and picks its own
 * `unicode-range` boundaries. Re-deriving that here would be a second
 * implementation of the provider, free to drift from the one that actually
 * ships. Reading what the module produced is the only way to be sure the
 * vendored output IS what the build produced.
 *
 * `pnpm fonts:vendor` — runs `pnpm generate` with `FONTS_SOURCE=google` (the
 * one path that still fetches from Google, see `nuxt.config.ts`), then
 * rewrites both artifacts from its output. Refreshing the fonts is a
 * deliberate act with a diff to review, which is the point.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { VendoredFontsManifest } from "./lib/vendored-fonts.ts";
import { VENDORED_FONTS_MANIFEST } from "./lib/vendored-fonts.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_CSS_DIR = join(ROOT, ".output/public/_nuxt");
const OUTPUT_FONT_DIR = join(ROOT, ".output/public/_fonts");
const PUBLIC_FONT_DIR = join(ROOT, "public/fonts");
const MANIFEST_PATH = join(ROOT, VENDORED_FONTS_MANIFEST);

const isDryRun = process.argv.includes("--dry-run");
const skipBuild = process.argv.includes("--skip-build");

/**
 * The Google subset each `unicode-range` belongs to, keyed by a range that
 * appears in that subset and no other. Naming files by subset rather than by
 * Google's opaque hash is the difference between a reviewable `public/fonts`
 * listing and 28 indistinguishable blobs.
 */
const SUBSET_SIGNATURES: [signature: string, subset: string][] = [
  ["U+590-5FF", "hebrew"],
  ["U+102-103", "vietnamese"],
  ["U+1F??", "greek-ext"],
  ["U+370-377", "greek"],
  ["U+460-52F", "cyrillic-ext"],
  ["U+400-45F", "cyrillic"],
  ["U+100-2BA", "latin-ext"],
];

const subsetOf = (unicodeRange: string): string =>
  SUBSET_SIGNATURES.find(([signature]) =>
    unicodeRange.includes(signature),
  )?.[1] ?? "latin";

const slugify = (family: string): string =>
  family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

interface ScrapedFace {
  family: string;
  weight: string;
  style: string;
  unicodeRange: string;
  /** The build's own `_fonts/<hash>.woff2` filename. */
  outputFile: string;
}

const FACE_RE = /@font-face\s*\{([^}]*)\}/g;
const declaration = (block: string, property: string): string | undefined =>
  new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(block)?.[1]?.trim();

const scrapeFaces = (): ScrapedFace[] => {
  const css = readdirSync(OUTPUT_CSS_DIR)
    .filter((name) => name.endsWith(".css"))
    .map((name) => readFileSync(join(OUTPUT_CSS_DIR, name), "utf8"))
    .join("\n");

  const faces: ScrapedFace[] = [];
  for (const [, block = ""] of css.matchAll(FACE_RE)) {
    const outputFile = /\/_fonts\/([^)"']+)/.exec(block)?.[1];
    // No downloaded file: this is one of the module's local-fallback metric
    // rules (`src: local(Times New Roman)`), which it regenerates itself.
    if (!outputFile) continue;

    const family = declaration(block, "font-family")?.replace(
      /^["']|["']$/g,
      "",
    );
    const unicodeRange = declaration(block, "unicode-range");
    if (!family || !unicodeRange) continue;

    faces.push({
      family,
      weight: declaration(block, "font-weight") ?? "400",
      style: declaration(block, "font-style") ?? "normal",
      unicodeRange,
      outputFile,
    });
  }
  return faces;
};

/**
 * A stable, readable name per distinct font file. One file commonly serves
 * several weights (a variable font), so this is keyed on the file, not the
 * face — and the sequence suffix only appears where a family really does ship
 * more than one file for a subset.
 */
const nameFiles = (faces: ScrapedFace[]): Map<string, string> => {
  const perSubset = new Map<string, string[]>();
  const weightsOf = new Map<string, Set<string>>();
  const stylesOf = new Map<string, Set<string>>();

  for (const face of faces) {
    const key = `${slugify(face.family)}-${subsetOf(face.unicodeRange)}`;
    const files = perSubset.get(key) ?? [];
    if (!files.includes(face.outputFile)) files.push(face.outputFile);
    perSubset.set(key, files);

    (
      weightsOf.get(face.outputFile) ??
      weightsOf.set(face.outputFile, new Set()).get(face.outputFile)!
    ).add(face.weight);
    (
      stylesOf.get(face.outputFile) ??
      stylesOf.set(face.outputFile, new Set()).get(face.outputFile)!
    ).add(face.style);
  }

  const names = new Map<string, string>();
  for (const [key, files] of perSubset) {
    files.forEach((file, index) => {
      if (files.length === 1) {
        names.set(file, `${key}.woff2`);
        return;
      }

      // Several files for one subset: say WHY they differ rather than
      // numbering them. A non-variable family ships a file per weight
      // (David Libre), a variable one a file per style (Inter). Where the
      // file spans several weights and styles there is nothing honest to
      // name it after, so it falls back to the index.
      const weights = [...(weightsOf.get(file) ?? [])];
      const styles = [...(stylesOf.get(file) ?? [])];
      // The style only earns a place in the name when it is what tells this
      // subset's files apart — otherwise every David Libre file would carry
      // a "-normal" that distinguishes it from nothing.
      const stylesDiffer =
        new Set(files.flatMap((f) => [...(stylesOf.get(f) ?? [])])).size > 1;
      const parts = [
        key,
        weights.length === 1 ? weights[0] : null,
        stylesDiffer && styles.length === 1 ? styles[0] : null,
      ].filter(Boolean);

      const name = `${parts.join("-")}.woff2`;
      names.set(
        file,
        parts.length > 1 && ![...names.values()].includes(name)
          ? name
          : `${key}-${index + 1}.woff2`,
      );
    });
  }
  return names;
};

if (!skipBuild) {
  console.log(
    "Building with FONTS_SOURCE=google to fetch the current faces…\n",
  );
  execFileSync("pnpm", ["generate"], {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, FONTS_SOURCE: "google" },
  });
}

if (!existsSync(OUTPUT_FONT_DIR)) {
  console.error(
    `${OUTPUT_FONT_DIR} does not exist — run \`FONTS_SOURCE=google pnpm generate\` first, or drop --skip-build.`,
  );
  process.exit(1);
}

const faces = scrapeFaces();
if (faces.length === 0) {
  console.error(
    "No downloaded @font-face rules found in the build — nothing to vendor.",
  );
  process.exit(1);
}

const fileNames = nameFiles(faces);

const manifest: VendoredFontsManifest = {
  generatedBy: "pnpm fonts:vendor",
  families: {},
};

for (const face of faces) {
  const src = `/fonts/${fileNames.get(face.outputFile)}`;
  const family = (manifest.families[face.family] ??= []);
  family.push({
    weight: face.weight,
    style: face.style,
    unicodeRange: face.unicodeRange,
    src,
  });
}

// Sorted so the manifest's diff reflects what actually changed about the
// fonts, not the order the CSS bundler happened to emit rules in.
for (const [family, entries] of Object.entries(manifest.families)) {
  manifest.families[family] = entries.sort(
    (a, b) =>
      a.src.localeCompare(b.src) ||
      Number(a.weight) - Number(b.weight) ||
      a.style.localeCompare(b.style),
  );
}

const summary = Object.entries(manifest.families)
  .map(([family, entries]) => `  ${family}: ${entries.length} faces`)
  .join("\n");
console.log(
  `\n${faces.length} faces across ${fileNames.size} files:\n${summary}\n`,
);

if (isDryRun) {
  console.log("[dry run] nothing written");
  process.exit(0);
}

// Rebuilt rather than merged: a family or subset dropped from the config must
// take its files out of the repo with it, not leave them behind to be served
// forever.
rmSync(PUBLIC_FONT_DIR, { recursive: true, force: true });
mkdirSync(PUBLIC_FONT_DIR, { recursive: true });

for (const [outputFile, name] of fileNames) {
  copyFileSync(join(OUTPUT_FONT_DIR, outputFile), join(PUBLIC_FONT_DIR, name));
}

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${fileNames.size} files to public/fonts/ and ${VENDORED_FONTS_MANIFEST}.`,
);
