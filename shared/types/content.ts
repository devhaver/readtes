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
  license: z.enum(["Public Domain", "CC0", "CC-BY", "unknown"]),
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
