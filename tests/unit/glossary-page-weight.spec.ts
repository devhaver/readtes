/**
 * Guardrail. `/glossary` is the heaviest HTML document on the site and that
 * is a deliberate trade — all 125 terms and all 13 house rules are
 * server-rendered so the page is searchable with the browser's own
 * find-in-page and readable without JavaScript. The trade only holds if the
 * markup stays disciplined, which is why `GlossaryEntryRow.vue` and
 * `GlossaryAttestationStrip.vue` style themselves from namespaced unscoped
 * CSS instead of utility classes: every character of a `class` attribute and
 * every `data-v-…=""` scope marker is paid 125 times over.
 *
 * That discipline is invisible in review — re-adding a utility class string
 * to the row looks like an improvement — so it is measured here instead.
 * The numbers below were produced by this spec, on this branch.
 */
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import GlossaryPage from "~/pages/glossary.vue";
import glossaryIndex from "~~/content/glossary/tes-en.index.json";

/**
 * Prerendered output carries no template comments, so neither does the
 * figure this spec budgets against.
 */
const renderedSize = (html: string) =>
  html.replace(/<!--[\s\S]*?-->/g, "").length;

/**
 * Measured 190,618 chars at the time of writing, down from 342,276 before
 * the row markup was rewritten. The headroom is for content — a new term or
 * a new house rule should not fail this — but not for another 1.5KB per row.
 */
const PAGE_BUDGET = 230_000;

/** Measured 880 chars. Before the rewrite it was 2,008. */
const ROW_BUDGET = 1_100;

describe("glossary page weight", () => {
  it("renders the whole page inside its document budget", async () => {
    const wrapper = await mountSuspended(GlossaryPage);

    expect(renderedSize(wrapper.html())).toBeLessThan(PAGE_BUDGET);
  });

  it("keeps a collapsed term row inside its per-row budget", async () => {
    const wrapper = await mountSuspended(GlossaryPage);
    const rows = wrapper.findAll("li h3 button");

    expect(rows).toHaveLength(glossaryIndex.entries.length);

    const perRow =
      renderedSize(rows.map((row) => row.html()).join("")) / rows.length;
    expect(perRow).toBeLessThan(ROW_BUDGET);
  });
});
