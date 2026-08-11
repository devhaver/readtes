/**
 * Content model for Read TES.
 *
 * This module is the single source of truth for the shape of everything
 * under `content/`: the shared version registry, the table of contents, and
 * the per-chapter/layer/version content files.
 *
 * IMPORTANT: this file imports `zod` at runtime. It is meant for
 * `scripts/**` (the Sefaria importer, `validate-content.ts`) and
 * `tests/unit/**`. Application code under `app/` must only ever
 * `import type { ... } from '~~/shared/types/content'` (or the equivalent
 * relative path) so `zod` never ends up in the client bundle.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Layer / chapter kinds
// ---------------------------------------------------------------------------

export const layerKindSchema = z.enum(["summary", "source", "commentary"]);
export type LayerKind = z.infer<typeof layerKindSchema>;

export const chapterKindSchema = z.enum([
  "chapter",
  "inner-observation",
  "questions-terminology",
  "questions-topics",
  "answers-terminology",
  "answers-topics",
]);
export type ChapterKind = z.infer<typeof chapterKindSchema>;

// ---------------------------------------------------------------------------
// Content versions
// ---------------------------------------------------------------------------

export const contentVersionSchema = z.object({
  id: z.string(),
  language: z.string(),
  direction: z.enum(["ltr", "rtl"]),
  title: z.string(),
  license: z.enum([
    "Public Domain",
    "CC0",
    "CC-BY",
    "Used with permission",
    "unknown",
  ]),
  source: z.enum(["sefaria", "kabbalahmedia", "curated", "ai"]),
  sefariaVersionTitle: z.string().optional(),
  /** versionId of the source-language version this was translated from (AI or human). */
  translatedFrom: z.string().optional(),
});
export type ContentVersion = z.infer<typeof contentVersionSchema>;

/** Shape of `content/versions.json`. */
export const versionsFileSchema = z.array(contentVersionSchema);
export type VersionsFile = z.infer<typeof versionsFileSchema>;

// ---------------------------------------------------------------------------
// Table of contents
// ---------------------------------------------------------------------------

const localizedTitleSchema = z.record(z.string(), z.string());

const availableVersionsSchema = z.object({
  summary: z.array(z.string()),
  source: z.array(z.string()),
  commentary: z.array(z.string()),
}) satisfies z.ZodType<Record<LayerKind, string[]>>;

export const tocChapterSchema = z.object({
  id: z.string(),
  kind: chapterKindSchema,
  number: z.number().int().positive(),
  title: localizedTitleSchema,
  availableLayers: z.array(layerKindSchema),
  availableVersions: availableVersionsSchema,
});
export type TocChapter = z.infer<typeof tocChapterSchema>;

const tocPartMediaSchema = z.object({
  kabbalahMedia: z
    .object({
      playlistId: z.string().optional(),
      lessonUrls: z.array(z.string()).optional(),
    })
    .optional(),
});

export const tocPartSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  sefariaNode: z.string(),
  title: localizedTitleSchema,
  chapters: z.array(tocChapterSchema),
  media: tocPartMediaSchema.optional(),
});
export type TocPart = z.infer<typeof tocPartSchema>;

export const tocVolumeSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: localizedTitleSchema,
  parts: z.array(tocPartSchema),
});
export type TocVolume = z.infer<typeof tocVolumeSchema>;

export const tocSchema = z.object({
  volumes: z.array(tocVolumeSchema),
});
export type Toc = z.infer<typeof tocSchema>;

// ---------------------------------------------------------------------------
// Split ToC files (app-facing) — content/toc.volumes.json + content/toc.parts/*.json
//
// `content/toc.json` stays the canonical build-time file (importer,
// `validate-content`, `nuxt.config.ts` prerender routes, the sitemap route
// all keep reading it) but is 2.9MB+ at full-corpus scale — far too large
// to bundle into every page's payload. App code (`app/`) must only ever
// load these two split, app-facing shapes instead — see AGENTS.md "Content
// model". Both are emitted from `content/toc.json` by
// `scripts/lib/toc-splits.ts` (invoked by both importers and by
// `pnpm emit:toc-splits` standalone) and cross-checked against it by
// `scripts/validate-content.ts`.
// ---------------------------------------------------------------------------

