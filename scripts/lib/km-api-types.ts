/** Response shapes for the two KabbalahMedia endpoints the importer uses (see AGENTS.md). */

export interface KmFile {
  id: string;
  language: string;
  mimetype: string;
  name?: string;
}

export interface KmContentUnit {
  id: string;
  content_type: string;
  files?: KmFile[];
}

export const DOCX_MIMETYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
