/**
 * Turns Sefaria's Questions <-> Answers cross-references into links that
 * stay on this site — the runtime half of `~/utils/sefariaCrossRefs`,
 * which owns the pure ref -> chapter-id mapping.
 *
 * Three things the pure half can't know, all supplied from the reader
 * page's own part file via `provideCrossRefChapters`:
 *
 * - **Whether the target chapter actually exists.** A ref that doesn't
 *   match a real chapter id keeps today's external sefaria.org link. This
 *   is load-bearing, not defensive: Nitro's prerender crawler follows
 *   internal links, so a route guessed from string parsing alone becomes a
 *   404 in the generated site. Chapter ids are part-qualified
 *   (`part-09/answers-topics-01`), so a ref naming any part other than the
 *   open one can never resolve against this set either — which is what
 *   keeps the offset below from being applied across a part boundary. (No
 *   ref in the corpus does that: all 6,885 point inside their own part.)
 * - **How far Sefaria's topics numbering is offset from ours** — the
 *   part's terminology answer count, read off the ToC rather than
 *   hardcoded. See `SefariaCrossRef.number` for what goes wrong without
 *   it; an existence check alone would *not* catch it, since the
 *   un-offset number usually names a real-but-wrong chapter.
 * - **The active locale.** `useLocalePath()` keeps a reader who is on
 *   `/he/read/…` in Hebrew instead of dropping them onto the default
 *   locale's copy of the chapter.
 *
 * Without a provider (a component mounted outside the reader page), no ref
 * resolves and every link is left exactly as the content holds it.
 */
import type { InjectionKey } from "vue";
import type { SefariaCrossRef } from "~/utils/sefariaCrossRefs";
import type { TocChapter } from "~~/shared/types/content";

interface CrossRefContext {
  chapterIds: ReadonlySet<string>;
  topicsOffset: number;
}

const CROSS_REF_CONTEXT_KEY: InjectionKey<CrossRefContext> =
  Symbol("cross-ref-context");

/**
 * Called once by the reader page, with the chapters of the part it has
 * loaded. Plain values, not refs: the page fully remounts on every param
 * change (`definePageMeta({ key })`), so this never has to change under a
 * mounted tree.
 */
export const provideCrossRefChapters = (chapters: TocChapter[]): void => {
  provide(CROSS_REF_CONTEXT_KEY, {
    chapterIds: new Set(chapters.map((chapter) => chapter.id)),
    topicsOffset: chapters.filter(
      (chapter) => chapter.kind === "answers-terminology",
    ).length,
  });
};

export const useLinkedCrossRefs = (): {
  linkCrossRefs: (html: string) => string;
} => {
  const localePath = useLocalePath();
  const context = inject(CROSS_REF_CONTEXT_KEY, null);

  const internalHref = (ref: SefariaCrossRef): string | null => {
    if (!context) return null;

    const target = sefariaCrossRefTarget(ref, context.topicsOffset);
    if (!target || !context.chapterIds.has(target.chapterId)) return null;

    return `${localePath(target.path)}${target.hash}`;
  };

  const linkCrossRefs = (html: string): string =>
    context ? linkInternalSefariaCrossRefs(html, internalHref) : html;

  return { linkCrossRefs };
};
