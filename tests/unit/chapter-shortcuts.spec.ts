import { describe, expect, it } from "vitest";
import { resolveChapterShortcut } from "~/composables/useChapterShortcuts";

const press = (key: string, overrides: Record<string, unknown> = {}) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  target: document.body as EventTarget,
  ...overrides,
});

describe("resolveChapterShortcut", () => {
  it("maps [ and ] regardless of direction", () => {
    for (const dir of ["ltr", "rtl"] as const) {
      expect(resolveChapterShortcut(press("["), dir)).toBe("prev");
      expect(resolveChapterShortcut(press("]"), dir)).toBe("next");
    }
  });

  it("maps Alt+Arrow keys by document direction", () => {
    const left = press("ArrowLeft", { altKey: true });
    const right = press("ArrowRight", { altKey: true });
    expect(resolveChapterShortcut(left, "ltr")).toBe("prev");
    expect(resolveChapterShortcut(right, "ltr")).toBe("next");
    expect(resolveChapterShortcut(right, "rtl")).toBe("prev");
    expect(resolveChapterShortcut(left, "rtl")).toBe("next");
  });

  it("ignores bare arrows and unrelated keys", () => {
    expect(resolveChapterShortcut(press("ArrowLeft"), "ltr")).toBeNull();
    expect(resolveChapterShortcut(press("a"), "ltr")).toBeNull();
    expect(
      resolveChapterShortcut(press("ArrowUp", { altKey: true }), "ltr"),
    ).toBeNull();
  });

  it("ignores Ctrl, Meta and Shift chords", () => {
    for (const mod of ["ctrlKey", "metaKey", "shiftKey"]) {
      expect(
        resolveChapterShortcut(press("[", { [mod]: true }), "ltr"),
      ).toBeNull();
      expect(
        resolveChapterShortcut(
          press("ArrowLeft", { altKey: true, [mod]: true }),
          "ltr",
        ),
      ).toBeNull();
    }
  });

  it("ignores events from inputs, textareas and contenteditable", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    // The DOM env may not derive isContentEditable from the attribute.
    Object.defineProperty(editable, "isContentEditable", { value: true });
    for (const target of [input, textarea, editable]) {
      expect(resolveChapterShortcut(press("]", { target }), "ltr")).toBeNull();
    }
  });
});
