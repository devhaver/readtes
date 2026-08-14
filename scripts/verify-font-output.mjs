/**
 * Fails a build whose font output is missing or implausibly small.
 *
 * Two failure modes this catches, both of which ship a broken site without
 * erroring on their own:
 *
 * - **Hebrew subsets dropped.** `@nuxt/fonts` defaults to latin-only, and a
 *   Hebrew family configured without `subsets: ["latin", "hebrew"]` emits
 *   @font-face rules with no Hebrew glyph coverage at all. The site renders,
 *   in a fallback serif, and nothing anywhere says so (see `tes-seo-ssg`).
 * - **A partial font fetch.** The download step reaches Google per subset;
 *   anything that leaves some of them unfetched produces a thinner `_fonts`
 *   directory rather than an error (issue #121).
 *
 * Deliberately a floor rather than an exact count: the exact number of subset
 * files is Google's business and changes when they re-cut a family. What is
 * ours is "the Hebrew reading faces are present, and the payload is the size
 * a full fetch produces".
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FONT_DIR = ".output/public/_fonts";
/**
 * The generated `@font-face` rules end up in the built entry stylesheet, not
 * in `.nuxt/nuxt-fonts-global.css` (which is the module's build-time input
 * and is empty by the time the output exists). Checking the shipped CSS is
 * also the more honest test: it is what the browser reads.
 */
const CSS_DIR = ".output/public/_nuxt";

/** Families the reader cannot do without — the two Hebrew reading faces. */
const REQUIRED_FAMILIES = ["David Libre", "Frank Ruhl Libre"];

/**
 * The Hebrew block. A shipped stylesheet with no `@font-face` covering it
 * has no Hebrew glyphs, whatever else it has — which is the failure that
 * produces a rendered, wrong-looking site and no error anywhere.
 */
const HEBREW_UNICODE_RANGE = "U+590-5FF";

/** A full fetch is ~716KB across ~28 files; well under either means a partial one. */
const MIN_FILES = 20;
const MIN_BYTES = 500_000;

const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
};

let files = [];
try {
  files = readdirSync(FONT_DIR);
} catch {
  fail(`${FONT_DIR} does not exist — the build shipped no fonts at all.`);
  process.exit(1);
}

const bytes = files.reduce(
  (total, name) => total + statSync(join(FONT_DIR, name)).size,
  0,
);

if (files.length < MIN_FILES) {
  fail(
    `${FONT_DIR} has ${files.length} files, expected at least ${MIN_FILES}.`,
  );
}
if (bytes < MIN_BYTES) {
  fail(`${FONT_DIR} is ${bytes} bytes, expected at least ${MIN_BYTES}.`);
}

const css = readdirSync(CSS_DIR)
  .filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(join(CSS_DIR, name), "utf8"))
  .join("");

const flat = css.replaceAll("\n", "");

for (const family of REQUIRED_FAMILIES) {
  // The real assertion is a `src:` pointing at a downloaded file — a
  // `font-family` mention alone is also produced by the local-fallback
  // metrics rule, which is present even when nothing was fetched.
  const declared = new RegExp(
    `font-family:${family}[;,}][^}]*?src:[^}]*?_fonts`,
  ).test(flat);
  if (!declared) {
    fail(`No @font-face for "${family}" — Hebrew would render in a fallback.`);
  }
}

if (!flat.includes(HEBREW_UNICODE_RANGE)) {
  fail(
    `No @font-face covers ${HEBREW_UNICODE_RANGE} — the site would render Hebrew in a fallback serif, silently.`,
  );
}

if (process.exitCode === 1) {
  console.error("\nFont output verification failed.");
} else {
  console.log(
    `✓ Fonts: ${files.length} files, ${Math.round(bytes / 1024)}KB, Hebrew families present.`,
  );
}
