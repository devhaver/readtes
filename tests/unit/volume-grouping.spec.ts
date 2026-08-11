/**
 * Guardrail: the volume -> part grouping must match Bnei Baruch's published
 * six-volume edition, which is what this site presents itself as
 * reproducing. Sefaria groups the same sixteen parts differently (Vol 1 =
 * parts 1-3, …) and we shipped that grouping by accident until #85, so this
 * pins the correct one rather than leaving it as an unremarkable-looking
 * data edit anyone could revert.
 *
 * WHAT THIS PROVES. The expected grouping is not written out here. It is
 * derived at test time from `tests/fixtures/km-tree/tes-collection.json`, a
 * trimmed slice of Bnei Baruch's own
 * `https://kabbalahmedia.info/backend/sqdata?uid=xtKmrbb9` response — the
 * COLLECTION -> VOLUME -> PART tree that `scripts/lib/km-tree.ts` already
 * walks for the KabbalahMedia importer, read here through that same
 * `extractKmTesTree`. So the committed grouping is checked against the
 * publisher's own structural data, not against a table retyped from the
 * issue: a transcription error in #85 would fail this test rather than be
 * cemented by it.
 *
 * WHAT IT DOES NOT PROVE. The fixture is a committed snapshot (fetched
 * 2026-08-11), so this cannot notice KabbalahMedia restructuring its tree
 * upstream — that only surfaces when someone re-runs the regeneration
 * command below. And kabbalahmedia.info is Bnei Baruch's own publication of
 * this edition, not a scan of the printed volumes; it is the closest
 * machine-readable authority available, not the paper itself.
 *
 * Regenerate the fixture (needs network, run from the repo root):
 *
 *   curl -sS -A "read-tes structure check" \
 *     "https://kabbalahmedia.info/backend/sqdata?uid=xtKmrbb9" \
 *   | jq 'def find($id): .. | objects | select(.id? == $id);
 *         [find("xtKmrbb9")] | .[0]
 *         | { sources: [ { id, parent_id, type, name, children:
 *             [ .children[] | { id, parent_id, type, name, children:
 *               [ .children[] | { id, parent_id, type, name } ] } ] } ] }' \
 *     > tests/fixtures/km-tree/tes-collection.json
 *
 * The committed grouping is asserted against `content/toc.volumes.json` —
 * the derived, app-facing file the volumes index, volume contents pages and
 * reader breadcrumbs actually render from. `validate-content`'s equivalence
 * check separately guarantees it is exactly derivable from
 * `content/toc.json`, so pinning the derived file pins the canonical one
 * too.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { KmSqData } from "../../scripts/lib/km-tree.ts";
import {
  extractKmTesTree,
  parseKmPartNumber,
} from "../../scripts/lib/km-tree.ts";
import { tocVolumesFileSchema } from "../../shared/types/content.ts";

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf-8"));

/** `"Vol. 3"` -> `3`. Returns `undefined` for anything else — never guessed. */
const parseKmVolumeNumber = (volumeName: string): number | undefined => {
  const match = /^Vol\. (\d+)$/.exec(volumeName.trim());
  return match ? Number.parseInt(match[1] as string, 10) : undefined;
};

/**
 * Bnei Baruch's grouping, read out of their own tree rather than restated:
 * volume number -> its part numbers. Throws on any node name this cannot
 * parse, so a reshaped upstream fixture is a loud failure rather than a
 * silently thinner expectation.
 */
const groupingFromKmTree = (sqdata: KmSqData): Record<number, number[]> =>
  Object.fromEntries(
    extractKmTesTree(sqdata).map((volume) => {
      const volumeNumber = parseKmVolumeNumber(volume.name);
      if (volumeNumber === undefined) {
        throw new Error(
          `Unparsable KabbalahMedia volume name "${volume.name}"`,
        );
      }
      return [
        volumeNumber,
        volume.parts.map((part) => {
          const partNumber = parseKmPartNumber(part.name);
          if (partNumber === undefined) {
            throw new Error(
              `Unparsable KabbalahMedia part name "${part.name}"`,
            );
          }
          return partNumber;
        }),
      ];
    }),
  );

/**
 * Read and validate inside the tests, not at module scope — a malformed
 * `toc.volumes.json` or fixture should fail a named test, not blow up
 * collection with no indication of which spec cared.
 */
const readVolumesFile = () =>
  tocVolumesFileSchema.parse(readJson("content/toc.volumes.json"));

const readBneiBaruchGrouping = () =>
  groupingFromKmTree(
    readJson("tests/fixtures/km-tree/tes-collection.json") as KmSqData,
  );

describe("volume grouping", () => {
  it("groups parts into volumes exactly as the Bnei Baruch edition does", () => {
    const grouping = Object.fromEntries(
      readVolumesFile().volumes.map((volume) => [
        volume.number,
        volume.parts.map((part) => part.number),
      ]),
    );

    expect(grouping).toEqual(readBneiBaruchGrouping());
  });

  it("covers all sixteen parts exactly once, in ascending order", () => {
    const partNumbers = readVolumesFile().volumes.flatMap((volume) =>
      volume.parts.map((part) => part.number),
    );

    expect(partNumbers).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
  });
});