/** Per-language coverage across a group of chapters (volumes-index badges). */
export const languageAvailabilitySchema = z.enum(["none", "partial", "full"]);
export type LanguageAvailability = z.infer<typeof languageAvailabilitySchema>;

const partAvailableSummarySchema = z.object({
  he: languageAvailabilitySchema,
  en: languageAvailabilitySchema,
}) satisfies z.ZodType<Record<"he" | "en", LanguageAvailability>>;
export type PartAvailableSummary = z.infer<typeof partAvailableSummarySchema>;

/**
 * One volume's parts, without chapter lists — precomputed at emit time so
 * the volumes index never needs a part's full `TocChapter[]` just to render
 * its chapter count / language badges. `firstChapterId`/`lastChapterId` (and
 * their titles) are in the same kind-then-number reading order
 * `app/utils/toc.ts`'s `orderedPartChapters` uses, so the reader can link
 * prev/next across a part boundary without loading the neighbor part's
 * file. Null when the part has no chapters yet.
 */
export const tocPartSkeletonSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: localizedTitleSchema,
  sefariaNode: z.string(),
  chapterCount: z.number().int().nonnegative(),
  kindsPresent: z.array(chapterKindSchema),
  firstChapterId: z.string().nullable(),
  lastChapterId: z.string().nullable(),
  firstChapterTitle: localizedTitleSchema.nullable(),
  lastChapterTitle: localizedTitleSchema.nullable(),
  availableSummary: partAvailableSummarySchema,
});
export type TocPartSkeleton = z.infer<typeof tocPartSkeletonSchema>;

export const tocVolumeSkeletonSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: localizedTitleSchema,
  parts: z.array(tocPartSkeletonSchema),
});
export type TocVolumeSkeleton = z.infer<typeof tocVolumeSkeletonSchema>;

/** Shape of `content/toc.volumes.json`. */
export const tocVolumesFileSchema = z.object({
  volumes: z.array(tocVolumeSkeletonSchema),
});
export type TocVolumesFile = z.infer<typeof tocVolumesFileSchema>;

const tocPartFileIdentitySchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: localizedTitleSchema,
});
export type TocPartFileIdentity = z.infer<typeof tocPartFileIdentitySchema>;

/**
 * Shape of `content/toc.parts/part-NN.json`: one part's full `TocChapter[]`
 * (exactly the entries `toc.json` holds for that part today) plus the
 * part's own identity and its parent volume's — enough for the reader page
 * and a volume's contents page to render breadcrumbs/SEO from this one file
 * alone, no `toc.volumes.json` lookup needed for the current part/volume.
 */
export const tocPartFileSchema = z.object({
  part: tocPartFileIdentitySchema,
  volume: tocPartFileIdentitySchema,
  chapters: z.array(tocChapterSchema),
});
export type TocPartFile = z.infer<typeof tocPartFileSchema>;

// ---------------------------------------------------------------------------
// Layer items
// ---------------------------------------------------------------------------

export const sourceSegmentSchema = z.object({
  n: z.number().int().positive(),
  /** Optional: KabbalahMedia's Hebrew whole-part dialect derives structure entirely from the docx and has no Sefaria reference to copy — see `km-he-whole-part-parser.ts`. Every Sefaria-imported version still populates this. */
  sefariaRef: z.string().optional(),
  heading: z.string().optional(),
  html: z.string(),
  anchors: z.array(z.string()),
});
export type SourceSegment = z.infer<typeof sourceSegmentSchema>;

