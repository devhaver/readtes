import { describe, expect, it } from "vitest";
import {
  isContentChunkId,
  stripContentChunkPrefetchHints,
  type PrefetchableManifestEntry,
} from "~~/shared/utils/manifestPrefetch";

describe("isContentChunkId", () => {
  it("matches content/parts/** chunk ids", () => {
    expect(
      isContentChunkId(
        "../content/parts/part-01/chapters/chapter-01/source.he-jerusalem-1956.json",
      ),
    ).toBe(true);
  });

  it("matches content/toc.parts/** chunk ids", () => {
    expect(isContentChunkId("../content/toc.parts/part-01.json")).toBe(true);
  });

  it("does not match app-code chunk ids", () => {
    expect(isContentChunkId("app/composables/useChapterContent.ts")).toBe(
      false,
    );
    expect(isContentChunkId("app/pages/read/[part]/[chapter].vue")).toBe(false);
  });

  it("does not match content/toc.volumes.json (not a per-chapter/part chunk)", () => {
    expect(isContentChunkId("../content/toc.volumes.json")).toBe(false);
  });
});

describe("stripContentChunkPrefetchHints", () => {
  it("clears prefetch/preload on content-chunk entries", () => {
    const manifest: Record<string, PrefetchableManifestEntry> = {
      "../content/parts/part-01/chapters/chapter-01/source.v1.json": {
        prefetch: true,
        preload: true,
      },
      "../content/toc.parts/part-01.json": {
        prefetch: true,
        preload: true,
      },
    };

    stripContentChunkPrefetchHints(manifest);

    expect(
      manifest["../content/parts/part-01/chapters/chapter-01/source.v1.json"],
    ).toMatchObject({ prefetch: false, preload: false });
    expect(manifest["../content/toc.parts/part-01.json"]).toMatchObject({
      prefetch: false,
      preload: false,
    });
  });

  it("leaves non-content (app-code) entries' own prefetch/preload untouched", () => {
    const manifest: Record<string, PrefetchableManifestEntry> = {
      "app/composables/useChapterContent.ts": {
        prefetch: true,
        preload: true,
      },
    };

    stripContentChunkPrefetchHints(manifest);

    expect(manifest["app/composables/useChapterContent.ts"]).toMatchObject({
      prefetch: true,
      preload: true,
    });
  });

  it("strips content-chunk ids out of every entry's dynamicImports list", () => {
    const manifest: Record<string, PrefetchableManifestEntry> = {
      "app/composables/useChapterContent.ts": {
        dynamicImports: [
          "../content/parts/part-01/chapters/chapter-01/source.v1.json",
          "../content/parts/part-01/chapters/chapter-02/source.v1.json",
        ],
      },
      "app/composables/useLocalizedParts.ts": {
        dynamicImports: ["../content/toc.parts/part-01.json"],
      },
    };

    stripContentChunkPrefetchHints(manifest);

    expect(
      manifest["app/composables/useChapterContent.ts"]?.dynamicImports,
    ).toEqual([]);
    expect(
      manifest["app/composables/useLocalizedParts.ts"]?.dynamicImports,
    ).toEqual([]);
  });

  it("keeps non-content dynamicImports entries (e.g. app-code -> app-code)", () => {
    const manifest: Record<string, PrefetchableManifestEntry> = {
      "app/pages/read/[part]/[chapter].vue": {
        dynamicImports: [
          "app/composables/useChapterContent.ts",
          "../content/parts/part-01/chapters/chapter-01/source.v1.json",
        ],
      },
    };

    stripContentChunkPrefetchHints(manifest);

    expect(
      manifest["app/pages/read/[part]/[chapter].vue"]?.dynamicImports,
    ).toEqual(["app/composables/useChapterContent.ts"]);
  });

  it("leaves entries with no dynamicImports field alone", () => {
    const manifest: Record<string, PrefetchableManifestEntry> = {
      "app/composables/useLocalizedVolumes.ts": {},
    };

    stripContentChunkPrefetchHints(manifest);

    expect(manifest["app/composables/useLocalizedVolumes.ts"]).toMatchObject(
      {},
    );
  });

  it("returns the same (mutated) manifest object", () => {
    const manifest: Record<string, PrefetchableManifestEntry> = {};
    expect(stripContentChunkPrefetchHints(manifest)).toBe(manifest);
  });
});
