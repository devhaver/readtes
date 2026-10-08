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
 * Part names in the reader's other languages. Russian follows Bnei Baruch's
 * own Russian documents where they print one (parts 1, 3, 4); everything
 * else renders the Hebrew names in each language's register, keeping the
 * Hebrew terms Bnei Baruch keeps (Akudim, Nekudim, Atzilut, Zeir Anpin…).
 */
export const PART_NAMES: Record<string, Record<number, string>> = {
  ru: {
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
  },
  uk: {
    1: "Скорочення і лінія",
    2: "Кола і пряма",
    3: "Пряме світло і відбите світло",
    4: "Десять сфірот Акудім",
    5: "Акудім у другому поширенні: «Маті і ло маті»",
    6: "Світ Некудім",
    7: "Сім померлих царів",
    8: "Десять сфірот світу Ацилут",
    9: "Зівуги сфірот",
    10: "Перший ібур Зеір Анпіна",
    11: "Виправлення світел, іскор і келім у зародку та другий ібур",
    12: "Народження і єніка Зеір Анпіна",
    13: "Виправлення голови і бороди Аріх Анпіна",
    14: "Мохін ґадлуту Зеір Анпіна",
    15: "Побудова Нукви Зеір Анпіна",
    16: "Три світи: Брія, Єцира і Асія",
  },
  es: {
    1: "Restricción y línea",
    2: "Círculos y rectitud",
    3: "Luz directa y luz reflejada",
    4: "Las diez Sefirot de Akudim",
    5: "Akudim en la segunda expansión: Matei ve Lo Matei",
    6: "El mundo de Nekudim",
    7: "Los siete reyes que murieron",
    8: "Las diez Sefirot del mundo de Atzilut",
    9: "Los acoplamientos de las Sefirot",
    10: "El primer Ibur de Zeir Anpin",
    11: "Corrección de luces, chispas y vasijas en el embrión, y el segundo Ibur",
    12: "Nacimiento y Yeniká de Zeir Anpin",
    13: "Las correcciones de la cabeza y la barba de Arij Anpin",
    14: "Los Mojin de Gadlut de Zeir Anpin",
    15: "La construcción de la Nukva de Zeir Anpin",
    16: "Los tres mundos: Beriá, Yetzirá y Asiyá",
  },
  pt: {
    1: "Restrição e linha",
    2: "Círculos e retidão",
    3: "Luz direta e luz refletida",
    4: "As dez Sefirot de Akudim",
    5: "Akudim na segunda expansão: Matei ve Lo Matei",
    6: "O mundo de Nekudim",
    7: "Os sete reis que morreram",
    8: "As dez Sefirot do mundo de Atzilut",
    9: "Os acoplamentos das Sefirot",
    10: "O primeiro Ibur de Zeir Anpin",
    11: "Correção das luzes, centelhas e vasos no embrião, e o segundo Ibur",
    12: "Nascimento e Yeniká de Zeir Anpin",
    13: "As correções da cabeça e da barba de Arich Anpin",
    14: "Os Mochin de Gadlut de Zeir Anpin",
    15: "A construção da Nukva de Zeir Anpin",
    16: "Os três mundos: Beriá, Yetzirá e Assiyá",
  },
  fr: {
    1: "Restriction et ligne",
    2: "Cercles et droiture",
    3: "Lumière directe et lumière réfléchie",
    4: "Les dix Sefirot d'Akoudim",
    5: "Akoudim dans la seconde expansion : Matei ve Lo Matei",
    6: "Le monde de Nekoudim",
    7: "Les sept rois morts",
    8: "Les dix Sefirot du monde d'Atsilout",
    9: "Les accouplements des Sefirot",
    10: "Le premier Ibour de Zeir Anpin",
    11: "Correction des lumières, étincelles et récipients dans l'embryon, et le second Ibour",
    12: "Naissance et allaitement de Zeir Anpin",
    13: "Les corrections de la tête et de la barbe d'Arikh Anpin",
    14: "Les Mokhin de Gadlout de Zeir Anpin",
    15: "La construction de la Noukva de Zeir Anpin",
    16: "Les trois mondes : Bria, Yetsira et Assiya",
  },
  de: {
    1: "Einschränkung und Linie",
    2: "Kreise und Geradheit",
    3: "Direktes Licht und reflektiertes Licht",
    4: "Die zehn Sefirot von Akudim",
    5: "Akudim in der zweiten Ausbreitung: Matei ve Lo Matei",
    6: "Die Welt Nekudim",
    7: "Die sieben Könige, die starben",
    8: "Die zehn Sefirot der Welt Azilut",
    9: "Die Vereinigungen der Sefirot",
    10: "Der erste Ibur von Seir Anpin",
    11: "Korrektur der Lichter, Funken und Gefäße im Embryo und der zweite Ibur",
    12: "Geburt und Jenika von Seir Anpin",
    13: "Die Korrekturen von Kopf und Bart von Arich Anpin",
    14: "Die Mochin de Gadlut von Seir Anpin",
    15: "Der Aufbau der Nukwa von Seir Anpin",
    16: "Die drei Welten: Beria, Jezira und Assija",
  },
  tr: {
    1: "Kısıtlama ve çizgi",
    2: "Daireler ve doğruluk",
    3: "Doğrudan Işık ve Yansıyan Işık",
    4: "Akudim'in on Sefirot'u",
    5: "İkinci yayılımda Akudim: Matei ve Lo Matei",
    6: "Nekudim dünyası",
    7: "Ölen yedi kral",
    8: "Atzilut dünyasının on Sefirot'u",
    9: "Sefirot'un çiftleşmeleri",
    10: "Zeir Anpin'in ilk İbur'u",
    11: "Embriyoda ışıkların, kıvılcımların ve kapların ıslahı ve ikinci İbur",
    12: "Zeir Anpin'in doğumu ve Yenika'sı",
    13: "Arih Anpin'in başının ve sakalının ıslahları",
    14: "Zeir Anpin'in Gadlut Mohin'i",
    15: "Zeir Anpin'in Nukva'sının inşası",
    16: "Üç dünya: Beria, Yetzira ve Assiya",
  },
};

