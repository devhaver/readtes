import { describe, expect, it } from "vitest";
import en from "~~/i18n/locales/en.json";
import he from "~~/i18n/locales/he.json";

type Catalog = { [key: string]: Catalog | string };

const collectKeyPaths = (value: Catalog, prefix = ""): string[] =>
  Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof nested === "string" ? [path] : collectKeyPaths(nested, path);
  });

const collectLeafValues = (value: Catalog): string[] =>
  Object.values(value).flatMap((nested) =>
    typeof nested === "string" ? [nested] : collectLeafValues(nested),
  );

describe("i18n catalog parity", () => {
  it("defines the exact same set of keys in en.json and he.json", () => {
    const enKeys = collectKeyPaths(en as Catalog).sort();
    const heKeys = collectKeyPaths(he as Catalog).sort();

    expect(heKeys).toEqual(enKeys);
  });

  it("has no empty string values in either catalog", () => {
    const values = [
      ...collectLeafValues(en as Catalog),
      ...collectLeafValues(he as Catalog),
    ];

    for (const value of values) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
