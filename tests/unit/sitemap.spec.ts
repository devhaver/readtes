import { describe, expect, it } from "vitest";
import toc from "../../content/toc.json";
import type { Toc } from "../../shared/types/content";
import {
  buildSitemapEntries,
  escapeXml,
  renderSitemapXml,
  sitemapPaths,
} from "../../shared/utils/sitemap";

const SITE_URL = "https://readtes.org";
const realToc = toc as Toc;

const allChapterIds = realToc.volumes.flatMap((volume) =>
  volume.parts.flatMap((part) => part.chapters.map((chapter) => chapter.id)),
);

describe("sitemap URL builder", () => {
  it("includes the three static top-level pages", () => {
    const paths = sitemapPaths(realToc);

    expect(paths).toContain("/");
    expect(paths).toContain("/about");
    expect(paths).toContain("/volumes");
  });

  it("includes every volume's contents page", () => {
    const paths = sitemapPaths(realToc);

    for (const volume of realToc.volumes) {
      expect(paths).toContain(`/volumes/volume-${volume.number}`);
    }
  });

  it("includes every chapter id from the real content/toc.json, once per locale", () => {
    const entries = buildSitemapEntries(realToc, SITE_URL);

    for (const id of allChapterIds) {
      const entry = entries.find(
        (candidate) => candidate.path === `/read/${id}`,
      );

      expect(entry).toBeDefined();
      expect(entry?.en).toBe(`${SITE_URL}/read/${id}`);
      expect(entry?.he).toBe(`${SITE_URL}/he/read/${id}`);
    }
  });

  it("never leaks the /design-tokens debug route", () => {
    const paths = sitemapPaths(realToc);

    expect(paths.some((path) => path.includes("design-tokens"))).toBe(false);
  });

  it("totals static pages + volumes + chapters, exactly once per path", () => {
    const chapterCount = realToc.volumes.reduce(
      (sum, volume) =>
        sum +
        volume.parts.reduce(
          (partSum, part) => partSum + part.chapters.length,
          0,
        ),
      0,
    );
    const entries = buildSitemapEntries(realToc, SITE_URL);

    expect(entries).toHaveLength(3 + realToc.volumes.length + chapterCount);
  });

  it("builds the home path's alternates as / and /he (no trailing /he/)", () => {
    const entries = buildSitemapEntries(realToc, SITE_URL);
    const home = entries.find((entry) => entry.path === "/");

    expect(home?.en).toBe(`${SITE_URL}/`);
    expect(home?.he).toBe(`${SITE_URL}/he`);
  });

  it("renders well-formed XML with an alternate pair for every URL", () => {
    const entries = buildSitemapEntries(realToc, SITE_URL);
    const xml = renderSitemapXml(entries);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );

    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    // One <url> per locale variant of every entry.
    expect(urlBlocks).toHaveLength(entries.length * 2);

    for (const block of urlBlocks) {
      expect(block).toContain('<xhtml:link rel="alternate" hreflang="en"');
      expect(block).toContain('<xhtml:link rel="alternate" hreflang="he"');
      expect(block).toContain(
        '<xhtml:link rel="alternate" hreflang="x-default"',
      );
      expect(block.match(/<loc>/g) ?? []).toHaveLength(1);
    }
  });

  it("points x-default at the English (default-locale) URL for every block", () => {
    const entries = buildSitemapEntries(realToc, SITE_URL);
    const xml = renderSitemapXml(entries);
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];

    for (const block of urlBlocks) {
      const xDefaultHref = block.match(
        /hreflang="x-default" href="([^"]+)"/,
      )?.[1];
      const enHref = block.match(/hreflang="en" href="([^"]+)"/)?.[1];

      expect(xDefaultHref).toBeDefined();
      expect(xDefaultHref).toBe(enHref);
    }
  });

  it("escapes XML metacharacters in siteUrl before interpolating into <loc>/href", () => {
    const trickyUrl = 'https://example.org/a&b<c>d"e';
    const entries = buildSitemapEntries(realToc, trickyUrl);
    const home = entries.find((entry) => entry.path === "/");
    const xml = renderSitemapXml([home!]);

    expect(xml).not.toContain('a&b<c>d"e');
    expect(xml).toContain("a&amp;b&lt;c&gt;d&quot;e");
  });

  describe("escapeXml", () => {
    it('escapes &, <, >, and " (in that safe order)', () => {
      expect(escapeXml("&")).toBe("&amp;");
      expect(escapeXml("<")).toBe("&lt;");
      expect(escapeXml(">")).toBe("&gt;");
      expect(escapeXml('"')).toBe("&quot;");
      expect(escapeXml('a&b<c>d"e')).toBe("a&amp;b&lt;c&gt;d&quot;e");
    });

    it("leaves already-safe text untouched", () => {
      expect(escapeXml("/read/part-01/chapter-01")).toBe(
        "/read/part-01/chapter-01",
      );
    });
  });
});