/** A part's display title: its name, without the "Part N" every surface already prints. */
export const partDisplayTitle = (
  number: number,
  sefariaHeTitle: string,
  sefariaEnTitle: string,
): LocalizedTitle => ({
  en: PART_NAMES_EN[number] ?? sefariaEnTitle,
  he: sefariaHeTitle.replace(/^חלק\s+[^:]+:\s*/, ""),
  ...Object.fromEntries(
    Object.entries(PART_NAMES).flatMap(([language, names]) =>
      names[number] ? [[language, names[number]]] : [],
    ),
  ),
});

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

interface ChapterTitleForms {
  chapter: (n: number) => string;
  volume: (n: number) => string;
  kinds: Partial<Record<ChapterKind, string>>;
}

/**
 * Chapter and volume titles in the reader's other languages, derived from
 * kind and number exactly as the English ones are (`Chapter N`, a numbered
 * node title). Sefaria has no titles in these languages to take one from.
 */
export const CHAPTER_TITLE_FORMS: Record<string, ChapterTitleForms> = {
  ru: {
    chapter: (n) => `Глава ${n}`,
    volume: (n) => `Том ${n}`,
    kinds: {
      introduction: "Предисловие",
      "inner-observation": "Внутреннее созерцание",
      "questions-terminology": "Вопросы о значении слов",
      "questions-topics": "Вопросы по темам",
      "questions-cause-effect": "Вопросы о причине и следствии",
      "answers-terminology": "Ответы о значении слов",
      "answers-topics": "Ответы по темам",
      "answers-cause-effect": "Ответы о причине и следствии",
    },
  },
  uk: {
    chapter: (n) => `Глава ${n}`,
    volume: (n) => `Том ${n}`,
    kinds: {
      introduction: "Передмова",
      "inner-observation": "Внутрішнє споглядання",
      "questions-terminology": "Питання про значення слів",
      "questions-topics": "Питання за темами",
      "questions-cause-effect": "Питання про причину і наслідок",
      "answers-terminology": "Відповіді про значення слів",
      "answers-topics": "Відповіді за темами",
      "answers-cause-effect": "Відповіді про причину і наслідок",
    },
  },
  es: {
    chapter: (n) => `Capítulo ${n}`,
    volume: (n) => `Volumen ${n}`,
    kinds: {
      introduction: "Introducción",
      "inner-observation": "Observación Interior",
      "questions-terminology": "Preguntas sobre el significado de las palabras",
      "questions-topics": "Preguntas sobre los temas",
      "questions-cause-effect": "Preguntas sobre causa y efecto",
      "answers-terminology": "Respuestas sobre el significado de las palabras",
      "answers-topics": "Respuestas sobre los temas",
      "answers-cause-effect": "Respuestas sobre causa y efecto",
    },
  },
  pt: {
    chapter: (n) => `Capítulo ${n}`,
    volume: (n) => `Volume ${n}`,
    kinds: {
      introduction: "Introdução",
      "inner-observation": "Observação Interior",
      "questions-terminology": "Perguntas sobre o significado das palavras",
      "questions-topics": "Perguntas sobre os temas",
      "questions-cause-effect": "Perguntas sobre causa e efeito",
      "answers-terminology": "Respostas sobre o significado das palavras",
      "answers-topics": "Respostas sobre os temas",
      "answers-cause-effect": "Respostas sobre causa e efeito",
    },
  },
  fr: {
    chapter: (n) => `Chapitre ${n}`,
    volume: (n) => `Volume ${n}`,
    kinds: {
      introduction: "Introduction",
      "inner-observation": "Observation intérieure",
      "questions-terminology": "Questions sur le sens des mots",
      "questions-topics": "Questions sur les thèmes",
      "questions-cause-effect": "Questions sur la cause et l'effet",
      "answers-terminology": "Réponses sur le sens des mots",
      "answers-topics": "Réponses sur les thèmes",
      "answers-cause-effect": "Réponses sur la cause et l'effet",
    },
  },
  de: {
    chapter: (n) => `Kapitel ${n}`,
    volume: (n) => `Band ${n}`,
    kinds: {
      introduction: "Einleitung",
      "inner-observation": "Innere Betrachtung",
      "questions-terminology": "Fragen zur Bedeutung der Wörter",
      "questions-topics": "Fragen zu den Themen",
      "questions-cause-effect": "Fragen zu Ursache und Wirkung",
      "answers-terminology": "Antworten zur Bedeutung der Wörter",
      "answers-topics": "Antworten zu den Themen",
      "answers-cause-effect": "Antworten zu Ursache und Wirkung",
    },
  },
  tr: {
    chapter: (n) => `Bölüm ${n}`,
    volume: (n) => `Cilt ${n}`,
    kinds: {
      introduction: "Giriş",
      "inner-observation": "İç Gözlem",
      "questions-terminology": "Kelimelerin anlamı üzerine sorular",
      "questions-topics": "Konular üzerine sorular",
      "questions-cause-effect": "Sebep ve sonuç üzerine sorular",
      "answers-terminology": "Kelimelerin anlamı üzerine cevaplar",
      "answers-topics": "Konular üzerine cevaplar",
      "answers-cause-effect": "Sebep ve sonuç üzerine cevaplar",
    },
  },
};

