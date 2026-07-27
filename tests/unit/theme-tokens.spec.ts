import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the three-theme token contract in `app/assets/css/main.css`.
 *
 * These are source assertions rather than rendered ones on purpose: the thing
 * that broke was CSS cascade behaviour, which happy-dom does not evaluate, so
 * a mounted-component test would have passed while the page was visibly wrong.
 */
// `process.cwd()` rather than import.meta.url — same approach as
// no-full-toc-import.spec.ts, and stable under the nuxt test environment.
const css = readFileSync(
  join(process.cwd(), "app/assets/css/main.css"),
  "utf8",
);

const blockFor = (selector: string) => {
  const rules = [
    ...css.matchAll(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, "g")),
  ];
  expect(rules.length, `no rule found for ${selector}`).toBeGreaterThan(0);
  return rules.map((m) => m[1]).join("\n");
};

const SEMANTIC_TOKENS = [
  "--surface",
  "--surface-raised",
  "--surface-reading",
  "--text-primary",
  "--text-muted",
  "--border",
  "--accent-text",
  "--warning-text",
];

describe("theme tokens", () => {
  it.each([".dark", ".sepia"])(
    "%s defines every semantic token that :root does",
    (selector) => {
      const block = blockFor(selector);
      for (const token of SEMANTIC_TOKENS) {
        expect(block, `${selector} is missing ${token}`).toContain(`${token}:`);
      }
    },
  );

  it("sepia neutralises Tailwind's colliding .sepia filter utility", () => {
    // `classSuffix: ""` puts the bare preference value on <html>, and "sepia"
    // is also a Tailwind utility (filter: sepia(100%)). Without this reset the
    // whole document — navy header, images and all — is run through a sepia
    // filter on top of the token changes.
    expect(blockFor(".sepia")).toContain("filter: none");
  });

  it("sepia is a light theme for form controls and scrollbars", () => {
    expect(blockFor(".sepia")).toContain("color-scheme: light");
  });
});
