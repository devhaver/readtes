import { describe, expect, it } from "vitest";
import type { CommentaryItem } from "~~/shared/types/content";

const item = (
  anchorId: string,
  order: number,
  section: CommentaryItem["section"],
): CommentaryItem => ({
  anchorId,
  order,
  label: { en: String(order), he: String(order) },
  sefariaRef: `x ${order}`,
  targetSeif: 1,
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
});
