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
  sefariaRef: z.string(),
  heading: z.string().optional(),
  html: z.string(),
  anchors: z.array(z.string()),
});
export type SourceSegment = z.infer<typeof sourceSegmentSchema>;

export const commentaryItemSchema = z.object({
  anchorId: z.string(),
  order: z.number().int().positive(),
  label: localizedTitleSchema,
  sefariaRef: z.string(),
  targetSeif: z.number().int().positive(),
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