/**
 * A commentary item is one of two kinds, distinguished by whether
 * `targetSeif` is present:
 *
 * - **Anchored** (`targetSeif` present): names the exact source segment
 *   (`SourceSegment.n`) it comments on, and round-trips with a `tes-anchor`
 *   marker in some source version of the same chapter — `anchorId` must
 *   appear in a source segment's `anchors[]`, and `targetSeif` must name a
 *   seif that exists. `validate-content.ts`'s `checkAnchorCommentaryIntegrity`
 *   enforces both directions for every anchored item.
 * - **Unanchored** (`targetSeif` absent): belongs to a known chapter, but no
 *   seif-level mapping is known for it — e.g. Ohr Penimi commentary Sefaria
 *   has text for but no Links API entry to attach it with (issue #79).
 *   `anchorId` still follows the `op-<order>` grammar as a stable identity —
 *   the grammar is unchanged, there is simply no matching marker in the
 *   source — and `label` is the plain-digit rendering of `order` in both
 *   languages ("1", "2", …), never invented per-seif letters. Unanchored
 *   items are excluded from the anchor round-trip checks (no `targetSeif` to
 *   verify, and no source `anchors[]` entry may ever name one), but
 *   `validate-content.ts` still requires `order` to be positive and unique
 *   per file and `html` to be non-empty.
 *
 * A chapter may legitimately mix anchored and unanchored items — sections
 * 2-3 have partial link coverage, so some seifim are attached and others
 * aren't.
 */
export const commentaryItemSchema = z.object({
  anchorId: z.string(),
  order: z.number().int().positive(),
  label: localizedTitleSchema,
  /** Optional — see `sourceSegmentSchema.sefariaRef`. */
  sefariaRef: z.string().optional(),
  /** See the doc comment on `commentaryItemSchema` for anchored vs unanchored. */
  targetSeif: z.number().int().positive().optional(),
  section: z.enum(["ohr-pnimi", "histaklut-pnimit"]),
  html: z.string(),
});
export type CommentaryItem = z.infer<typeof commentaryItemSchema>;

export const summaryItemSchema = z.object({
  id: z.string(),
  targetSeif: z.number().int().positive().optional(),
  heading: z.string(),
  html: z.string(),
});
export type SummaryItem = z.infer<typeof summaryItemSchema>;

export const layerItemSchema = z.union([
  sourceSegmentSchema,
  commentaryItemSchema,
  summaryItemSchema,
]);
export type LayerItem = SourceSegment | CommentaryItem | SummaryItem;

/**
 * Per-layer item schema map. Given a `layer` value, this selects the Zod
 * schema every item in that layer's file must satisfy.
 */
export const layerSchemas: Record<LayerKind, z.ZodType<LayerItem>> = {
  source: sourceSegmentSchema,
  commentary: commentaryItemSchema,
  summary: summaryItemSchema,
};

// ---------------------------------------------------------------------------
// Chapter/layer/version files
// ---------------------------------------------------------------------------

/** One file = one (chapter, layer, version). */
export interface ChapterLayerFile<T extends LayerItem = LayerItem> {
  chapterId: string;
  layer: LayerKind;
  versionId: string;
  sefariaRef?: string;
  items: T[];
}

const chapterLayerFileBaseShape = {
  chapterId: z.string(),
  versionId: z.string(),
  sefariaRef: z.string().optional(),
};

export const sourceLayerFileSchema = z.object({
  ...chapterLayerFileBaseShape,
  layer: z.literal("source"),
  items: z.array(sourceSegmentSchema),
});

export const commentaryLayerFileSchema = z.object({
  ...chapterLayerFileBaseShape,
  layer: z.literal("commentary"),
  items: z.array(commentaryItemSchema),
});

export const summaryLayerFileSchema = z.object({
  ...chapterLayerFileBaseShape,
  layer: z.literal("summary"),
  items: z.array(summaryItemSchema),
});

/**
 * Discriminated union over the `layer` field: parsing a raw JSON blob
 * against this schema selects the right item schema for its layer.
 */
export const chapterLayerFileSchema = z.discriminatedUnion("layer", [
  sourceLayerFileSchema,
  commentaryLayerFileSchema,
  summaryLayerFileSchema,
]);
export type ParsedChapterLayerFile = z.infer<typeof chapterLayerFileSchema>;

