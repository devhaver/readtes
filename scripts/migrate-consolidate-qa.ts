/**
 * One-off migration for issue #91: folds the many per-answer chapters of
 * every `answers-terminology`/`answers-topics` kind (one chapter per
 * printed answer) into a single consolidated chapter per kind per part,
 * slug `<kind>-01`, mirroring the `questions-*` chapters (already one
 * chapter holding every question). Every version that had *any* per-answer
 * chapter file gets a consolidated file — a version that only ever covered
 * some answers (e.g. `en-bb`) still consolidates, byte-faithfully, to a
 * file holding just those items (see `checkTranslatedVersionIntegrity` in
 * `validate-content.ts` for how that subset is validated).
 *
 * `pnpm migrate:consolidate-qa [--dry-run]`. Deterministic and idempotent:
 * a second run recognizes every `<kind>-01` chapter it already produced
 * (its title no longer carries a per-answer numeral suffix) and does
 * nothing — `git diff` is empty after a second run against unchanged input.
 *
 * The item-level merge (`consolidateAnswerSegments`, `n` reset to the
 * originating answer's own ordinal) is shared with the Sefaria importer
 * (`import-sefaria.ts`) via `scripts/lib/qa-consolidation.ts`, so a future
 * `pnpm import:sefaria` run and this migration produce byte-identical
 * output for equivalent input.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chapterLayerFileSchema,
  tocSchema,
  versionsFileSchema,
  type ChapterKind,
  type ChapterLayerFile,
  type SourceSegment,
  type Toc,
  type TocChapter,
} from "../shared/types/content.ts";
import { chapterSlug } from "./lib/chapter-units.ts";
import { hebrewNumeral } from "./lib/hebrew-numerals.ts";
import {
  consolidateAnswerSegments,
  CONSOLIDATED_QA_KINDS,
  type AnswerUnitSegments,
} from "./lib/qa-consolidation.ts";
import { sortTocChapters } from "./lib/toc-builder.ts";
import { writeTocSplitFiles } from "./lib/toc-splits.ts";
import { validateContent } from "./validate-content.ts";

interface PerAnswerChapter {
  tocChapter: TocChapter;
  dir: string;
}

/** `${partId}|${kind}` -> that group's per-answer chapters, ascending by number. */
type AnswerGroups = Map<string, PerAnswerChapter[]>;

const chapterDirFor = (
  contentDir: string,
  partId: string,
  slug: string,
): string => join(contentDir, "parts", partId, "chapters", slug);

const gatherAnswerGroups = (contentDir: string, toc: Toc): AnswerGroups => {
  const groups: AnswerGroups = new Map();

  for (const volume of toc.volumes) {
    for (const part of volume.parts) {
      for (const chapter of part.chapters) {
        if (!CONSOLIDATED_QA_KINDS.includes(chapter.kind)) continue;

        const key = `${part.id}|${chapter.kind}`;
        const slug = chapter.id.split("/")[1] as string;
        const list = groups.get(key) ?? [];
        list.push({
          tocChapter: chapter,
          dir: chapterDirFor(contentDir, part.id, slug),
        });
        groups.set(key, list);
      }
    }
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.tocChapter.number - b.tocChapter.number);
  }

  return groups;
};

/**
 * Strips a per-answer chapter's own trailing ordinal from its title,
 * recovering the shared base title all its siblings carry (and the
 * consolidated chapter's own title) — mirrors `siblingChapterTitle`'s
 * `totalInKind === 1` case in `toc-builder.ts`, just run in reverse since
 * this script has no live Sefaria node to read the base title from.
 * Returns `undefined` if `title` does not carry the expected suffix (title
 * already stripped, or shaped unexpectedly — never guessed).
 */
const stripTitleSuffix = (
  title: Record<string, string>,
  number: number,
): Record<string, string> | undefined => {
  const stripped: Record<string, string> = {};

  for (const [locale, value] of Object.entries(title)) {
    const suffix = locale === "he" ? ` ${hebrewNumeral(number)}` : ` ${number}`;
    if (!value.endsWith(suffix)) return undefined;
    stripped[locale] = value.slice(0, -suffix.length);
  }

  return stripped;
};

/**
 * Strips a per-answer chapter file's own trailing `" <number>[:<item>]"`
 * from its top-level `sefariaRef`, recovering the shared base ref (Sefaria's
 * own ref for the whole node) all its siblings carry. Handles both
 * conventions seen in the committed corpus: the Sefaria importer's own
 * `"... List of Answers on Topics 6"` (no item suffix — chapter-level ref)
 * and the KabbalahMedia importer's `"... List of Answers on Topics 6:1"`
 * (its per-chapter `sefariaRef` names the first item).
 */
const stripSefariaRefSuffix = (
  ref: string | undefined,
  number: number,
): string | undefined => {
  if (!ref) return undefined;
  const match = new RegExp(` ${number}(:\\d+)?$`).exec(ref);
  return match ? ref.slice(0, match.index) : undefined;
};

