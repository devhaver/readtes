import { describe, expect, it } from "vitest";
import type { CommentaryItem } from "~~/shared/types/content";

const HEBREW = "he-jerusalem-1956";

const commentaryItem = (anchorId: string): CommentaryItem => ({
  anchorId,
  order: 1,
  label: { en: "1", he: "א" },
  sefariaRef: "x",
  targetSeif: 1,
  section: "ohr-pnimi",
  html: "…",
});

/** An unanchored item: known chapter, unknown seif — no `targetSeif` (issue #79). */
const unanchoredItem = (anchorId: string): CommentaryItem => ({
  anchorId,
  order: 1,
  label: { en: "1", he: "1" },
  section: "ohr-pnimi",
  html: "…",
});

describe("resolveMissingAnchorNotice", () => {
  it("is null when no anchor is active", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: null,
        anchorOrigin: null,
        displayedItems: [],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toBeNull();
  });

  it("is null when the anchor didn't originate from the source pane", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-1",
        anchorOrigin: "commentary",
        displayedItems: [],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toBeNull();
  });

  it("is null for a non-source-origin activation (e.g. Inner Observation, which carries no anchors)", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-3",
        anchorOrigin: "inner-observation",
        displayedItems: [],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toBeNull();
  });

  it("is null when the currently-displayed version already has the anchor", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-1",
        anchorOrigin: "source",
        displayedItems: [commentaryItem("op-1")],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toBeNull();
  });

  it("offers a switch to Hebrew when the anchor is missing but Hebrew has it", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-9",
        anchorOrigin: "source",
        displayedItems: [commentaryItem("op-1")],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: [commentaryItem("op-9")],
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ anchorId: "op-9", canSwitchToHebrew: true });
  });

  it("doesn't offer a switch when Hebrew doesn't have the anchor either", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-9",
        anchorOrigin: "source",
        displayedItems: [],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ anchorId: "op-9", canSwitchToHebrew: false });
  });

  it("doesn't offer a switch when Hebrew is already the version being shown", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-9",
        anchorOrigin: "source",
        displayedItems: [],
        selectedVersionId: HEBREW,
        hebrewItems: [],
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ anchorId: "op-9", canSwitchToHebrew: false });
  });

  // Issue #79: an unanchored-only chapter's commentary must not spuriously
  // trigger this notice. In practice this can never happen structurally —
  // `activeAnchor`/`anchorOrigin: "source"` only ever comes from a real
  // `tes-anchor` marker in the source HTML, and `validate-content.ts`
  // forbids a source `anchors[]` entry from ever naming an unanchored item
  // — but these tests pin that guarantee down explicitly rather than
  // relying on it only being true by construction elsewhere.
  it("is null for an unanchored item's own anchorId activated from the commentary pane (not source-origin)", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-3",
        anchorOrigin: "commentary",
        displayedItems: [unanchoredItem("op-3")],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: [unanchoredItem("op-3")],
        hebrewVersionId: HEBREW,
      }),
    ).toBeNull();
  });

  it("ignores unanchored items already shown when deciding whether a source-origin anchor is missing", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "op-1",
        anchorOrigin: "source",
        displayedItems: [commentaryItem("op-1"), unanchoredItem("op-3")],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toBeNull();
  });
});

// `resolveAnchorAvailability` is the per-anchor rule `resolveMissingAnchorNotice`
// itself delegates to — study mode (`StudyStream`) runs this once per
// anchor in `expandedAnchors` instead of gating on a single global
// `activeAnchor`/`anchorOrigin`, since several inline disclosures can be
// open at once, each independently "missing" or not.
describe("resolveAnchorAvailability", () => {
  it("is not missing when the currently-displayed version already has the anchor", () => {
    expect(
      resolveAnchorAvailability({
        anchorId: "op-1",
        displayedItems: [commentaryItem("op-1")],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ missing: false, canSwitchToHebrew: false });
  });

  it("is missing, and offers a switch to Hebrew, when Hebrew has the anchor", () => {
    expect(
      resolveAnchorAvailability({
        anchorId: "op-9",
        displayedItems: [commentaryItem("op-1")],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: [commentaryItem("op-9")],
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ missing: true, canSwitchToHebrew: true });
  });

  it("is missing with no Hebrew switch offered when Hebrew doesn't have it either", () => {
    expect(
      resolveAnchorAvailability({
        anchorId: "op-9",
        displayedItems: [],
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ missing: true, canSwitchToHebrew: false });
  });

  it("doesn't offer a switch when Hebrew is already the version being shown", () => {
    expect(
      resolveAnchorAvailability({
        anchorId: "op-9",
        displayedItems: [],
        selectedVersionId: HEBREW,
        hebrewItems: [],
        hebrewVersionId: HEBREW,
      }),
    ).toEqual({ missing: true, canSwitchToHebrew: false });
  });

  it("checks each anchor independently — several can be open in study mode at once", () => {
    const displayedItems = [commentaryItem("op-1")];

    expect(
      resolveAnchorAvailability({
        anchorId: "op-1",
        displayedItems,
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }).missing,
    ).toBe(false);

    expect(
      resolveAnchorAvailability({
        anchorId: "op-2",
        displayedItems,
        selectedVersionId: "en-sefaria-community",
        hebrewItems: null,
        hebrewVersionId: HEBREW,
      }).missing,
    ).toBe(true);
  });
});
