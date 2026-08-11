/**
 * Guardrail for the invariant issue #84 exists to establish: a chapter page's
 * *server-rendered* HTML must contain none of its part's Inner Observation
 * essay text. Inner Observation is part-scoped, so SSR'ing it put the same
 * essays into every chapter document of the part — ~411MB of the built site.
 *
 * Deliberately asserts on rendered HTML against the committed corpus, not on
 * a mocked loader's call count: a call count only says "this composable did
 * not call that function", which a refactor can satisfy while still putting
 * the text on the page. Same spirit as `no-full-toc-import.spec.ts` — a blunt
 * check of the actual output, because silently re-inflating every reader page
 * is a far worse failure mode than this spec being over-literal.
 *
 * The second `describe` is the positive control: it renders the identical
 * component in the browser and asserts the very same needles DO appear, so a
 * green first assertion can never mean "the needles were bogus" or "the
 * loader is broken".
 */
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import partOneToc from "~~/content/toc.parts/part-01.json";
import type {
  ChapterLayerFile,
  SourceSegment,
  TocChapter,
} from "~~/shared/types/content";

const PART_ID = "part-01";

// The committed split-ToC file, exactly as the reader page reads it (JSON
// imports widen `kind`/`availableLayers` to `string`, hence the cast).
const innerObservationChapters = (partOneToc.chapters as TocChapter[]).filter(
  (chapter) => chapter.kind === "inner-observation",
);

/** Tags out, whitespace collapsed — applied to both sides of every compare. */
const visibleText = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Distinctive prose from the part's committed Inner Observation source, long
 * enough that a hit cannot be a coincidence of shared reader chrome.
 */
const essayNeedles = (versionId: string): string[] => {
  const file = JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "content/parts",
        PART_ID,
        "chapters/inner-observation-01",
        `source.${versionId}.json`,
      ),
      "utf-8",
    ),
  ) as ChapterLayerFile<SourceSegment>;

  return file.items
    .map((item) => visibleText(item.html))
    .filter((text) => text.length >= 200)
    .slice(0, 3)
    .map((text) => text.slice(60, 140));
};

/**
 * Stands in for the reader page's Inner Observation subtree: the same
 * composable, the same real per-part lazy loader, rendering every loaded
 * segment's body the way `InnerObservationPane` does. Rendered without the
 * pane component itself only because that one needs the full Nuxt/i18n app
 * context, which `renderToString` over a bare `createSSRApp` has no way to
 * provide — the text that must not be in the HTML is identical either way.
 */
const InnerObservationSubtree = defineComponent({
  // `async setup` + `await` on purpose, even though the composable is
  // synchronous: `await` on a non-promise is a no-op, but if the composable
  // ever goes back to resolving the bodies in setup (its shape before this
  // change — the page did `await useInnerObservationContent(...)` from its
  // own `<script setup>`) the server render will wait for them and the
  // assertions below will see the essays in the HTML.
  async setup() {
    const { sections, state } = await useInnerObservationContent(
      PART_ID,
      innerObservationChapters,
    );

    return () =>
      h("div", { "data-state": state.value }, [
        ...sections.value.flatMap((section) =>
          Object.values(section.itemsByVersion).flatMap((file) =>
            (file?.items ?? []).map((item) =>
              h("p", { innerHTML: item.html }, undefined),
            ),
          ),
        ),
      ]);
  },
});

describe("guardrail: Inner Observation essays are never server-rendered", () => {
  it("emits none of the part's essay text in an SSR render of a chapter's pane", async () => {
    const html = await renderToString(createSSRApp(InnerObservationSubtree));

    // Sanity: the corpus really does have essays for this part, so an empty
    // needle list can't silently make this pass.
    const needles = [
      ...essayNeedles("he-jerusalem-1956"),
      ...essayNeedles("en-ai"),
    ];
    expect(needles.length).toBeGreaterThan(0);
    expect(innerObservationChapters.length).toBeGreaterThan(0);

    const rendered = visibleText(html);
    expect(needles.filter((needle) => rendered.includes(needle))).toEqual([]);
    // The server render resolves to the pending state, which is what makes
    // the pane show a skeleton rather than "no Inner Observation available".
    expect(html).toContain('data-state="pending"');
  });

  it("never awaits useInnerObservationContent in the chapter page", () => {
    const page = readFileSync(
      join(process.cwd(), "app/pages/read/[part]/[chapter].vue"),
      "utf-8",
    );

    // Awaiting it again would only reintroduce SSR'd bodies if the composable
    // also went back to loading in setup, but the two always regressed
    // together and the `await` is the visible half.
    expect(page).not.toMatch(/await\s+useInnerObservationContent\s*\(/);
  });
});

describe("positive control: the same needles do appear once the browser loads", () => {
  it("renders the part's essay text after mount", async () => {
    const needles = essayNeedles("he-jerusalem-1956");
    const wrapper = await mountSuspended(InnerObservationSubtree);

    // Real dynamic imports of the part's committed JSON, not a stub — poll
    // rather than guess a microtask depth.
    await vi.waitFor(() =>
      expect(wrapper.html()).toContain('data-state="ready"'),
    );
    const rendered = visibleText(wrapper.html());
    expect(needles.length).toBeGreaterThan(0);
    for (const needle of needles) {
      expect(rendered).toContain(needle);
    }
  });
});
