/**
 * Baal HaSulam's Questions/Answers apparatus is a closed loop: every
 * question links to its answer, every answer links back to its question.
 * Sefaria emits those as links to its own refs — site-relative in the raw
 * API output, absolute `sefaria.org` links in our committed content (see
 * `sanitizeHtml.ts`, which rewrote them at import time back when those
 * chapters didn't exist here yet). The full corpus is imported now, so the
 * loop can stay on this site.
 *
 * This module is the pure half of that: reading a Sefaria Q&A ref, mapping
 * it onto the chapter it names *here*, and swapping the hrefs in a
 * segment's already-sanitized html. It never decides on its own that a
 * target exists — `linkInternalSefariaCrossRefs`'s caller supplies the
 * internal href, and only for chapters it has actually seen in the ToC
 * (`useLinkedCrossRefs`). That matters beyond tidiness: Nitro's prerender
 * crawler follows internal links, so an href built optimistically from
 * string parsing alone would turn every unmatched ref into a 404 in the
 * generated site.
 *
 * Ref shapes handled, all four of them:
 *
 *   …,_Section_<ROMAN>,_List_of_Answers_on_Terminology_<N>
 *     -> part-<NN>/answers-terminology-<NN>
 *   …,_Section_<ROMAN>,_List_of_Answers_on_Topics_<N>
 *     -> part-<NN>/answers-topics-<NN - topicsOffset>
 *   …,_Section_<ROMAN>,_List_of_Questions_on_Terminology_<N>
 *     -> part-<NN>/questions-terminology-01#seif-<N>
 *   …,_Section_<ROMAN>,_List_of_Questions_on_Topics_<N>
 *     -> part-<NN>/questions-topics-01#seif-<N - topicsOffset>
 *
 * Two asymmetries in there, both real, neither a parsing bug:
 *
 * - **Answers are chapters, questions are seifim.** Each answer is its own
 *   chapter, while all questions of a kind live as items inside a single
 *   chapter — so a question ref targets a `#seif-N` fragment (this site's
 *   own convention — see `sourceSegmentAnchorId`) of `…-01`.
 * - **Topics refs are offset** — see `SefariaCrossRef.number`.
 */

/**
 * `Talmud Eser HaSefirot` is a closed work of exactly 16 parts, and Sefaria
 * numbers its sections I-XVI to match — so this is the whole domain of
 * section numerals, not a subset of some open-ended roman parser. An
 * unlisted numeral (malformed, or a non-canonical spelling like `IIII`)
 * simply isn't a section of this work, and falls back to the external link.
 */
const SECTION_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
] as const;

const SEFARIA_ORIGIN_RE = /^https?:\/\/(?:www\.)?sefaria\.org(?=\/)/i;

const QA_REF_RE =
  /^\/?Talmud_Eser_HaSefirot,_Section_([A-Z]+),_List_of_(Answers|Questions)_on_(Terminology|Topics)_(\d+)$/;

/** Zero-pads to the 2-digit minimum the content ids use (`01`, `54`, `253`). */
const padId = (value: number): string => String(value).padStart(2, "0");

/** One Sefaria Q&A cross-reference href, decoded. */
export interface SefariaCrossRef {
  /** The section the ref names, as this site's part id (`part-09`). */
  partId: string;
  apparatus: "answers" | "questions";
  subject: "terminology" | "topics";
  /**
   * The ref's own number — **Sefaria's continuous per-section numbering**,
   * not ours. Within a section it numbers the terminology block 1..T and
   * then continues straight into the topics block at T+1, while the nodes
   * those refs address (and so our chapter ids and seif numbers, which are
   * derived from them) restart at 1 for topics. Part 9 is the clearest
   * case: its 78 topics answers are chapters `answers-topics-01`..`-78`,
   * but the links pointing at them read `…_List_of_Answers_on_Topics_106`
   * ..`_183`.
   *
   * So a topics ref has to have that offset — the part's terminology
   * answer count — subtracted before it means anything here. This is not a
   * cosmetic detail: for a part with many topics answers, the unsubtracted
   * number lands on a *different, existing* topics chapter, which an
   * existence check alone would happily link. `sefariaCrossRefTarget` does
   * the subtraction; the offset itself comes from the ToC
   * (`useLinkedCrossRefs`), never from a hardcoded table.
   *
   * Checked against every one of the 6,885 cross-references in the corpus:
   * terminology refs match our numbering exactly, and topics refs match it
   * offset by that part's terminology answer count, in both directions.
   */
  number: number;
}

/**
 * Parses one Sefaria Q&A cross-reference href — site-relative
 * (`/Talmud_Eser_HaSefirot,…`, as the API emits it) or absolute
 * (`https://www.sefaria.org/Talmud_Eser_HaSefirot,…`, as our committed
 * content holds it). Returns `null` for anything else: another Sefaria
 * text, an in-page `#op-N`/`#seif-N` fragment, an off-site citation, a
 * section numeral outside I-XVI.
 */