/** A chapter's title in `language`, from its kind and number. */
export const localizedChapterTitle = (
  language: string,
  kind: ChapterKind,
  number: number,
  totalInKind: number,
): string | undefined => {
  const forms = CHAPTER_TITLE_FORMS[language];
  if (!forms) return undefined;
  if (kind === "chapter") return forms.chapter(number);
  const base = forms.kinds[kind];
  if (base === undefined) return undefined;
  return totalInKind > 1 ? `${base} ${number}` : base;
};

/**
 * Fills in each chapter's title in every language of
 * `CHAPTER_TITLE_FORMS`, from its kind and number (and the part's count of
 * that kind, which decides whether a lone node is numbered). A title that
 * already has an entry for a language is left alone.
 */
export const addLocalizedChapterTitles = (chapters: TocChapter[]): number => {
  const totals = new Map<ChapterKind, number>();
  for (const chapter of chapters) {
    totals.set(chapter.kind, (totals.get(chapter.kind) ?? 0) + 1);
  }
  let added = 0;
  for (const chapter of chapters) {
    for (const language of Object.keys(CHAPTER_TITLE_FORMS)) {
      if (chapter.title[language] !== undefined) continue;
      const title = localizedChapterTitle(
        language,
        chapter.kind,
        chapter.number,
        totals.get(chapter.kind) ?? 1,
      );
      if (title !== undefined) {
        chapter.title[language] = title;
        added += 1;
      }
    }
  }
  return added;
};
