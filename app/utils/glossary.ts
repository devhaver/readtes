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
 * Every quote-shaped mark the two sides of this glossary can be typed with.
 * Hebrew terminology carries geresh/gershayim inside acronyms (`ז"א`,
 * `בחי"ד`, `או"ח`) — sometimes as the real punctuation U+05F3/U+05F4,
 * sometimes as an ASCII apostrophe or double quote — and English pasted out
 * of a PDF arrives with typographic quotes (U+2018/U+2019/U+201C/U+201D).
 * Nobody types any of them into a search box, so all of them are stripped.
 *
 * Pulled out of the replace call and given a name because these characters
 * are near-indistinguishable inline in a source file: the first version of
 * this class listed `׳` and `״` twice each and no typographic quotes at all,
 * and read as correct. `tests/unit/glossary.spec.ts` covers each group.
 */
const QUOTE_MARKS = /["'`׳״‘’“”]/g;

/**
 * Strips every quote-shaped mark and collapses whitespace so `זא` finds
 * `ז"א`, and lowercases so the English side is caseless. Applied to both the
 * query and the searched text, so the two are always compared in the same
 * normal form.
 */
export const normalizedGlossaryText = (value: string): string =>
  value.toLowerCase().replace(QUOTE_MARKS, "").replace(/\s+/g, " ").trim();

/**
 * The one string an entry is searched against: its Hebrew, its canonical
 * English, every attested variant, its id (a romanization for most terms)
 * and its note.
 *
 * Memoized on the entry object itself. Entries come from a statically
 * imported JSON module, so the 125 objects are identical across every
 * recompute and each string is built exactly once for the lifetime of the
 * page rather than once per entry per keystroke. A `WeakMap` so a caller
 * that builds entries on the fly (the specs do) doesn't leak them.
 */
const searchableTextCache = new WeakMap<GlossaryIndexEntry, string>();

const searchableText = (entry: GlossaryIndexEntry): string => {
  const cached = searchableTextCache.get(entry);
  if (cached !== undefined) return cached;

  const text = normalizedGlossaryText(
    [
      entry.he,
      entry.canonicalEn,
      entry.id.replace(/-/g, " "),
      entry.note ?? "",
      ...(entry.variants ?? []).map((variant) => variant.en),
    ].join(" "),
  );

  searchableTextCache.set(entry, text);
  return text;
};

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
 * i18n key naming each layer a citation can come from.
 *
 * Points at the reader's own pane labels rather than carrying a glossary
 * copy: "The Ari's Text" and "Inner Light" are the same two strings the
 * reader puts at the top of its panes, and a third copy would be a third
 * thing to keep in step when the wording changes. `summary` has no reader
 * label to borrow (no pane renders that layer), so it keeps the one key the
 * glossary owns.
 */
export const GLOSSARY_LAYER_LABEL_KEYS: Record<LayerKind, string> = {
  source: "reader.pane.source",
  commentary: "reader.pane.innerLight",
  summary: "glossary.layerSummary",
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
