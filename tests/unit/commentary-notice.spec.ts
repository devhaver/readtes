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

  it("is null for a summary-origin seif-N jump (not a commentary anchor)", () => {
    expect(
      resolveMissingAnchorNotice({
        activeAnchor: "seif-3",
        anchorOrigin: "summary",
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
});
