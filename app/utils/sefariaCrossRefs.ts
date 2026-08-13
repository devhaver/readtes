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
 * internal href, and only for chapters/items it has actually seen
 * (`useLinkedCrossRefs`). That matters beyond tidiness: Nitro's prerender
 * crawler follows internal links, so an href built optimistically from
 * string parsing alone would turn every unmatched ref into a 404 in the
 * generated site.
 *
 * Ref shapes handled, all four of them (issue #91: every answer chapter of a
 * kind consolidated into the single `…-01` chapter that kind's questions
 * already lived in, so answers and questions now share one shape):
 *
 *   …,_Section_<ROMAN>,_List_of_Answers_on_Terminology_<N>
 *     -> part-<NN>/answers-terminology-01#seif-<N>
 *   …,_Section_<ROMAN>,_List_of_Answers_on_Topics_<N>
 *     -> part-<NN>/answers-topics-01#seif-<N - topicsOffset>
 *   …,_Section_<ROMAN>,_List_of_Questions_on_Terminology_<N>
 *     -> part-<NN>/questions-terminology-01#seif-<N>
 *   …,_Section_<ROMAN>,_List_of_Questions_on_Topics_<N>
 *     -> part-<NN>/questions-topics-01#seif-<N - topicsOffset>
 *
 * One asymmetry remains, and it's real, not a parsing bug: **topics refs are
 * offset** — see `SefariaCrossRef.number`.
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

/**
 * The Q&A subjects, in Sefaria's own continuous numbering order — a
 * section numbers its terminology block 1..T, continues straight into
 * topics at T+1, and (Section VI only, issue #86) into cause-and-effect
 * after that. Order is load-bearing: `crossRefSubjectOffset` sums the
 * answer counts of every *earlier* subject to translate a ref's number
 * back to ours.
 */
export const CROSS_REF_SUBJECTS = [
  "terminology",
  "topics",
  "cause-effect",
] as const;
export type CrossRefSubject = (typeof CROSS_REF_SUBJECTS)[number];

/** Sefaria's node-title spelling of each subject, as it appears in a ref href. */
const SUBJECT_BY_REF_WORD: Record<string, CrossRefSubject> = {
  Terminology: "terminology",
  Topics: "topics",
  Cause_and_Effect: "cause-effect",
};

const QA_REF_RE =
  /^\/?Talmud_Eser_HaSefirot,_Section_([A-Z]+),_List_of_(Answers|Questions)_on_(Terminology|Topics|Cause_and_Effect)_(\d+)$/;

/** Zero-pads to the 2-digit minimum the content ids use (`01`, `54`, `253`). */
const padId = (value: number): string => String(value).padStart(2, "0");

/** One Sefaria Q&A cross-reference href, decoded. */
export interface SefariaCrossRef {
  /** The section the ref names, as this site's part id (`part-09`). */
  partId: string;
  apparatus: "answers" | "questions";
  subject: CrossRefSubject;
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
   * So a ref has to have the answer count of every *earlier* subject
   * subtracted before it means anything here. This is not a cosmetic
   * detail: for a part with many topics answers, the unsubtracted number
   * lands on a *different, existing* topics chapter, which an existence
   * check alone would happily link. `sefariaCrossRefTarget` does the
   * subtraction; the offsets themselves come from the ToC
   * (`useLinkedCrossRefs`), never from a hardcoded table — the same
   * numbering Sefaria publishes as `index_offsets_by_depth` on the nodes
   * (issue #103), arrived at independently and agreeing with it.
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
    subject: SUBJECT_BY_REF_WORD[match[3] as string] as CrossRefSubject,
    number: Number.parseInt(match[4] as string, 10),
  };
};

/** Where a parsed ref points on this site. */
export interface SefariaCrossRefTarget {
  /**
   * Every chapter id that must exist here before this link may go internal
   * — the caller links only when it has seen *all* of them in the ToC.
   * An answer ref needs the one chapter it lands on. A question ref needs
   * two: the questions chapter that holds the seif, and the answers
   * chapter `answerItem` names — checked here only for its own existence;
   * whether it actually holds item `answerItem.n` is `answerItem`'s job.
   */
  requiredChapterIds: string[];
  /**
   * The (chapter, item number) pair whose *item-level* existence is this
   * ref's real guardrail, for both apparatuses (issue #91) — always a spot
   * in the `answers-<subject>-01` chapter, checked against that chapter's
   * `TocChapter.itemCount`. For an answer ref this *is* the target; for a
   * question ref it is only evidence, the same pairing #78 always used
   * (question N <-> answer N throughout the corpus), just re-checked at
   * item granularity now that consolidation folded the per-answer chapters
   * `requiredChapterIds` used to check into one — a missing answer N is
   * exactly where a question N may also be missing, Part 1's 55
   * terminology questions against 54 answers being the known break. Erring
   * toward the external link there is what issue #78 asks for: an
   * unconfirmed target falls back rather than pointing at a fragment that
   * isn't on the page.
   */
  answerItem: { chapterId: string; n: number };
  /** Unprefixed route for that chapter — feed it through `useLocalePath()`. */
  path: string;
  /** `#seif-N` for both an answer and a question ref (issue #91: answers are `#seif-N` items too now). */
  hash: string;
}

/**
 * How many answers of *earlier* subjects a part has, which is what a ref's
 * number carries over Sefaria's continuous numbering. `answerCounts` is
 * keyed by subject — a missing subject counts as zero, which is right for a
 * part that has no such table (fifteen of the sixteen have no
 * cause-and-effect one).
 */
export const crossRefSubjectOffset = (
  subject: CrossRefSubject,
  answerCounts: Partial<Record<CrossRefSubject, number>>,
): number =>
  CROSS_REF_SUBJECTS.slice(0, CROSS_REF_SUBJECTS.indexOf(subject)).reduce(
    (sum, earlier) => sum + (answerCounts[earlier] ?? 0),
    0,
  );

/**
 * Maps a parsed ref onto this site's ids, translating Sefaria's continuous
 * section numbering back to ours (see `SefariaCrossRef.number`).
 *
 * `answerCounts` is how many answers the ref's own part has per subject;
 * only the subjects *before* this ref's own are subtracted. Returns `null`
 * when the translated number isn't a plausible one (numbered at or below
 * the offset, or a zero) — the caller then leaves the external link alone.
 * The returned ids/item are only *candidates*: they say nothing about
 * whether that chapter or item actually exists, which is the caller's job
 * to check.
 */
export const sefariaCrossRefTarget = (
  ref: SefariaCrossRef,
  answerCounts: Partial<Record<CrossRefSubject, number>>,
): SefariaCrossRefTarget | null => {
  const number = ref.number - crossRefSubjectOffset(ref.subject, answerCounts);
  if (number < 1) return null;

  const answerChapterId = `${ref.partId}/answers-${ref.subject}-01`;
  const answerItem = { chapterId: answerChapterId, n: number };

  if (ref.apparatus === "answers") {
    return {
      requiredChapterIds: [answerChapterId],
      answerItem,
      path: `/read/${answerChapterId}`,
      hash: `#seif-${number}`,
    };
  }

  const questionsChapterId = `${ref.partId}/questions-${ref.subject}-01`;
  return {
    requiredChapterIds: [questionsChapterId, answerChapterId],
    answerItem,
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
