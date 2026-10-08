/**
 * Pure builders for the `toc.json` part/chapter entries the importer
 * writes. `availableLayers`/`availableVersions` are always derived from
 * what is *actually on disk* after writing (a directory listing, not an
 * in-memory "what did we just write" list) — that automatically preserves
 * untouched layers the importer never writes, like curated summaries.
 */
import type {
  ChapterKind,
  TocChapter,
  TocPart,
} from "../../shared/types/content.ts";
import { CHAPTER_KIND_ORDER } from "../../shared/utils/chapterKinds.ts";
import { hebrewNumeral } from "./hebrew-numerals.ts";
import type { SefariaIndexNode } from "./sefaria-api-types.ts";

type LocalizedTitle = Record<string, string>;

/**
 * Sefaria's own index titles spell the inner-observation layer "Histaklut
 * Penimit"; this site's transliteration is "Pnimit" (matching the
 * `histaklut-pnimit` section id everywhere else). Normalize display
 * titles on write so re-imports can never drift the corpus back to the
 * Sefaria spelling — refs and provenance keep Sefaria's original strings.
 */
/**
 * Sefaria's English node titles, made readable: its transliteration is
 * normalized, and the Inner Observation essays are called that in English —
 * the reader labels the layer "Inner Observation" everywhere, and a contents
 * list of "Histaklut Pnimit 1…10" under that heading read as a different
 * thing.
 */
export const normalizeEnTitle = (title: string): string =>
  title
    .replace(/Penimit/g, "Pnimit")
    .replace(/^Histaklut Pnimit\b/, "Inner Observation");

/**
 * Each part's name. Sefaria titles the parts "Section I…XVI" in English
 * and "חלק א׳: צמצום וקו" in Hebrew, so the English carried no name at all
 * and every surface that already says "Part 1" (breadcrumb, volume page)
 * repeated the number in Hebrew. Names follow Bnei Baruch's English
 * titles where they publish one (parts 1, 2, 4-8, 16); the rest render the
 * Hebrew in the same register.
 */
export const PART_NAMES_EN: Record<number, string> = {
  1: "Restriction and Line",
  2: "Circles and Straightness",
  3: "Direct Light and Reflected Light",
  4: "The Ten Sefirot of Akudim",
  5: "Akudim in the Second Expansion: Matei ve Lo Matei",
  6: "The World of Nekudim",
  7: "The Seven Kings That Died",
  8: "The Ten Sefirot of the World of Atzilut",
  9: "The Couplings of the Sefirot",
  10: "The First Ibur of Zeir Anpin",
  11: "Correcting Lights, Sparks and Vessels in the Ubar, and the Second Ibur",
  12: "The Birth and Yenika of Zeir Anpin",
  13: "The Corrections of the Head and Beard of Arich Anpin",
  14: "The Mochin of Gadlut of Zeir Anpin",
  15: "Building the Nukva of Zeir Anpin",
  16: "The Three Worlds: Beria, Yetzira and Assiya",
};

/**
 * The same names in Russian: Bnei Baruch's own where their Russian
 * documents print one (parts 1, 3, 4), the rest in the same register.
 */
export const PART_NAMES_RU: Record<number, string> = {
  1: "Сокращение и линия",
  2: "Круги и прямая",
  3: "Прямой свет и отраженный свет",
  4: "Десять сфирот Акудим",
  5: "Акудим во втором распространении: «Мати и ло мати»",
  6: "Мир Некудим",
  7: "Семь умерших царей",
  8: "Десять сфирот мира Ацилут",
  9: "Зивуги сфирот",
  10: "Первый ибур Зеир Анпина",
  11: "Исправление светов, искр и келим в зародыше и второй ибур",
  12: "Рождение и еника Зеир Анпина",
  13: "Исправления головы и бороды Арих Анпина",
  14: "Мохин гадлута Зеир Анпина",
  15: "Построение Нуквы Зеир Анпина",
  16: "Три мира: Брия, Ецира и Асия",
};

/** A part's display title: its name, without the "Part N" every surface already prints. */
export const partDisplayTitle = (
  number: number,
  sefariaHeTitle: string,
  sefariaEnTitle: string,
): LocalizedTitle => ({
  en: PART_NAMES_EN[number] ?? sefariaEnTitle,
  he: sefariaHeTitle.replace(/^חלק\s+[^:]+:\s*/, ""),
  ...(PART_NAMES_RU[number] ? { ru: PART_NAMES_RU[number] } : {}),
});

