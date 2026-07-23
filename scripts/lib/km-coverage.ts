/**
 * Coverage reporting for the KabbalahMedia importer, and the pure markdown
 * merge that lets it append/replace its own section of `content/COVERAGE.md`
 * without touching whatever `pnpm import:sefaria` last wrote there.
 */

export type KmChapterStatus =
  "imported" | "structure-unsupported" | "no-file-for-language" | "unmatched";

export interface KmChapterOutcome {
  chapterId: string;
  status: KmChapterStatus;
  sourceSegments: number;
  commentaryItems: number;
  sourceItemsSkipped: number;
  commentaryParagraphsSkipped: number;
  unmatchedNumerals: number;
}

export interface KmLanguageOutcome {
  versionId: string;
  kmLanguage: string;
  title: string;
  chapters: KmChapterOutcome[];
  warnings: string[];
}

export const KM_COVERAGE_HEADING = "## KabbalahMedia import (`kabbalahmedia`)";

/** `"part-05/chapter-12"` -> `"part-05"`. */
const partIdOf = (chapterId: string): string =>
  chapterId.split("/")[0] as string;

const sortedLanguages = (languages: KmLanguageOutcome[]): KmLanguageOutcome[] =>
  [...languages].sort((a, b) => a.versionId.localeCompare(b.versionId));

const languageTable = (languages: KmLanguageOutcome[]): string => {
  const header =
    "| Version | Language (KM code) | Chapters imported | Source segments | Commentary items |";
  const divider = "| --- | --- | --- | --- | --- |";
  const rows = sortedLanguages(languages).map((lang) => {
    const imported = lang.chapters.filter((c) => c.status === "imported");
    const segments = imported.reduce((sum, c) => sum + c.sourceSegments, 0);
    const commentary = imported.reduce((sum, c) => sum + c.commentaryItems, 0);
    return `| ${lang.versionId} | ${lang.title} (\`${lang.kmLanguage}\`) | ${imported.length}/${lang.chapters.length} | ${segments} | ${commentary} |`;
  });
  return [header, divider, ...rows].join("\n");
};

/**
 * Per-part x per-language matrix: how many of that part's *checked* chapters
 * (across every kind/dialect this run touched) came back imported, for each
 * language version. A part with a cell of `0/0` for every language was never
 * checked at all this run (e.g. `--part` scoped to other parts); a part with
 * `0/N` (N>0) for every language was checked and genuinely has no official
 * translation on KabbalahMedia (Parts 9-15, per the brief) — both are
 * printed explicitly rather than omitted, so a gap always reads as *known*,
 * never *forgotten*.
 */
export const buildKmPartLanguageMatrix = (
  languages: KmLanguageOutcome[],
): string => {
  const orderedLanguages = sortedLanguages(languages);
  const partIds = [
    ...new Set(
      orderedLanguages.flatMap((lang) =>
        lang.chapters.map((c) => partIdOf(c.chapterId)),
      ),
    ),
  ].sort();
  if (partIds.length === 0) return "_No parts were checked this run._";

  const header = [
    "| Part |",
    ...orderedLanguages.map((l) => ` ${l.versionId} |`),
  ].join("");
  const divider = ["| --- |", ...orderedLanguages.map(() => " --- |")].join("");

  const rows = partIds.map((partId) => {
    const cells = orderedLanguages.map((lang) => {
      const partChapters = lang.chapters.filter(
        (c) => partIdOf(c.chapterId) === partId,
      );
      if (partChapters.length === 0) return " — |";
      const imported = partChapters.filter((c) => c.status === "imported");
      return ` ${imported.length}/${partChapters.length} |`;
    });
    return [`| ${partId} |`, ...cells].join("");
  });

  return [header, divider, ...rows].join("\n");
};

const SKIP_REASON_BY_STATUS: Record<
  Exclude<KmChapterStatus, "imported">,
  string
> = {
  "structure-unsupported":
    "document structure not yet supported by this importer",
  "no-file-for-language": "no docx file for this language",
  unmatched:
    "document parsed, but no item at this chapter's position — count mismatch against the Hebrew ground truth",
};

interface KmSkippedChapterGroup {
  versionId: string;
  partId: string;
  status: Exclude<KmChapterStatus, "imported">;
  count: number;
}