const needsMigration = (chapters: PerAnswerChapter[]): boolean => {
  if (chapters.length !== 1) return true;
  const only = chapters[0]!.tocChapter;
  return stripTitleSuffix(only.title, only.number) !== undefined;
};

export interface ChapterMerge {
  partId: string;
  kind: ChapterKind;
  fromChapterIds: string[];
  toChapterId: string;
  title: Record<string, string>;
  /** versionId -> the consolidated file's own sefariaRef + merged items. */
  perVersion: Map<string, { sefariaRef: string; items: SourceSegment[] }>;
}

const planGroupMerge = (
  partId: string,
  kind: ChapterKind,
  chapters: PerAnswerChapter[],
): ChapterMerge => {
  const toChapterId = `${partId}/${chapterSlug(kind, 1)}`;

  const baseTitles = chapters.map(({ tocChapter }) => {
    const stripped = stripTitleSuffix(tocChapter.title, tocChapter.number);
    if (!stripped) {
      throw new Error(
        `${tocChapter.id}: title ${JSON.stringify(tocChapter.title)} does not carry the expected "<base> ${tocChapter.number}" suffix — cannot derive the consolidated title`,
      );
    }
    return stripped;
  });
  const title = baseTitles[0]!;
  for (const candidate of baseTitles) {
    for (const [locale, value] of Object.entries(candidate)) {
      if (value !== title[locale]) {
        throw new Error(
          `${partId}/${kind}: per-answer chapter titles disagree on their base title once the numeral suffix is stripped (${JSON.stringify(candidate)} vs ${JSON.stringify(title)})`,
        );
      }
    }
  }

  const versionIds = new Set<string>();
  for (const { tocChapter } of chapters) {
    for (const versionId of tocChapter.availableVersions.source) {
      versionIds.add(versionId);
    }
  }

  const perVersion: ChapterMerge["perVersion"] = new Map();

  for (const versionId of versionIds) {
    const units: AnswerUnitSegments[] = [];
    const baseRefs: string[] = [];

    for (const { tocChapter, dir } of chapters) {
      const filePath = join(dir, `source.${versionId}.json`);
      if (!existsSync(filePath)) continue; // subset version: this answer has none

      const parsed = chapterLayerFileSchema.parse(
        JSON.parse(readFileSync(filePath, "utf-8")),
      );
      if (parsed.layer !== "source") {
        throw new Error(
          `${filePath}: expected layer "source", got "${parsed.layer}"`,
        );
      }

      units.push({ number: tocChapter.number, segments: parsed.items });

      const baseRef = stripSefariaRefSuffix(
        parsed.sefariaRef,
        tocChapter.number,
      );
      if (!baseRef) {
        throw new Error(
          `${filePath}: sefariaRef ${JSON.stringify(parsed.sefariaRef)} does not carry the expected "... ${tocChapter.number}[:N]" suffix`,
        );
      }
      baseRefs.push(baseRef);
    }

    if (units.length === 0) continue;

    const sefariaRef = baseRefs[0]!;
    for (const candidate of baseRefs) {
      if (candidate !== sefariaRef) {
        throw new Error(
          `${partId}/${kind}/${versionId}: per-answer chapter files disagree on their base sefariaRef once the trailing answer number is stripped ("${candidate}" vs "${sefariaRef}")`,
        );
      }
    }

    perVersion.set(versionId, {
      sefariaRef,
      items: consolidateAnswerSegments(units),
    });
  }

  return {
    partId,
    kind,
    fromChapterIds: chapters.map((c) => c.tocChapter.id),
    toChapterId,
    title,
    perVersion,
  };
};

const applyGroupMerge = (contentDir: string, merge: ChapterMerge): void => {
  const toSlug = merge.toChapterId.split("/")[1] as string;
  const toDir = chapterDirFor(contentDir, merge.partId, toSlug);

  for (const fromId of merge.fromChapterIds) {
    if (fromId === merge.toChapterId) continue;
    const fromSlug = fromId.split("/")[1] as string;
    rmSync(chapterDirFor(contentDir, merge.partId, fromSlug), {
      recursive: true,
      force: true,
    });
  }

  if (existsSync(toDir)) {
    for (const name of readdirSync(toDir)) {
      const match = name.match(/^source\.(.+)\.json$/);
      if (match && !merge.perVersion.has(match[1] as string)) {
        rmSync(join(toDir, name));
      }
    }
  } else {
    mkdirSync(toDir, { recursive: true });
  }

  for (const [versionId, { sefariaRef, items }] of merge.perVersion) {
    const file: ChapterLayerFile = {
      chapterId: merge.toChapterId,
      layer: "source",
      versionId,
      sefariaRef,
      items,
    };
    writeFileSync(
      join(toDir, `source.${versionId}.json`),
      `${JSON.stringify(file, null, 2)}\n`,
      "utf-8",
    );
  }
};

