/**
 * Minimal typings for the slices of the Sefaria API responses the importer
 * actually reads. These are intentionally partial — Sefaria's real payloads
 * carry many more fields we never touch.
 */

/** A Sefaria "JaggedArray" text value: either a leaf string, or a nested array (one level per address depth). */
export type SefariaJaggedText = string | SefariaJaggedText[];

export interface SefariaIndexTitle {
  text: string;
  lang: string;
  primary?: boolean;
}

/** One schema node from `GET /api/v2/index/{title}` — a JaggedArrayNode leaf or a SchemaNode branch. */
export interface SefariaIndexNode {
  key: string;
  title: string;
  heTitle: string;
  nodeType?: string;
  depth?: number;
  sectionNames?: string[];
  heSectionNames?: string[];
  addressTypes?: string[];
  default?: boolean;
  titles?: SefariaIndexTitle[];
  nodes?: SefariaIndexNode[];
}

export interface SefariaIndex {
  title: string;
  heTitle: string;
  schema: {
    nodes: SefariaIndexNode[];
  };
}

export interface SefariaVersionText {
  language: string;
  versionTitle: string;
  text: SefariaJaggedText[];
}

/** Response shape of `GET /api/v3/texts/{ref}?version=...`. */
export interface SefariaV3TextsResponse {
  ref?: string;
  heRef?: string;
  textDepth?: number;
  sectionNames?: string[];
  versions: SefariaVersionText[];
  error?: string;
}

/** One entry of `GET /api/links/{ref}`. Only the fields the importer reads. */
export interface SefariaLink {
  category?: string;
  index_title?: string;
  ref: string;
  anchorRef: string;
  sourceHasEn?: boolean;
  collectiveTitle?: { en?: string; he?: string };
  inline_reference?: {
    "data-commentator"?: string;
    "data-order"?: number;
    "data-label"?: string;
  };
}
