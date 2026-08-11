/**
 * Guardrail: the volume -> part grouping must match Bnei Baruch's published
 * six-volume edition, which is what this site presents itself as
 * reproducing. Sefaria groups the same sixteen parts differently (Vol 1 =
 * parts 1-3, …) and we shipped that grouping by accident until #85, so this
 * pins the correct one rather than leaving it as an unremarkable-looking
 * data edit anyone could revert.
 *
 * Asserted against the committed `content/toc.volumes.json` — the derived,
 * app-facing file the volumes index, volume contents pages and reader
 * breadcrumbs actually render from. `validate-content`'s equivalence check
 * separately guarantees it is exactly derivable from `content/toc.json`, so
 * pinning the derived file pins the canonical one too.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tocVolumesFileSchema } from "../../shared/types/content.ts";

/** Bnei Baruch's published edition: volume number -> its part numbers. */
const BNEI_BARUCH_GROUPING: Record<number, number[]> = {
  1: [1, 2, 3, 4],
  2: [5, 6, 7],
  3: [8, 9, 10],
  4: [11, 12],
  5: [13, 14],
  6: [15, 16],
};

const volumesFile = tocVolumesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "content/toc.volumes.json"), "utf-8"),
  ),
);

describe("volume grouping", () => {
  it("groups parts into volumes exactly as the Bnei Baruch edition does", () => {
    const grouping = Object.fromEntries(
      volumesFile.volumes.map((volume) => [
        volume.number,
        volume.parts.map((part) => part.number),
      ]),
    );

    expect(grouping).toEqual(BNEI_BARUCH_GROUPING);
  });

  it("keeps parts in ascending order within and across volumes", () => {
    const partNumbers = volumesFile.volumes.flatMap((volume) =>
      volume.parts.map((part) => part.number),
    );

    expect(partNumbers).toEqual([...partNumbers].sort((a, b) => a - b));
  });
});
