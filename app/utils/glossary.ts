/**
 * Pure helpers over the app-facing glossary index
 * (`content/glossary/tes-en.index.json` — see AGENTS.md "Content model").
 * No Nuxt/Vue context, so `/glossary`'s search, filtering and citation
 * labelling are all unit-testable on their own
 * (`tests/unit/glossary.spec.ts`).
 *
 * `zod` never enters this file: only the inferred types are imported.
 */
import type {
  ChapterKind,
  GlossaryIndexEntry,
  GlossaryStrategy,
  GlossaryVariant,
} from "~~/shared/types/content";

/**
 * Display order of the four crossing strategies: the two ends of the scale
 * first (the term becomes an English word / the term stays Hebrew), then
 * the hybrid, then the acronyms.
 */
export const GLOSSARY_STRATEGIES: GlossaryStrategy[] = [
  "translate",
  "transliterate",
  "transliterate-with-gloss",
  "acronym",
];

/**
 * Hebrew terminology is written with gershayim/geresh inside acronyms
 * (`ז"א`, `בחי"ד`, `או"ח`), and nobody types those when searching. Strips
 * every quote-shaped mark and collapses whitespace so `זא` finds `ז"א`, and
 * lowercases so the English side is caseless. Applied to both the query and
 * the searched text, so the two are always compared in the same normal form.
 */
export const normalizedGlossaryText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/["'׳״`׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The one string an entry is searched against: its Hebrew, its canonical
 * English, every attested variant, its id (a romanization for most terms)
 * and its note. Built once per entry by `filteredGlossaryEntries` rather
 * than per keystroke.
 */
const searchableText = (entry: GlossaryIndexEntry): string =>
  normalizedGlossaryText(
    [
      entry.he,
      entry.canonicalEn,
      entry.id.replace(/-/g, " "),
      entry.note ?? "",
      ...(entry.variants ?? []).map((variant) => variant.en),
    ].join(" "),
  );

export interface GlossaryFilter {
  /** Raw, un-normalized user input. Empty means "no text filter". */
  query: string;
  /** `null` means "every strategy". */
  strategy: GlossaryStrategy | null;
}

/**
 * Filters entries by strategy and free text, preserving the file's own
 * order — which is thematic (light → vessels → screen → worlds → Sefirot →
 * Partzufim → acronyms), not alphabetical, and is itself information.
 */
export const filteredGlossaryEntries = (
  entries: GlossaryIndexEntry[],
  filter: GlossaryFilter,
): GlossaryIndexEntry[] => {
  const query = normalizedGlossaryText(filter.query);

  return entries.filter((entry) => {
    if (filter.strategy !== null && entry.strategy !== filter.strategy) {
      return false;
    }
    return query === "" || searchableText(entry).includes(query);
  });
};

/** How many entries use each strategy — the counts on the filter chips. */
export const glossaryStrategyCounts = (
  entries: GlossaryIndexEntry[],
): Record<GlossaryStrategy, number> => {
  const counts = {
    translate: 0,
    transliterate: 0,
    "transliterate-with-gloss": 0,
    acronym: 0,
  } satisfies Record<GlossaryStrategy, number>;

  for (const entry of entries) counts[entry.strategy]++;
  return counts;
};

/**
 * One tick of an entry's attestation strip: the parts the English edition
 * covers at all, flagged with whether this particular term was found there.
 * The strip is the page's one data device — read down the list it shows at
 * a glance which terms run through the whole evidenced corpus and which are
 * local to one part.
 */
export interface GlossaryAttestationTick {
  partId: string;
  partNumber: number;
  attested: boolean;
}

/** `"part-03"` → `3`; `null` for anything that isn't a part id. */
export const partNumberFromId = (partId: string): number | null => {
  const match = /^part-(\d+)$/.exec(partId);
  return match ? Number(match[1]) : null;
};

export const glossaryAttestationTicks = (
  entry: GlossaryIndexEntry,
  partsCovered: string[],
): GlossaryAttestationTick[] => {
  const attested = new Set(entry.attestedInParts ?? []);

  return partsCovered.flatMap((partId) => {
    const partNumber = partNumberFromId(partId);
    return partNumber === null
      ? []
      : [{ partId, partNumber, attested: attested.has(partId) }];
  });
};

/**
 * The `chapterId` on a citation, split into the pieces a human-readable
 * label needs (`"part-03/answers-terminology-13"` → part 3, kind
 * `answers-terminology`, chapter 13). Derived from the id alone on purpose:
 * the real titles live in `content/toc.parts/*.json`, and pulling five of
 * those in to label a handful of citations would cost more than the whole
 * glossary index. Returns `null` for an id that doesn't parse, so the
 * citation renders unlabelled rather than half-labelled.
 */
export interface GlossaryCitationTarget {
  partNumber: number;
  kind: ChapterKind;
  chapterNumber: number;
}

const CHAPTER_KINDS: ChapterKind[] = [
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "answers-terminology",
  "answers-topics",
];

export const glossaryCitationTarget = (
  chapterId: string,
): GlossaryCitationTarget | null => {
  const match = /^part-(\d+)\/([a-z-]+?)-(\d+)$/.exec(chapterId);
  if (!match) return null;

  const kind = match[2] as ChapterKind;
  if (!CHAPTER_KINDS.includes(kind)) return null;

  return {
    partNumber: Number(match[1]),
    kind,
    chapterNumber: Number(match[3]),
  };
};

/**
 * Each variant's share of the entry's most-used variant, as a 0-100 width
 * for its bar. Scaled against the maximum rather than the total so a term
 * with one dominant rendering still shows that rendering as a full bar —
 * the bars compare variants *within* an entry, they are not a pie.
 */
export const glossaryVariantShares = (
  variants: GlossaryVariant[],
): { variant: GlossaryVariant; sharePct: number }[] => {
  const max = Math.max(0, ...variants.map((variant) => variant.occurrences));

  return variants.map((variant) => ({
    variant,
    sharePct: max === 0 ? 0 : Math.round((variant.occurrences / max) * 100),
  }));
};
