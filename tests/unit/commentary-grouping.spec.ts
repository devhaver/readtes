import { describe, expect, it } from "vitest";
import type { CommentaryItem } from "~~/shared/types/content";

const item = (
  anchorId: string,
  order: number,
  section: CommentaryItem["section"],
  targetSeif = 1,
): CommentaryItem => ({
  anchorId,
  order,
  label: { en: String(order), he: String(order) },
  sefariaRef: `x ${order}`,
  targetSeif,
  section,
  html: `item ${anchorId}`,
});

/** An unanchored item: known chapter, unknown seif — no `targetSeif`. */
const unanchoredItem = (
  anchorId: string,
  order: number,
  section: CommentaryItem["section"],
): CommentaryItem => ({
  anchorId,
  order,
  label: { en: String(order), he: String(order) },
  section,
  html: `item ${anchorId}`,
});

describe("groupCommentaryBySection", () => {
  it("groups Ohr Pnimi items under 'ohr-pnimi', sorted by order", () => {
    const items = [item("op-2", 2, "ohr-pnimi"), item("op-1", 1, "ohr-pnimi")];

    expect(groupCommentaryBySection(items)).toEqual([
      {
        section: "ohr-pnimi",
        items: [item("op-1", 1, "ohr-pnimi"), item("op-2", 2, "ohr-pnimi")],
      },
    ]);
  });

  it("only renders groups that actually have items", () => {
    const items = [item("op-1", 1, "ohr-pnimi")];
    const groups = groupCommentaryBySection(items);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.section).toBe("ohr-pnimi");
  });

  it("puts Ohr Pnimi before Histaklut Pnimit when both are present", () => {
    const items = [
      item("hp-1", 1, "histaklut-pnimit"),
      item("op-1", 1, "ohr-pnimi"),
    ];

    expect(groupCommentaryBySection(items).map((g) => g.section)).toEqual([
      "ohr-pnimi",
      "histaklut-pnimit",
    ]);
  });

  it("returns an empty array for no items", () => {
    expect(groupCommentaryBySection([])).toEqual([]);
  });

  it("interleaves unanchored items among anchored ones strictly by order, not grouped to either end", () => {
    const items = [
      item("op-1", 1, "ohr-pnimi", 1),
      unanchoredItem("op-2", 2, "ohr-pnimi"),
      item("op-3", 3, "ohr-pnimi", 2),
      unanchoredItem("op-4", 4, "ohr-pnimi"),
    ];

    expect(
      groupCommentaryBySection(items)[0]?.items.map((i) => i.anchorId),
    ).toEqual(["op-1", "op-2", "op-3", "op-4"]);
  });
});

describe("commentaryItemsForSeif", () => {
  it("selects only the items targeting the given seif, sorted by order", () => {
    const items = [
      item("op-2", 2, "ohr-pnimi", 1),
      item("op-1", 1, "ohr-pnimi", 1),
      item("op-3", 1, "ohr-pnimi", 2),
    ];

    expect(commentaryItemsForSeif(items, 1)).toEqual([
      item("op-1", 1, "ohr-pnimi", 1),
      item("op-2", 2, "ohr-pnimi", 1),
    ]);
  });

  it("returns an empty array when no item targets that seif", () => {
    const items = [item("op-1", 1, "ohr-pnimi", 1)];
    expect(commentaryItemsForSeif(items, 5)).toEqual([]);
  });

  it("includes items from every section, not just one", () => {
    const items = [
      item("hp-1", 1, "histaklut-pnimit", 3),
      item("op-1", 1, "ohr-pnimi", 3),
    ];

    expect(commentaryItemsForSeif(items, 3).map((i) => i.anchorId)).toEqual([
      "hp-1",
      "op-1",
    ]);
  });

  it("never matches an unanchored item (no targetSeif), for any seif", () => {
    const items = [
      unanchoredItem("op-9", 9, "ohr-pnimi"),
      item("op-1", 1, "ohr-pnimi", 1),
    ];

    expect(commentaryItemsForSeif(items, 1).map((i) => i.anchorId)).toEqual([
      "op-1",
    ]);
    expect(commentaryItemsForSeif(items, 9)).toEqual([]);
  });
});

describe("isAnchoredCommentaryItem", () => {
  it("is true for an item with targetSeif", () => {
    expect(isAnchoredCommentaryItem(item("op-1", 1, "ohr-pnimi", 1))).toBe(
      true,
    );
  });

  it("is false for an item without targetSeif", () => {
    expect(
      isAnchoredCommentaryItem(unanchoredItem("op-1", 1, "ohr-pnimi")),
    ).toBe(false);
  });
});

