import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Catalog = { [key: string]: Catalog | string };

// Read the raw files: importing the JSON goes through the i18n Vite plugin,
// which compiles messages into AST objects and hides the source strings.
const loadCatalog = (name: string): Catalog =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `i18n/locales/${name}.json`), "utf8"),
  ) as Catalog;

const en = loadCatalog("en");

const locales: [string, Catalog][] = [
  "he",
  "ru",
  "uk",
  "fr",
  "tr",
  "bg",
  "es",
  "de",
  "pt",
].map((name) => [name, loadCatalog(name)]);

const PLURAL_SUFFIX = /\.(zero|one|two|few|many|other)$/;

const collectEntries = (value: Catalog, prefix = ""): [string, string][] =>
  Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof nested === "string"
      ? [[path, nested] as [string, string]]
      : collectEntries(nested, path);
  });

// CLDR plural categories differ per language (ru/uk carry `.few`/`.many`), so
// plural keys are compared by their parent key rather than individually.
const normalizeKey = (path: string): string => path.replace(PLURAL_SUFFIX, "");

const keySet = (catalog: Catalog): string[] =>
  [
    ...new Set(collectEntries(catalog).map(([path]) => normalizeKey(path))),
  ].sort();

const placeholders = (text: string): string[] =>
  [
    ...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!)),
  ].sort();

const enEntries = collectEntries(en);
const enKeys = keySet(en);
const enText = new Map(enEntries);

// A plural form absent from en (ru `.few`) is checked against the union of
// en's placeholders across that key's plural forms.
const expectedPlaceholders = (path: string): string[] => {
  const exact = enText.get(path);
  if (exact !== undefined) return placeholders(exact);
  const parent = normalizeKey(path);
  return [
    ...new Set(
      enEntries
        .filter(([enPath]) => normalizeKey(enPath) === parent)
        .flatMap(([, text]) => placeholders(text)),
    ),
  ].sort();
};

describe("i18n catalog parity", () => {
  it("has no empty string values in en", () => {
    const empty = enEntries.filter(([, text]) => text.trim().length === 0);

    expect(empty).toEqual([]);
  });

  it.each(locales)("%s defines the same keys as en", (_name, catalog) => {
    expect(keySet(catalog)).toEqual(enKeys);
  });

  it.each(locales)("%s has no empty string values", (_name, catalog) => {
    const empty = collectEntries(catalog).filter(
      ([, text]) => text.trim().length === 0,
    );

    expect(empty).toEqual([]);
  });

  it.each(locales)("%s keeps en's placeholders per key", (_name, catalog) => {
    const mismatches = collectEntries(catalog)
      .map(([path, text]) => ({
        path,
        expected: expectedPlaceholders(path),
        actual: placeholders(text),
      }))
      .filter(
        ({ expected, actual }) =>
          JSON.stringify(expected) !== JSON.stringify(actual),
      );

    expect(mismatches).toEqual([]);
  });
});
