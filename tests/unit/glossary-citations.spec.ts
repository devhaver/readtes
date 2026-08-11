/**
 * `loadCitations()` is wired straight to `@open` on 125 rows. If it can
 * reject, a flaky network turns into an unhandled promise rejection and every
 * open row sits on "Loading passages…" with nothing to click. So the contract
 * under test is: it never rejects, and a failure is reported as state.
 */
import { describe, expect, it, vi } from "vitest";

const CITATIONS_MODULE = "~~/content/glossary/tes-en.citations.json";

describe("useGlossaryCitations", () => {
  it("loads the chunk once and shares it across every row", async () => {
    const { citationsFor, hasFailed, hasLoaded, loadCitations } =
      useGlossaryCitations();

    expect(hasLoaded.value).toBe(false);

    await Promise.all([loadCitations(), loadCitations()]);

    expect(hasLoaded.value).toBe(true);
    expect(hasFailed.value).toBe(false);
    expect(citationsFor("or").length).toBeGreaterThan(0);
  });

  it("returns an empty list for a term with no citations rather than undefined", async () => {
    const { citationsFor, loadCitations } = useGlossaryCitations();
    await loadCitations();

    expect(citationsFor("no-such-term")).toEqual([]);
  });

  it("reports a failed chunk as state instead of rejecting", async () => {
    vi.doMock(CITATIONS_MODULE, () => {
      throw new Error("chunk unavailable");
    });
    vi.resetModules();

    const { useGlossaryCitations: freshComposable } =
      await import("~/composables/useGlossaryCitations");
    const { hasFailed, hasLoaded, isLoading, loadCitations } =
      freshComposable();

    await expect(loadCitations()).resolves.toBeUndefined();

    expect(hasFailed.value).toBe(true);
    expect(hasLoaded.value).toBe(false);
    expect(isLoading.value).toBe(false);

    vi.doUnmock(CITATIONS_MODULE);
    vi.resetModules();
  });
});