const rebuildTocChapter = (merge: ChapterMerge): TocChapter => {
  const versionIds = [...merge.perVersion.keys()].sort();
  return {
    id: merge.toChapterId,
    kind: merge.kind,
    number: 1,
    title: merge.title,
    availableLayers: versionIds.length > 0 ? ["source"] : [],
    availableVersions: { summary: [], source: versionIds, commentary: [] },
  };
};

export interface MigrationPlan {
  merges: ChapterMerge[];
  alreadyConsolidated: string[];
}

export const planMigration = (contentDir: string, toc: Toc): MigrationPlan => {
  const groups = gatherAnswerGroups(contentDir, toc);
  const merges: ChapterMerge[] = [];
  const alreadyConsolidated: string[] = [];

  for (const [key, chapters] of groups) {
    if (!needsMigration(chapters)) {
      alreadyConsolidated.push(key);
      continue;
    }
    const [partId, kind] = key.split("|") as [string, ChapterKind];
    merges.push(planGroupMerge(partId, kind, chapters));
  }

  merges.sort(
    (a, b) => a.partId.localeCompare(b.partId) || a.kind.localeCompare(b.kind),
  );

  return { merges, alreadyConsolidated: alreadyConsolidated.sort() };
};

const printPlan = (plan: MigrationPlan): void => {
  for (const merge of plan.merges) {
    const perVersionSummary = [...merge.perVersion.entries()]
      .map(([versionId, { items }]) => `${versionId}: ${items.length} item(s)`)
      .join(", ");
    console.log(
      `${merge.partId}/${merge.kind}: merge ${merge.fromChapterIds.length} chapter(s) -> ${merge.toChapterId} (${perVersionSummary})`,
    );
  }
  for (const key of plan.alreadyConsolidated) {
    console.log(`${key.replace("|", "/")}: already consolidated, skipping`);
  }
  console.log(
    `\n${plan.merges.length} group(s) to merge, ${plan.alreadyConsolidated.length} already consolidated.`,
  );
};

export const applyMigration = (
  contentDir: string,
  toc: Toc,
  versions: Parameters<typeof writeTocSplitFiles>[2],
  plan: MigrationPlan,
): void => {
  if (plan.merges.length === 0) return; // true no-op: touch nothing on disk

  for (const merge of plan.merges) applyGroupMerge(contentDir, merge);

  const rebuiltByKey = new Map(
    plan.merges.map((merge) => [`${merge.partId}|${merge.kind}`, merge]),
  );

  const updatedToc: Toc = {
    volumes: toc.volumes.map((volume) => ({
      ...volume,
      parts: volume.parts.map((part) => {
        const otherChapters = part.chapters.filter(
          (c) => !CONSOLIDATED_QA_KINDS.includes(c.kind),
        );

        const qaKindsPresent = new Set(
          part.chapters
            .filter((c) => CONSOLIDATED_QA_KINDS.includes(c.kind))
            .map((c) => c.kind),
        );

        const qaChapters: TocChapter[] = [];
        for (const kind of qaKindsPresent) {
          const merge = rebuiltByKey.get(`${part.id}|${kind}`);
          if (merge) {
            qaChapters.push(rebuildTocChapter(merge));
          } else {
            const existing = part.chapters.find((c) => c.kind === kind);
            if (existing) qaChapters.push(existing);
          }
        }

        return {
          ...part,
          chapters: sortTocChapters([...otherChapters, ...qaChapters]),
        };
      }),
    })),
  };

  writeFileSync(
    join(contentDir, "toc.json"),
    `${JSON.stringify(updatedToc, null, 2)}\n`,
    "utf-8",
  );
  writeTocSplitFiles(contentDir, updatedToc, versions);
};

export const migrateConsolidateQa = (
  contentDir: string,
  { dryRun }: { dryRun: boolean },
): MigrationPlan => {
  const toc = tocSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf-8")),
  );
  const versions = versionsFileSchema.parse(
    JSON.parse(readFileSync(join(contentDir, "versions.json"), "utf-8")),
  );

  const plan = planMigration(contentDir, toc);
  printPlan(plan);

  if (dryRun) {
    console.log("\n[dry-run] no files written.");
    return plan;
  }

  applyMigration(contentDir, toc, versions, plan);

  if (plan.merges.length > 0) {
    const { errors } = validateContent(contentDir);
    if (errors.length > 0) {
      for (const error of errors) console.error(`✖ ${error}`);
      throw new Error(
        `${errors.length} content validation error(s) after migration`,
      );
    }
    console.log("\n✓ Content validation passed.");
  }

  return plan;
};

const isRunAsScript = (): boolean => {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === `file://${entry}`;
};

if (isRunAsScript()) {
  const dryRun = process.argv.includes("--dry-run");
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const contentDir = join(repoRoot, "content");

  try {
    migrateConsolidateQa(contentDir, { dryRun });
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}
