import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { parseSeifNumber } from "~/composables/useSeifJump";

describe("parseSeifNumber", () => {
  it("accepts a number inside 1..max, trimming whitespace", () => {
    expect(parseSeifNumber("12", 40)).toEqual({ status: "ok", n: 12 });
    expect(parseSeifNumber(" 7 ", 40)).toEqual({ status: "ok", n: 7 });
    expect(parseSeifNumber("40", 40)).toEqual({ status: "ok", n: 40 });
  });

  it("clamps a number above max and reports it out of range", () => {
    expect(parseSeifNumber("99", 40)).toEqual({
      status: "out-of-range",
      n: 40,
    });
  });

  it("clamps zero up to 1 and reports it out of range", () => {
    expect(parseSeifNumber("0", 40)).toEqual({ status: "out-of-range", n: 1 });
  });

  it("rejects anything that is not plain digits", () => {
    for (const raw of ["", "  ", "abc", "-3", "1.5", "1e2", "+4", "3a"]) {
      expect(parseSeifNumber(raw, 40)).toEqual({ status: "invalid" });
    }
  });

  it("rejects everything when the chapter has no seifim", () => {
    expect(parseSeifNumber("1", 0)).toEqual({ status: "invalid" });
  });
});

describe("useSeifJump", () => {
  const mountHarness = async (seifNumbers: number[]) => {
    let api!: ReturnType<typeof useSeifJump>;
    const Harness = defineComponent({
      setup() {
        api = useSeifJump(() => seifNumbers);
        return () => h("div");
      },
    });
    await mountSuspended(Harness);
    return api;
  };

  it("sets the URL hash and clears the error for an in-range seif", async () => {
    const { input, error, jump } = await mountHarness([1, 2, 3, 4, 5]);
    input.value = "3";
    await jump();

    expect(useRoute().hash).toBe("#seif-3");
    expect(error.value).toBe("");
  });

  it("clamps to the last seif and shows the range error", async () => {
    const { input, error, jump } = await mountHarness([1, 2, 3, 4, 5]);
    input.value = "50";
    await jump();

    expect(useRoute().hash).toBe("#seif-5");
    expect(input.value).toBe("5");
    expect(error.value).toContain("5");
  });

  it("shows the error and leaves the hash alone for non-numeric input", async () => {
    const { input, error, jump } = await mountHarness([1, 2, 3]);
    const before = useRoute().hash;
    input.value = "abc";
    await jump();

    expect(useRoute().hash).toBe(before);
    expect(error.value).not.toBe("");
  });
});
