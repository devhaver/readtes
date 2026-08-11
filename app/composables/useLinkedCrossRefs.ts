/**
 * Turns Sefaria's Questions <-> Answers cross-references into links that
 * stay on this site — the runtime half of `~/utils/sefariaCrossRefs`,
 * which owns the pure ref -> chapter-id mapping.
 *
 * Three things the pure half can't know, all supplied from the reader
 * page's own part file via `provideCrossRefChapters`:
 *
 * - **Whether the target chapters, and target items, actually exist.** A
 *   ref that doesn't match a real chapter — or a real item inside it —
 *   keeps today's external sefaria.org link. This is load-bearing, not
 *   defensive: Nitro's prerender crawler follows internal links, so a route
 *   guessed from string parsing alone becomes a 404 in the generated site.
 *   Chapter ids are part-qualified (`part-09/answers-topics-01`), so a ref
 *   naming any part other than the open one can never resolve against this
 *   set either — which is what keeps the offset below from being applied
 *   across a part boundary. (No ref in the corpus does that: all 6,885
 *   point inside their own part.) A question ref has to clear *both* ids
 *   `sefariaCrossRefTarget` asks for, plus the item check — see
 *   `SefariaCrossRefTarget.answerItem` for why that's checked through the
 *   paired answer chapter's own item, issue #91's consolidation having
 *   folded what used to be one chapter per answer into one chapter per kind.
 * - **How far Sefaria's topics numbering is offset from ours** — the
 *   part's terminology answer count, read off the ToC rather than
 *   hardcoded. See `SefariaCrossRef.number` for what goes wrong without
 *   it; an existence check alone would *not* catch it, since the
 *   un-offset number usually names a real-but-wrong item.
 * - **The active locale.** `useLocalePath()` keeps a reader who is on
 *   `/he/read/…` in Hebrew instead of dropping them onto the default
 *   locale's copy of the chapter.
 *
 * Without a provider (a component mounted outside the reader page), no ref
 * resolves and every link is left exactly as the content holds it.
 *
 * The second half of "stays on this site" is `crossRefRoot`: the rewritten
 * links are plain `<a href>` inside `v-html`, invisible to `<NuxtLink>`, so
 * without a delegated click handler every one of them would be a full
 * document reload — the whole reader torn down and rebuilt, worse for the
 * reader than the tab to sefaria.org this replaces.
 */
import type { InjectionKey, Ref } from "vue";
import type { SefariaCrossRef } from "~/utils/sefariaCrossRefs";
import type { TocChapter } from "~~/shared/types/content";

interface CrossRefContext {
  chapterIds: ReadonlySet<string>;
  /** `answers-*` chapter id -> its `TocChapter.itemCount` (issue #91). Absent entries never resolve internally. */
  itemCounts: ReadonlyMap<string, number>;
  topicsOffset: number;
}

const CROSS_REF_CONTEXT_KEY: InjectionKey<CrossRefContext> =
  Symbol("cross-ref-context");

/**
 * How many terminology answers the part has, as the consolidated
 * `answers-terminology-01` chapter's own `itemCount` — absent (0) if the
 * part has no such chapter or `itemCount` wasn't computed for it (no source
 * version to read). See `TocChapter.itemCount` for why this can't be
 * derived from chapter numbers any more, post-#91.
 */
const terminologyAnswerOffset = (chapters: TocChapter[]): number =>
  chapters.find((chapter) => chapter.kind === "answers-terminology")
    ?.itemCount ?? 0;

/**
 * Called once by the reader page, with the chapters of the part it has
 * loaded. Plain values, not refs: the page fully remounts on every param
 * change (`definePageMeta({ key })`), so this never has to change under a
 * mounted tree.
 */
export const provideCrossRefChapters = (chapters: TocChapter[]): void => {
  provide(CROSS_REF_CONTEXT_KEY, {
    chapterIds: new Set(chapters.map((chapter) => chapter.id)),
    itemCounts: new Map(
      chapters
        .filter((chapter) => chapter.itemCount !== undefined)
        .map((chapter) => [chapter.id, chapter.itemCount as number]),
    ),
    topicsOffset: terminologyAnswerOffset(chapters),
  });
};

const CROSS_REF_LINK_SELECTOR = `a[${CROSS_REF_LINK_ATTR}]`;

/**
 * A click the browser should keep for itself: anything with a modifier
 * (open in a new tab/window, download), a non-primary button, or a click
 * something upstream already handled. Middle clicks reach browsers as
 * `auxclick` rather than `click` and never get here at all; the button
 * check covers the ones that still send both.
 */
const isPlainLeftClick = (event: MouseEvent): boolean =>
  event.button === 0 &&
  !event.defaultPrevented &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

export const useLinkedCrossRefs = (): {
  linkCrossRefs: (html: string) => string;
  crossRefRoot: Ref<HTMLElement | null>;
} => {
  const localePath = useLocalePath();
  const router = useRouter();
  const nuxtApp = useNuxtApp();
  const context = inject(CROSS_REF_CONTEXT_KEY, null);

  const internalHref = (ref: SefariaCrossRef): string | null => {
    if (!context) return null;

    const target = sefariaCrossRefTarget(ref, context.topicsOffset);
    if (
      !target ||
      !target.requiredChapterIds.every((id) => context.chapterIds.has(id))
    ) {
      return null;
    }

    const itemCount = context.itemCounts.get(target.answerItem.chapterId);
    if (itemCount === undefined || target.answerItem.n > itemCount) {
      return null;
    }

    return `${localePath(target.path)}${target.hash}`;
  };

  const linkCrossRefs = (html: string): string =>
    context ? linkInternalSefariaCrossRefs(html, internalHref) : html;

  /**
   * Nuxt's own scroll behaviour takes the *window* to the fragment, which
   * is what study and original mode need but not panes mode, where the
   * seif lives inside the source pane's own scroll container.
   * `scrollIntoView` walks every scrollable ancestor, the way the
   * browser's native fragment navigation did before this handler took the
   * click. Waits for `page:finish` because the reader page resolves its
   * chapter content asynchronously, so the seif isn't in the DOM when
   * `router.push` settles; the hash check keeps a navigation that never
   * finished from scrolling some later page instead.
   */
  const scrollToHash = (hash: string): void => {
    nuxtApp.hooks.hookOnce("page:finish", () => {
      void nextTick(() => {
        if (router.currentRoute.value.hash !== hash) return;
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ block: "start" });
      });
    });
  };

  const onContainerClick = (event: MouseEvent) => {
    if (!isPlainLeftClick(event)) return;

    const target = event.target as HTMLElement | null;
    const href = target
      ?.closest<HTMLAnchorElement>(CROSS_REF_LINK_SELECTOR)
      ?.getAttribute("href");
    if (!href) return;

    event.preventDefault();

    const hashIndex = href.indexOf("#");
    if (hashIndex !== -1) scrollToHash(href.slice(hashIndex));
    void router.push(href);
  };

  const crossRefRoot = ref<HTMLElement | null>(null);

  // Bound imperatively rather than as a template `@click`, for the same
  // reason `useAnchorActivation` is: the listener belongs on the plain
  // element wrapping the `v-html`, and the actual interactive elements are
  // the `<a>` tags inside it — which keyboard-activate natively, sending
  // the very `click` this handles.
  watchEffect((onCleanup) => {
    const container = crossRefRoot.value;
    if (!container) return;

    container.addEventListener("click", onContainerClick);
    onCleanup(() => container.removeEventListener("click", onContainerClick));
  });

  return { linkCrossRefs, crossRefRoot };
};
