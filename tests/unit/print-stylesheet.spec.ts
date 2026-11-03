import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the print stylesheet in `app/assets/css/main.css`.
 *
 * Source assertions rather than rendered ones: happy-dom does not evaluate
 * `@media print`, so only the CSS text can be checked.
 */
const css = readFileSync(
  join(process.cwd(), "app/assets/css/main.css"),
  "utf8",
);

const printBlock = css.slice(css.indexOf("@media print"));

describe("print stylesheet", () => {
  it("has an @media print block", () => {
    expect(css).toContain("@media print");
  });

  it("hides the chrome", () => {
    expect(printBlock).toMatch(
      /\[data-print="hide"\][^{]*\{[^}]*display:\s*none/,
    );
  });

  it("pins light tokens and never touches direction", () => {
    expect(printBlock).toContain("--surface: var(--color-surface-white)");
    expect(printBlock).not.toMatch(/direction\s*:/);
  });

  it("keeps seif blocks together", () => {
    expect(printBlock).toMatch(/break-inside:\s*avoid/);
  });
});
