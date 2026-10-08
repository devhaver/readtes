/**
 * Re-applies the ToC title rules (`normalizeEnTitle` for chapters,
 * `partDisplayTitle` for parts) to the committed ToC — for when they change
 * without a full Sefaria re-import: chapters now read "Inner Observation N"
 * rather than "Histaklut Pnimit N", and parts carry their names rather than
 * "Section I". Rewrites `toc.json` and its splits; idempotent.
 *
 * `pnpm migrate:toc-titles`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tocSchema, versionsFileSchema } from "../shared/types/content.ts";
import { normalizeEnTitle, partDisplayTitle } from "./lib/toc-builder.ts";
import { writeTocSplitFiles } from "./lib/toc-splits.ts";

const contentDir = join(
  fileURLToPath(new URL("..", import.meta.url)),
  "content",
);

const main = (): void => {
  const toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );
  let changed = 0;
  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      const title = partDisplayTitle(
        part.number,
        part.title.he ?? "",
        part.title.en ?? "",
      );
      if (title.en !== part.title.en || title.he !== part.title.he) {
        part.title = title;
        changed += 1;
      }
      for (const chapter of part.chapters) {
        const en = chapter.title.en;
        if (en === undefined) continue;
        const normalized = normalizeEnTitle(en);
        if (normalized !== en) {
          chapter.title.en = normalized;
          changed += 1;
        }
      }
    }
  }
  writeFileSync(
    join(contentDir, "toc.json"),
    `${JSON.stringify(toc, null, 2)}\n`,
    "utf-8",
  );
  writeTocSplitFiles(contentDir, toc, versions);
  console.log(`Renamed ${changed} title(s).`);
};

main();
