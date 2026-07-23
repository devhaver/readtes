/**
 * Groups a "Table of Questions/Answers" chapter's `DocBlock[]` into ordered
 * question/answer pairs.
 *
 * Verified against the real KabbalahMedia doc (Part 1, "Table of Questions
 * for the Meaning of the Words" / "Table of Answers for the Meaning of the
 * Words"): both leaves resolve to the *same* combined docx — one `h6` per
 * item (the question text, with a leading `"N. "` printed number that
 * restarts or continues across sub-tables and must not be trusted for
 * alignment) followed by one or more `p`s (the answer text). Alignment
 * against the Hebrew ground truth is therefore purely by *document
 * position* (1st pair -> he item 1, 2nd -> he item 2, ...), never by the
 * printed number — see `km-order-align.ts`.
 *
 * Structural rules:
 * - An `h6` opens a new pair; its text (leading `"N. "` stripped if present)
 *   is the question.
 * - A `p` appends to the current pair's answer (there is always a current
 *   pair once the first `h6` is seen — any `p` before that, e.g. the table's
 *   own intro paragraph, is structural noise and dropped).
 * - Any other tag (the table's own `h1`-`h5` title heading) is structural
 *   noise.
 */
import { matchLeadingNumber } from "./km-chapter-parser.ts";
import type { DocBlock } from "./km-doc-blocks.ts";

export interface KmQaPair {
  /** 1-based position in document order — the alignment key, not the printed number. */
  position: number;
  questionHtml: string;
  answerHtml: string;
}

const appendHtml = (base: string, addition: string): string =>
  base.length > 0 ? `${base} ${addition}` : addition;

export const parseKmQaPairs = (blocks: DocBlock[]): KmQaPair[] => {
  const pairs: KmQaPair[] = [];
  let current: KmQaPair | undefined;

  for (const block of blocks) {
    if (block.tag === "h6") {
      const leading = matchLeadingNumber(block.html);
      current = {
        position: pairs.length + 1,
        questionHtml: leading ? leading.rest : block.html,
        answerHtml: "",
      };
      pairs.push(current);
      continue;
    }

    if (block.tag === "p" && current) {
      current.answerHtml = appendHtml(current.answerHtml, block.html);
      continue;
    }

    // h1-h5 (the table's own title heading), and any `p` before the first
    // `h6` (the table's intro paragraph): structural noise, skipped.
  }

  return pairs;
};

/** True when a document has at least one `h6` — the shape this module parses. Anything else is reported and skipped, never force-parsed. */
export const isSupportedKmQaStructure = (blocks: DocBlock[]): boolean =>
  blocks.some((b) => b.tag === "h6");

export const validateKmQaPairs = (
  pairs: readonly KmQaPair[],
  questionCount: number,
  answerCount: number,
): string | undefined => {
  if (pairs.some((pair) => pair.questionHtml.trim().length === 0)) {
    return "at least one question is empty";
  }
  if (pairs.some((pair) => pair.answerHtml.trim().length === 0)) {
    return "at least one answer is empty";
  }
  if (pairs.length !== questionCount || pairs.length !== answerCount) {
    return `pair count ${pairs.length} does not match Hebrew questions (${questionCount}) and answer chapters (${answerCount})`;
  }
  return undefined;
};
