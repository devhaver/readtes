// A guardrail, not a unit test. `CHAPTER_KIND_ORDER` used to be copied into
// four modules that cannot import each other's build graph
// (`app/utils/chapterGrouping.ts`, `scripts/lib/toc-builder.ts`,
// `scripts/lib/toc-splits.ts`, `nuxt.config.ts`), each with a comment asking
// the next person to keep them in sync. Issue #86 added two kinds and would
// have had to edit all four correctly.
//
// The copies are gone — `shared/` is reachable from every one of those — but
// the failure they invited is still possible one step earlier: adding a kind
// to `chapterKindSchema` and forgetting to give it a reading position. That
// is silent, because `indexOf` returns -1 and a kind with no position sorts
// to the front of every part.
import { describe, expect, it } from "vitest";
import { chapterKindSchema } from "../../shared/types/content.ts";
import {
  CHAPTER_KIND_ORDER,
  chapterKindOrder,
} from "../../shared/utils/chapterKinds.ts";

describe("CHAPTER_KIND_ORDER", () => {
  it("gives every ChapterKind exactly one reading position", () => {
    expect([...CHAPTER_KIND_ORDER].sort()).toEqual(
      [...chapterKindSchema.options].sort(),
    );
  });

  it("puts the Introduction before the first chapter", () => {
    // It introduces the whole work, and is housed in part-01 precisely so a
    // reader meets it there (issue #86). A position after "chapter" would put
    // Baal HaSulam's introduction below the text it introduces.
    expect(chapterKindOrder("introduction")).toBeLessThan(
      chapterKindOrder("chapter"),
    );
  });

  it("keeps questions before answers, and each apparatus in subject order", () => {
    const positionsOf = (prefix: string) =>
      CHAPTER_KIND_ORDER.filter((kind) => kind.startsWith(prefix)).map(
        chapterKindOrder,
      );

    const questions = positionsOf("questions-");
    const answers = positionsOf("answers-");

    expect(Math.max(...questions)).toBeLessThan(Math.min(...answers));
    for (const positions of [questions, answers]) {
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it("orders the subjects the same way in both apparatuses", () => {
    const subjects = (prefix: string) =>
      CHAPTER_KIND_ORDER.filter((kind) => kind.startsWith(prefix)).map((kind) =>
        kind.slice(prefix.length),
      );

    expect(subjects("questions-")).toEqual(subjects("answers-"));
  });
});