// ---------------------------------------------------------------------------
// Glossary — content/glossary/tes-en.json (+ its two app-facing split files)
//
// `tes-en.json` is the canonical, hand-audited terminology artifact: every
// entry was mined from the 737 chapters where a `he-jerusalem-1956` file and
// an `en-bb` file could be aligned item-by-item. It is 307KB, and ~72% of
// that is `citations` — the aligned Hebrew/English excerpt pairs that
// evidence each term. Loading all of it just to render a browsable term list
// would be the `toc.json` mistake again, one directory over, so the same
// split-then-verify scheme applies: `scripts/lib/glossary-splits.ts` derives
// `tes-en.index.json` (everything but the citations) and
// `tes-en.citations.json` (only the citations, keyed by entry id), and
// `scripts/validate-content.ts` re-derives both and fails on any drift.
// ---------------------------------------------------------------------------

/**
 * How the official English edition carries a Hebrew term across:
 * `translate` — it becomes an English word ("אור" → "light");
 * `transliterate` — the Hebrew word stays, in Latin letters ("מלכות" →
 * "Malchut"); `transliterate-with-gloss` — same, with a parenthesised
 * English gloss on first use; `acronym` — a Hebrew acronym becomes a Latin
 * initialism ("ז\"א" → "ZA").
 */
export const glossaryStrategySchema = z.enum([
  "translate",
  "transliterate",
  "transliterate-with-gloss",
  "acronym",
]);
export type GlossaryStrategy = z.infer<typeof glossaryStrategySchema>;

/** One English rendering the aligned en-bb corpus actually used, with its count. */
export const glossaryVariantSchema = z.object({
  en: z.string(),
  occurrences: z.number().int().nonnegative(),
});
export type GlossaryVariant = z.infer<typeof glossaryVariantSchema>;

/**
 * One aligned Hebrew/English excerpt pair evidencing a term.
 * `chapterId`/`layer`/`item` are absent on the handful of v2 entries whose
 * evidence was quoted from an unaligned fallback chapter (`attestation:
 * "attested"`), so a citation without a `chapterId` renders as a quotation
 * with no chapter link rather than a broken one.
 */
export const glossaryCitationSchema = z.object({
  chapterId: z.string().optional(),
  layer: layerKindSchema.optional(),
  /** Free text, e.g. `"item 1"` or `"op-10 (order 10)"`. */
  item: z.string().optional(),
  he: z.string(),
  en: z.string(),
});
export type GlossaryCitation = z.infer<typeof glossaryCitationSchema>;

/**
 * The per-term fields shared by the canonical file and the split index —
 * everything except `citations`, which the index replaces with a count.
 */
const glossaryEntryBaseShape = {
  id: z.string(),
  he: z.string(),
  canonicalEn: z.string(),
  strategy: glossaryStrategySchema,
  /** Absent on the five v2 entries that carry `attestation` instead of frequency stats. */
  heItemCount: z.number().int().nonnegative().optional(),
  alignedItemCount: z.number().int().nonnegative().optional(),
  coveragePct: z.number().int().min(0).max(100).optional(),
  attestedInParts: z.array(z.string()).optional(),
  variants: z.array(glossaryVariantSchema).optional(),
  note: z.string().optional(),
  /** `"attested"`, or a sentence explaining a derived (unattested) form. */
  attestation: z.string().optional(),
};

export const glossaryEntrySchema = z.object({
  ...glossaryEntryBaseShape,
  citations: z.array(glossaryCitationSchema),
});
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;

/** A house rule the English edition follows, with the evidence for it. */
export const glossaryConventionSchema = z.object({
  id: z.string(),
  topic: z.string(),
  rule: z.string(),
  evidence: z.string(),
  examples: z.array(
    z.object({
      chapterId: z.string(),
      layer: layerKindSchema,
      he: z.string(),
      en: z.string(),
    }),
  ),
});
export type GlossaryConvention = z.infer<typeof glossaryConventionSchema>;

