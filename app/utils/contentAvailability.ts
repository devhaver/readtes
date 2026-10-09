/**
 * Language/translation availability derived from `TocChapter.availableVersions`
 * (cross-referenced against the `content/versions.json` registry) — powers
 * the per-chapter/version badges on a volume's contents page
 * (`chapterLanguages`). The volumes index no longer calls
 * `partLanguageAvailability` itself: that computation is precomputed at
 * emit time into `toc.volumes.json`'s `availableSummary` (a separate,
 * intentionally-duplicated copy in `scripts/lib/toc-splits.ts` — see
 * AGENTS.md "Content model") so the index page never needs a part's full
 * `TocChapter[]` just to render its language chips. `partLanguageAvailability`
 * is kept here, correct and tested, as the reference algorithm that copy
 * mirrors.
 */
import type {
  ContentVersion,
  TocChapter,
  TocPart,
} from "~~/shared/types/content";
import { buildVersionsById, resolveVersionForLanguage } from "./readerVersions";

/** Per-language coverage across a group of chapters (a whole part, on the index page). */
export type LanguageAvailability = "none" | "partial" | "full";

export interface ChapterLanguages {
  he: boolean;
  en: boolean;
  /**
   * True when the text the reader shows for the chapter's `source` layer in
   * this UI locale is an AI translation (`source: "ai"` in the registry) —
   * i.e. the locale's default language resolves to an AI edition and no
   * human edition outranks it. A Hebrew locale reads the original, and a
   * chapter that also has Bnei Baruch's English is read in that, so
   * neither is badged.
   */
  aiTranslated: boolean;
}

const collectVersionIds = (chapter: TocChapter): string[] => [
  ...chapter.availableVersions.summary,
  ...chapter.availableVersions.source,
  ...chapter.availableVersions.commentary,
];

/** Which languages a single chapter has any layer available in. */
export const chapterLanguages = (
  chapter: TocChapter,
  versions: ContentVersion[],
  locale = "en",
): ChapterLanguages => {
  const versionById = buildVersionsById(versions);
  let he = false;
  let en = false;

  for (const versionId of collectVersionIds(chapter)) {
    const language = versionById.get(versionId)?.language;
    if (language === "he") he = true;
    if (language === "en") en = true;
  }

  const shownLanguage = resolveDefaultLanguage(
    chapter.availableVersions.source,
    locale,
    versionById,
  );
  const shownVersionId = shownLanguage
    ? resolveVersionForLanguage(
        chapter.availableVersions.source,
        shownLanguage,
        versionById,
      )
    : null;

  return {
    he,
    en,
    aiTranslated:
      shownVersionId !== null &&
      versionById.get(shownVersionId)?.source === "ai",
  };
};

/**
 * Aggregate per-language coverage across every chapter of a part: `"full"`
 * when every chapter has that language, `"partial"` when some do,
 * `"none"` when the part has no chapters yet (or none in that language).
 */
export const partLanguageAvailability = (
  part: TocPart,
  versions: ContentVersion[],
): { he: LanguageAvailability; en: LanguageAvailability } => {
  const total = part.chapters.length;

  if (total === 0) return { he: "none", en: "none" };

  let heCount = 0;
  let enCount = 0;

  for (const chapter of part.chapters) {
    const languages = chapterLanguages(chapter, versions);
    if (languages.he) heCount++;
    if (languages.en) enCount++;
  }

  const stateFor = (count: number): LanguageAvailability =>
    count === 0 ? "none" : count === total ? "full" : "partial";

  return { he: stateFor(heCount), en: stateFor(enCount) };
};