describe("hasAnchoredCommentaryItems / hasUnanchoredCommentaryItems", () => {
  it("anchored-only chapter: has anchored, has no unanchored", () => {
    const items = [
      item("op-1", 1, "ohr-pnimi", 1),
      item("op-2", 2, "ohr-pnimi", 2),
    ];

    expect(hasAnchoredCommentaryItems(items)).toBe(true);
    expect(hasUnanchoredCommentaryItems(items)).toBe(false);
  });

  it("unanchored-only chapter: has no anchored, has unanchored", () => {
    const items = [
      unanchoredItem("op-1", 1, "ohr-pnimi"),
      unanchoredItem("op-2", 2, "ohr-pnimi"),
    ];

    expect(hasAnchoredCommentaryItems(items)).toBe(false);
    expect(hasUnanchoredCommentaryItems(items)).toBe(true);
  });

  it("mixed chapter: has both", () => {
    const items = [
      item("op-1", 1, "ohr-pnimi", 1),
      unanchoredItem("op-2", 2, "ohr-pnimi"),
    ];

    expect(hasAnchoredCommentaryItems(items)).toBe(true);
    expect(hasUnanchoredCommentaryItems(items)).toBe(true);
  });

  it("empty chapter (no commentary at all): has neither", () => {
    expect(hasAnchoredCommentaryItems([])).toBe(false);
    expect(hasUnanchoredCommentaryItems([])).toBe(false);
  });
});

describe("unanchoredCommentaryItems", () => {
  it("selects only unanchored items, sorted by order", () => {
    const items = [
      unanchoredItem("op-3", 3, "ohr-pnimi"),
      item("op-2", 2, "ohr-pnimi", 1),
      unanchoredItem("op-1", 1, "ohr-pnimi"),
    ];

    expect(unanchoredCommentaryItems(items).map((i) => i.anchorId)).toEqual([
      "op-1",
      "op-3",
    ]);
  });

  it("returns an empty array for an anchored-only chapter", () => {
    const items = [item("op-1", 1, "ohr-pnimi", 1)];
    expect(unanchoredCommentaryItems(items)).toEqual([]);
  });
});

describe("groupCommentaryBySeif", () => {
  it("groups items under the seif they comment on, seifim ascending", () => {
    const items = [
      item("op-4", 4, "ohr-pnimi", 3),
      item("op-1", 1, "ohr-pnimi", 1),
      item("op-3", 3, "ohr-pnimi", 2),
      item("op-2", 2, "ohr-pnimi", 1),
    ];

    expect(
      groupCommentaryBySeif(items).map((group) => [
        group.seif,
        group.items.map((i) => i.anchorId),
      ]),
    ).toEqual([
      [1, ["op-1", "op-2"]],
      [2, ["op-3"]],
      [3, ["op-4"]],
    ]);
  });

  it("sorts within a group by order, not by input position", () => {
    const items = [
      item("op-9", 9, "ohr-pnimi", 1),
      item("op-2", 2, "ohr-pnimi", 1),
    ];

    expect(groupCommentaryBySeif(items)[0]?.items.map((i) => i.order)).toEqual([
      2, 9,
    ]);
  });

  it("puts the unanchored items in a trailing null-seif group", () => {
    const items = [
      unanchoredItem("op-5", 5, "ohr-pnimi"),
      item("op-1", 1, "ohr-pnimi", 2),
    ];

    expect(groupCommentaryBySeif(items).map((group) => group.seif)).toEqual([
      2,
      null,
    ]);
  });

  it("never emits an empty unanchored group for an anchored-only chapter", () => {
    const items = [item("op-1", 1, "ohr-pnimi", 1)];

    expect(
      groupCommentaryBySeif(items).some((group) => group.seif === null),
    ).toBe(false);
  });

  it("keeps a seif's own numbering independent of the items' running order", () => {
    // The defect issue #93 reported: seif 1 of part-01/chapter-01 carries 11
    // notes, so the 12th note belongs to seif 2 — the two numbers must not be
    // conflated.
    const items = Array.from({ length: 11 }, (_, index) =>
      item(`op-${index + 1}`, index + 1, "ohr-pnimi", 1),
    ).concat(item("op-12", 12, "ohr-pnimi", 2));

    const groups = groupCommentaryBySeif(items);

    expect(groups.map((group) => group.seif)).toEqual([1, 2]);
    expect(groups[0]?.items).toHaveLength(11);
    expect(groups[1]?.items.map((i) => i.order)).toEqual([12]);
  });

  it("returns no groups for no items", () => {
    expect(groupCommentaryBySeif([])).toEqual([]);
  });
});
