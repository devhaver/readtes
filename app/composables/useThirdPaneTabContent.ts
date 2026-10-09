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
import { useLocalStorage } from "@vueuse/core";
import type { ComputedRef, Ref, WritableComputedRef } from "vue";
import type { InnerObservationSectionView } from "~/components/reader/InnerObservationPane.vue";
import type {
  PartScopedSection,
  PartSectionsLoadState,
} from "~/composables/usePartScopedSections";
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
  language: WritableComputedRef<string | null>;
  /** Version metadata for the tab as a whole, for `dir`/`lang` — provenance is per section. */
  meta: ComputedRef<ContentVersion | null>;
  sections: ComputedRef<InnerObservationSectionView[]>;
  state: ComputedRef<PartSectionsLoadState>;
}

/**
 * One section's view in the chosen language. The edition is resolved PER
 * SECTION (walking the language's chain for the versions that section
 * actually has), not once for the tab: the editions of a part's sections
 * are uneven — part 3's Inner Observation has Bnei Baruch's English for
 * sections 4, 6 and 8 and only the AI translation for 5 and 7 — so a
 * tab-wide pick silently dropped every section it did not cover. Each view
 * carries its own `meta` so the pane can badge "AI translated" exactly
 * where it applies. A section with no text in this language is omitted
 * rather than rendered as a bare heading.
 */
export const resolveSectionViews = (
  sections: PartScopedSection[],
  language: string | null,
  versionsById: VersionsById,
): InnerObservationSectionView[] => {
  if (!language) return [];

  return sections.flatMap((section) => {
    const withItems = Object.keys(section.itemsByVersion).filter(
      (versionId) => (section.itemsByVersion[versionId]?.items.length ?? 0) > 0,
    );
    const versionId = resolveVersionForLanguage(
      withItems,
      language,
      versionsById,
    );
    if (!versionId) return [];

    return [
      {
        chapterId: section.chapterId,
        title: section.title,
        items: section.itemsByVersion[versionId]?.items ?? [],
        meta: versionsById.get(versionId) ?? null,
      },
    ];
  });
};

const LANGUAGE_STORAGE_KEY = "readtes:reader-third-pane-language";

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

  // Persisted like the other two panes' language (`useReaderLanguages`): a
  // reader's pick holds across chapters and tabs for as long as it is still
  // offered, and otherwise the locale's default applies. The persisted read
  // waits for mount so the first client render matches the prerendered HTML
  // (same hydration discipline as `useReaderLanguages`).
  const preferredLanguage = useLocalStorage<string | null>(
    LANGUAGE_STORAGE_KEY,
    null,
  );
  const hydrated = ref(false);
  onMounted(() => {
    hydrated.value = true;
  });

  const language = computed<string | null>({
    get: () => {
      const preferred = hydrated.value ? preferredLanguage.value : null;
      if (preferred && languageOptions.value.includes(preferred)) {
        return preferred;
      }
      return resolveDefaultLanguage(
        versionIds.value,
        locale.value,
        versionsById.value,
      );
    },
    set: (next) => {
      preferredLanguage.value = next;
    },
  });

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
    resolveSectionViews(
      active.value.sections.value,
      language.value,
      versionsById.value,
    ),
  );

  const state = computed(() => active.value.state.value);

  return { languageOptions, language, meta, sections, state };
};