export const parseSefariaCrossRef = (href: string): SefariaCrossRef | null => {
  const match = QA_REF_RE.exec(href.replace(SEFARIA_ORIGIN_RE, ""));
  if (!match) return null;

  const sectionIndex = SECTION_NUMERALS.indexOf(
    match[1] as (typeof SECTION_NUMERALS)[number],
  );
  if (sectionIndex === -1) return null;

  return {
    partId: `part-${padId(sectionIndex + 1)}`,
    apparatus: match[2] === "Answers" ? "answers" : "questions",
    subject: match[3] === "Terminology" ? "terminology" : "topics",
    number: Number.parseInt(match[4] as string, 10),
  };
};

/** Where a parsed ref points on this site. */
export interface SefariaCrossRefTarget {
  /**
   * Every chapter id that must exist here before this link may go internal
   * — the caller links only when it has seen *all* of them in the ToC.
   *
   * An answer ref needs the one chapter it lands on. A question ref needs
   * two: the questions chapter that holds the seif, *and* the answer
   * chapter of the same number. The second one is not the target — it is
   * the only evidence available at render time that the seif exists at
   * all. The ToC carries chapter ids, not per-chapter item counts, so
   * `#seif-N` cannot be checked directly; the apparatus is a pairing
   * (question N <-> answer chapter N throughout the corpus), so a missing
   * answer chapter N is exactly where a question N may also be missing —
   * Part 1's 55 terminology questions against 54 answer chapters being the
   * known break. Erring toward the external link there is what issue #78
   * asks for: an unmatched number falls back rather than pointing at a
   * fragment that isn't on the page.
   */
  requiredChapterIds: string[];
  /** Unprefixed route for that chapter — feed it through `useLocalePath()`. */
  path: string;
  /** `#seif-N` for a question ref, `""` for an answer ref. */
  hash: string;
}

/**
 * Maps a parsed ref onto this site's ids, translating Sefaria's continuous
 * section numbering back to ours (see `SefariaCrossRef.number`).
 *
 * `topicsOffset` is how many terminology answers the ref's own part has;
 * it applies to topics refs only. Returns `null` when the translated
 * number isn't a plausible one (a topics ref numbered at or below the
 * offset, or a zero) — the caller then leaves the external link alone. The
 * returned ids are only *candidates*: they say nothing about whether those
 * chapters exist, which is the caller's job to check.
 */
export const sefariaCrossRefTarget = (
  ref: SefariaCrossRef,
  topicsOffset: number,
): SefariaCrossRefTarget | null => {
  const number =
    ref.subject === "topics" ? ref.number - topicsOffset : ref.number;
  if (number < 1) return null;

  const answerChapterId = `${ref.partId}/answers-${ref.subject}-${padId(number)}`;
  if (ref.apparatus === "answers") {
    return {
      requiredChapterIds: [answerChapterId],
      path: `/read/${answerChapterId}`,
      hash: "",
    };
  }

  const questionsChapterId = `${ref.partId}/questions-${ref.subject}-01`;
  return {
    requiredChapterIds: [questionsChapterId, answerChapterId],
    path: `/read/${questionsChapterId}`,
    hash: `#seif-${number}`,
  };
};

const ANCHOR_OPEN_TAG_RE = /<a\b([^>]*)>/gi;
const HREF_ATTR_RE = /\shref="([^"]*)"/i;
/**
 * Dropped when a link becomes internal: `target="_blank"`/`rel` are there
 * only because `sanitizeHtml` synthesized them for a link it had just sent
 * off-site (see that file). A same-site chapter link should navigate in
 * place, not spawn a tab.
 */
const OFFSITE_ATTRS_RE = /\s(?:target|rel)="[^"]*"/gi;

/**
 * Marks an anchor this pass made internal. These links live inside
 * `v-html`, so they can never be `<NuxtLink>`s — this attribute is what
 * lets the reader's delegated click handler (`useLinkedCrossRefs`) pick
 * them out of the surrounding content markup and route them client-side
 * instead of letting the browser reload the whole document.
 */
export const CROSS_REF_LINK_ATTR = "data-cross-ref";

/**
 * Rewrites every recognized Sefaria Q&A cross-reference in an
 * already-sanitized segment's html to the internal href `toInternalHref`
 * returns for it. A ref that doesn't parse, or that the callback declines
 * (`null` — no such chapter here), is left exactly as it was: still the
 * external, new-tab sefaria.org link.
 *
 * A single attribute-level replace over the anchor's open tag, not a
 * re-parse of the html — the reader renders import-sanitized html as-is
 * (see `SourcePane`), and this is a display-time remap of one href, not a
 * general re-sanitization pass.
 */
export const linkInternalSefariaCrossRefs = (
  html: string,
  toInternalHref: (ref: SefariaCrossRef) => string | null,
): string =>
  html.replace(ANCHOR_OPEN_TAG_RE, (full, attrs: string) => {
    const href = HREF_ATTR_RE.exec(attrs)?.[1];
    if (!href) return full;

    const ref = parseSefariaCrossRef(href);
    if (!ref) return full;

    const internalHref = toInternalHref(ref);
    if (!internalHref) return full;

    const rest = attrs.replace(HREF_ATTR_RE, "").replace(OFFSITE_ATTRS_RE, "");
    return `<a href="${internalHref}" ${CROSS_REF_LINK_ATTR}${rest}>`;
  });
