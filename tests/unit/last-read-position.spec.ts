import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLastReadPosition } from "~/composables/useLastReadPosition";

const KEY = "readtes:last-read-position";

describe("useLastReadPosition", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has no position before anything was read", () => {
    const { position } = useLastReadPosition();
    expect(position.value).toBeNull();
  });

  it("persists the position after the debounce, stamped with updatedAt", async () => {
    vi.setSystemTime(1_000);
    const { position, savePosition } = useLastReadPosition();

    void savePosition({
      locale: "en",
      part: 1,
      chapterId: "part-01/chapter-01",
      seif: 3,
      title: "Chapter 1",
    });
    expect(position.value).toBeNull();

    await vi.advanceTimersByTimeAsync(600);

    expect(position.value).toMatchObject({
      chapterId: "part-01/chapter-01",
      seif: 3,
      // Stamped when the debounce fires, not when it was requested.
      updatedAt: 1_500,
    });
    await vi.advanceTimersByTimeAsync(100);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null")).toMatchObject({
      locale: "en",
      part: 1,
      seif: 3,
      title: "Chapter 1",
    });
  });

  it("keeps only the last of a burst of updates", async () => {
    const { position, savePosition } = useLastReadPosition();
    const base = {
      locale: "en",
      part: 1,
      chapterId: "part-01/chapter-01",
      title: "Chapter 1",
    };

    void savePosition({ ...base, seif: 1 });
    void savePosition({ ...base, seif: 2 });
    void savePosition({ ...base, seif: 5 });
    await vi.advanceTimersByTimeAsync(600);

    expect(position.value?.seif).toBe(5);
  });
});