/** A place the official edition contradicts itself, and the form this project locks. */
export const glossaryInconsistencySchema = z.object({
  id: z.string(),
  topic: z.string(),
  split: z.array(
    z.object({
      form: z.string(),
      occurrences: z.number().int().nonnegative(),
      whereMostly: z.string().optional(),
    }),
  ),
  diagnosis: z.string(),
  recommendation: z.string(),
  affects: z.array(z.string()),
});
export type GlossaryInconsistency = z.infer<typeof glossaryInconsistencySchema>;

/** How the glossary was produced — the corpus it was read off and how well it aligned. */
export const glossaryProvenanceSchema = z.object({
  sourceVersion: z.string(),
  referenceVersion: z.string(),
  repoPath: z.string(),
  generatedOn: z.string(),
  method: z.string(),
  alignedFilePairs: z.number().int().nonnegative(),
  alignedChapters: z.number().int().nonnegative(),
  alignedItemPairs: z.number().int().nonnegative(),
  unalignedFallbackChapters: z.number().int().nonnegative(),
  itemLevelFailureRatePct: z.number(),
  fileLevelFailureRatePct: z.number(),
  hebrewCharsAligned: z.number().int().nonnegative(),
  englishCharsAligned: z.number().int().nonnegative(),
  partsCovered: z.array(z.string()),
  partsNotCovered: z.array(z.string()),
});
export type GlossaryProvenance = z.infer<typeof glossaryProvenanceSchema>;

/** Shape of `content/glossary/tes-en.json` — the canonical, build-time file. */
export const glossaryFileSchema = z.object({
  $schema: z.string(),
  generatedFrom: glossaryProvenanceSchema,
  alignedChapterCount: z.number().int().nonnegative(),
  usage: z.string(),
  entryCount: z.number().int().nonnegative(),
  entries: z.array(glossaryEntrySchema),
  conventions: z.array(glossaryConventionSchema),
  inconsistencies: z.array(glossaryInconsistencySchema),
  knownGaps: z.array(z.string()),
  revisions: z.array(
    z.object({
      version: z.string(),
      date: z.string(),
      reason: z.string(),
      added: z.array(z.string()),
    }),
  ),
});
export type GlossaryFile = z.infer<typeof glossaryFileSchema>;

/** A term in the app-facing index: everything but the citations, plus their count. */
export const glossaryIndexEntrySchema = z.object({
  ...glossaryEntryBaseShape,
  citationCount: z.number().int().nonnegative(),
});
export type GlossaryIndexEntry = z.infer<typeof glossaryIndexEntrySchema>;

/**
 * Shape of `content/glossary/tes-en.index.json` — the 77KB file the
 * glossary page loads up front. `inconsistencies`, `usage` and `revisions`
 * are deliberately not carried across: they are apparatus for the
 * translation run, not for a reader (the per-entry `variants` already say
 * "the edition also writes it this way", where it is actually useful).
 */
export const glossaryIndexFileSchema = z.object({
  meta: z.object({
    sourceVersion: z.string(),
    referenceVersion: z.string(),
    generatedOn: z.string(),
    method: z.string(),
    alignedChapters: z.number().int().nonnegative(),
    alignedItemPairs: z.number().int().nonnegative(),
    entryCount: z.number().int().nonnegative(),
    partsCovered: z.array(z.string()),
    partsNotCovered: z.array(z.string()),
  }),
  entries: z.array(glossaryIndexEntrySchema),
  conventions: z.array(glossaryConventionSchema),
  knownGaps: z.array(z.string()),
});
export type GlossaryIndexFile = z.infer<typeof glossaryIndexFileSchema>;

/**
 * Shape of `content/glossary/tes-en.citations.json` — the 216KB bulk,
 * keyed by entry id, imported only when a reader opens a term.
 */
export const glossaryCitationsFileSchema = z.object({
  citations: z.record(z.string(), z.array(glossaryCitationSchema)),
});
export type GlossaryCitationsFile = z.infer<typeof glossaryCitationsFileSchema>;