const RUSSIAN_KIND_TITLES: Partial<Record<ChapterKind, string>> = {
  introduction: "Предисловие",
  "inner-observation": "Внутреннее созерцание",
  "questions-terminology": "Вопросы о значении слов",
  "questions-topics": "Вопросы по темам",
  "questions-cause-effect": "Вопросы о причине и следствии",
  "answers-terminology": "Ответы о значении слов",
  "answers-topics": "Ответы по темам",
  "answers-cause-effect": "Ответы о причине и следствии",
};

/**
 * A chapter's Russian title, derived from its kind and number exactly as
 * the English one is (`Chapter N` / a numbered node title). Sefaria has no
 * Russian titles to take one from.
 */
export const russianChapterTitle = (
  kind: ChapterKind,
  number: number,
  totalInKind: number,
): string => {
  if (kind === "chapter") return `Глава ${number}`;
  const base = RUSSIAN_KIND_TITLES[kind] ?? kind;
  return totalInKind > 1 ? `${base} ${number}` : base;
};

/** A volume's Russian title. */
export const russianVolumeTitle = (number: number): string => `Том ${number}`;

/** Stable display/sort order for chapter kinds within a part — see `~~/shared/utils/chapterKinds`. */
const KIND_ORDER = CHAPTER_KIND_ORDER;

export interface ChapterFilesOnDisk {
  summary: string[];
  source: string[];
  commentary: string[];
}

const LAYER_KEYS = ["summary", "source", "commentary"] as const;

export const buildTocChapter = (
  chapterId: string,
  kind: ChapterKind,
  number: number,
  title: LocalizedTitle,
  filesOnDisk: ChapterFilesOnDisk,
): TocChapter => {
  const availableVersions = {
    summary: [...filesOnDisk.summary].sort(),
    source: [...filesOnDisk.source].sort(),
    commentary: [...filesOnDisk.commentary].sort(),
  };
  const availableLayers = LAYER_KEYS.filter(
    (layer) => availableVersions[layer].length > 0,
  );

  return {
    id: chapterId,
    kind,
    number,
    title,
    availableLayers,
    availableVersions,
  };
};

/** Title for a numbered "chapter"-kind chapter (the main text). */
export const mainChapterTitle = (number: number): LocalizedTitle => ({
  en: `Chapter ${number}`,
  he: `פרק ${hebrewNumeral(number)}`,
});

/**
 * Title for a sibling-node chapter. When a node produces exactly one
 * chapter (e.g. a flat "List of Questions..." node), its own index title
 * is used verbatim; when it produces several (e.g. 10 Histaklut Pnimit
 * chapters), each is numbered off the node's title.
 */
export const siblingChapterTitle = (
  node: Pick<SefariaIndexNode, "title" | "heTitle">,
  number: number,
  totalInKind: number,
): LocalizedTitle =>
  totalInKind === 1
    ? { en: normalizeEnTitle(node.title), he: node.heTitle }
    : {
        en: `${normalizeEnTitle(node.title)} ${number}`,
        he: `${node.heTitle} ${hebrewNumeral(number)}`,
      };

export const sortTocChapters = (chapters: TocChapter[]): TocChapter[] =>
  [...chapters].sort((a, b) => {
    const kindDiff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    return kindDiff !== 0 ? kindDiff : a.number - b.number;
  });

export const buildTocPart = (
  existingPart: TocPart,
  title: LocalizedTitle,
  chapters: TocChapter[],
): TocPart => ({
  ...existingPart,
  title,
  chapters: sortTocChapters(chapters),
});

/**
 * Fills in each chapter's Russian title from its kind and number (and the
 * part's count of that kind, which decides whether a lone node is
 * numbered). Leaves any title that already has a Russian entry alone.
 */
export const addRussianChapterTitles = (chapters: TocChapter[]): void => {
  const totals = new Map<ChapterKind, number>();
  for (const chapter of chapters) {
    totals.set(chapter.kind, (totals.get(chapter.kind) ?? 0) + 1);
  }
  for (const chapter of chapters) {
    if (chapter.title.ru !== undefined) continue;
    chapter.title.ru = russianChapterTitle(
      chapter.kind,
      chapter.number,
      totals.get(chapter.kind) ?? 1,
    );
  }
};