/**
 * Groups skipped outcomes before rendering coverage. A full-corpus run has
 * thousands of known absences, so listing every chapter would make the report
 * too large to review or commit. The grouping is deliberately only by the
 * stable coverage dimensions: language version, part, and skip status.
 */
const groupSkippedChapters = (
  languages: KmLanguageOutcome[],
): KmSkippedChapterGroup[] => {
  const groups = new Map<string, KmSkippedChapterGroup>();

  for (const language of languages) {
    for (const chapter of language.chapters) {
      if (chapter.status === "imported") continue;

      const partId = partIdOf(chapter.chapterId);
      const key = `${language.versionId}\u0000${partId}\u0000${chapter.status}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, {
          versionId: language.versionId,
          partId,
          status: chapter.status,
          count: 1,
        });
      }
    }
  }

  return [...groups.values()].sort(
    (a, b) =>
      a.versionId.localeCompare(b.versionId) ||
      a.partId.localeCompare(b.partId) ||
      a.status.localeCompare(b.status),
  );
};

const skippedChapterTable = (languages: KmLanguageOutcome[]): string[] => {
  const groups = groupSkippedChapters(languages);
  if (groups.length === 0) return [];

  return [
    "| Version | Part | Status | Chapters skipped | Reason |",
    "| --- | --- | --- | --- | --- |",
    ...groups.map(
      (group) =>
        `| ${group.versionId} | ${group.partId} | ${group.status} | ${group.count} | ${SKIP_REASON_BY_STATUS[group.status]} |`,
    ),
  ];
};

const warningNotes = (languages: KmLanguageOutcome[]): string[] =>
  languages.flatMap((lang) =>
    lang.warnings.map((w) => `- **${lang.versionId}**: ${w}`),
  );

/** Builds this run's KabbalahMedia section body (everything after the `## ` heading line). */
export const buildKmCoverageSection = (
  languages: KmLanguageOutcome[],
): string => {
  const lines = [
    "Generated by `pnpm import:kabbalahmedia`. Per language version: how many",
    "of the checked chapters were imported, and how many total segments/",
    "commentary items were written. A language whose KabbalahMedia document",
    "doesn't (yet) match a structure this importer parses is listed as",
    "skipped, not force-imported.",
    "",
    languageTable(languages),
    "",
    "### Per part x language",
    "",
    "`imported/checked` chapters. `—` means this part wasn't checked this run",
    "(scoped `--part`); `0/N` means it was checked and KabbalahMedia has no",
    "usable translation for it in that language (expected for Parts 9-15,",
    "which have no official non-Hebrew translation on KabbalahMedia at all).",
    "",
    buildKmPartLanguageMatrix(languages),
  ];

  const skipped = skippedChapterTable(languages);
  if (skipped.length > 0) {
    lines.push("", "### Skipped chapters", "", ...skipped);
  }

  const warnings = warningNotes(languages);
  if (warnings.length > 0) {
    lines.push("", "**Warnings:**", ...warnings);
  }

  return lines.join("\n");
};

/**
 * Replaces the section starting at `heading` (up to the next top-level `## `
 * heading, or end of file) in `existing` with `heading` + `sectionBody`, or
 * appends it if `heading` isn't present yet. Pure string surgery — lets two
 * independent importers (Sefaria, KabbalahMedia) each own their own section
 * of the same `content/COVERAGE.md` without clobbering the other's.
 */
export const mergeMarkdownSection = (
  existing: string,
  heading: string,
  sectionBody: string,
): string => {
  const newSection = `${heading}\n\n${sectionBody}`.trimEnd();
  const headingIndex = existing.indexOf(`${heading}\n`);

  if (headingIndex === -1) {
    const before = existing.trimEnd();
    return before.length > 0
      ? `${before}\n\n${newSection}\n`
      : `${newSection}\n`;
  }

  const afterHeadingStart = headingIndex + heading.length;
  const rest = existing.slice(afterHeadingStart);
  const nextHeadingMatch = rest.match(/\n(?=## )/);
  const sectionEnd = nextHeadingMatch
    ? afterHeadingStart + (nextHeadingMatch.index as number) + 1
    : existing.length;

  const before = existing.slice(0, headingIndex).trimEnd();
  const after = existing.slice(sectionEnd).trimEnd();

  const parts = [before, newSection, after].filter((part) => part.length > 0);
  return `${parts.join("\n\n")}\n`;
};
