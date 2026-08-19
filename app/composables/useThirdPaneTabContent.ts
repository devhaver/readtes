/**
 * Content for the third pane's three tabs — Inner Observation, Questions,
 * Answers — resolved down to whatever the active tab needs to render.
 *
 * All three are part-scoped in the same way (see `usePartScopedSections`):
 * they are not per-chapter layer files, they are other chapters of the same
 * part, identical no matter which chapter is open. That shared shape is why
 * one composable serves all three rather than the page growing three copies
 * of the same forty lines.
 *
 * **One language for the pane, not one per tab.** The reader's per-pane
 * control chooses a *language*, never an edition (that decision is why
 * `resolveVersionForLanguage` exists at all) — and the third pane is one
 * pane. So a single language preference is resolved against whichever tab
 * is showing, which means switching tabs keeps you in the language you were
 * reading and does not silently drop you into another.
 *
 * **Only the active tab is fetched.** `usePartScopedSections` must be called
 * unconditionally — it is a composable — so all three calls are made, each
 * with an `enabled` gate that is true only for the tab actually being
 * shown. A reader who never opens Questions never downloads it, and the
 * previous behaviour for Inner Observation (fetched whenever panes mode was
 * active) becomes strictly narrower rather than wider.
 */
import type { ComputedRef, Ref } from "vue";
import type { InnerObservationSectionView } from "~/components/reader/InnerObservationPane.vue";
import type { PartSectionsLoadState } from "~/composables/usePartScopedSections";
import { usePartScopedSections } from "~/composables/usePartScopedSections";
import type { ThirdPaneTab } from "~/composables/useReaderThirdPane";
import type { VersionsById } from "~/utils/readerVersions";
import type { ContentVersion, TocChapter } from "~~/shared/types/content";

export interface ThirdPaneTabChapters {
  innerObservation: TocChapter[];
  questions: TocChapter[];
  answers: TocChapter[];
}

export interface ThirdPaneTabContent {
  /** Language codes offered for the active tab. */
  languageOptions: ComputedRef<string[]>;
  language: Ref<string | null>;
  /** Version metadata for the active tab, for the provenance badge and `dir`. */
  meta: ComputedRef<ContentVersion | null>;
  sections: ComputedRef<InnerObservationSectionView[]>;
  state: ComputedRef<PartSectionsLoadState>;
}

export const useThirdPaneTabContent = (
  partId: string,
  chapters: ThirdPaneTabChapters,
  activeTab: ComputedRef<ThirdPaneTab | null>,
  enabled: () => boolean,
  versionsById: ComputedRef<VersionsById>,
  locale: Ref<string> | ComputedRef<string>,
): ThirdPaneTabContent => {
  const gateFor = (tab: ThirdPaneTab) => () =>
    enabled() && activeTab.value === tab;

  const innerObservation = usePartScopedSections(
    partId,
    chapters.innerObservation,
    gateFor("inner-observation"),
  );
  const questions = usePartScopedSections(
    partId,
    chapters.questions,
    gateFor("questions"),
  );
  const answers = usePartScopedSections(
    partId,
    chapters.answers,
    gateFor("answers"),
  );

  const active = computed(() => {
    if (activeTab.value === "questions") return questions;
    if (activeTab.value === "answers") return answers;
    return innerObservation;
  });

  const versionIds = computed(() => active.value.versions.value);

  const languageOptions = computed(() =>
    paneLanguageOptions(versionIds.value, locale.value, versionsById.value),
  );

  // Not persisted across chapters, same as the pane's language always was:
  // it re-resolves from the locale whenever the available versions change,
  // and only holds a reader's explicit pick for as long as that pick is
  // still offered.
  const language = ref<string | null>(null);
  watch(
    versionIds,
    (ids) => {
      if (
        language.value &&
        resolveVersionForLanguage(ids, language.value, versionsById.value)
      ) {
        return;
      }
      language.value = resolveDefaultLanguage(
        ids,
        locale.value,
        versionsById.value,
      );
    },
    { immediate: true },
  );

  const versionId = computed(() =>
    language.value
      ? resolveVersionForLanguage(
          versionIds.value,
          language.value,
          versionsById.value,
        )
      : null,
  );

  const meta = computed(() =>
    versionId.value ? (versionsById.value.get(versionId.value) ?? null) : null,
  );

  const sections = computed<InnerObservationSectionView[]>(() =>
    active.value.sections.value
      .map((section) => ({
        chapterId: section.chapterId,
        title: section.title,
        items: versionId.value
          ? (section.itemsByVersion[versionId.value]?.items ?? [])
          : [],
      }))
      // A section whose *selected* version has no items would render as a
      // bare heading with nothing under it — drop it; the sections that do
      // have text in this version carry the tab.
      .filter((section) => section.items.length > 0),
  );

  const state = computed(() => active.value.state.value);

  return { languageOptions, language, meta, sections, state };
};
