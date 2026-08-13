<script setup lang="ts">
// Renders a chapter's commentary items, grouped under "Inner Light"
// (Ohr Pnimi) / "Inner Observation" (Histaklut Pnimit) section headings —
// only the groups that actually have items render. The "not available in
// this language" toast for a source anchor missing from this version lives
// in the reader page (via `ReaderPane`'s `#toast` slot), not here — this
// component only renders whatever items it's given.
//
// WITHIN a section, items are grouped by the source seif they comment on
// (`groupCommentaryBySeif`) rather than listed flat in `order`. Two reasons,
// both measured on the corpus:
//
//  1. A flat list shows a bare running ordinal that counts *notes* while the
//     source pane beside it counts *seifim*. Seif 1 of `part-01/chapter-01`
//     alone carries 11 notes, so by seif 3 this pane read "13" against the
//     source pane's "3" — the same number meaning two different things, with
//     nothing on screen to say so (issue #93).
//  2. Chapters run up to 53 items of multi-hundred-word prose separated by
//     nothing but a gap. The seif heading is the divider that list never had.
//
// The whole chapter renders, always. An earlier revision scoped this pane to
// the seif the reader was on, behind a toggle, because it wasn't yet known
// whether this column is read straight through or dipped into. It is read
// straight through (owner, 2026-08-12: "it is better to have all seif all at
// once") — so the toggle was removed rather than left as chrome answering a
// settled question. `useCurrentSeif` survives it for the one thing that
// still earns its place: accenting the heading of the seif the reader is on,
// which keeps the cross-pane link visible without hiding a single note or
// moving the column under them.
//
// Each seif group is a `<details open>` so the reader can fold away what
// they've finished with — reader-driven, never automatic. `<details>` rather
// than a custom toggle because it carries keyboard operation, the
// expanded/collapsed state for a screen reader, and in-page find that can
// open a closed group, none of which a `<button>` + `v-if` would. Deliberately
// not persisted: folding is a transient act while reading a chapter, and a
// group silently still-closed on the next visit would read as missing text.
//
// An unanchored item (issue #79: known chapter, unknown seif — see
// `isAnchoredCommentaryItem`) gets no `tes-anchor` button: clicking one
// would call `activateAnchor` with an id no source marker will ever carry
// (`validate-content.ts` forbids it), so `useHighlightedAnchor("source", …)`
// would find nothing and silently no-op — a dead affordance. Its label
// renders as plain (non-interactive) text instead. Unanchored items are the
// MAJORITY of the corpus (1,255 of 1,654 Hebrew items), so they get their
// own trailing group under their own heading rather than being dropped.
import type { CommentaryItem } from "~~/shared/types/content";

const props = defineProps<{
  items: CommentaryItem[];
  /**
   * `anchorId` -> the marker the source version on screen prints for it
   * (`anchorMarkersFromSegments`). Preferred over the item's own `label`,
   * because the two disagree and both are faithful to the printed edition:
   * Bnei Baruch's English marks the Ari's text with the Hebrew letters'
   * gematria values ("20") while numbering the notes sequentially ("11") —
   * see issue #96. Taking the marker from the text means the number the
   * reader clicks is the number they land on. Optional so the component
   * still renders standalone (tests, any caller without segments).
   */
  anchorMarkers?: ReadonlyMap<string, string>;
}>();

const { locale, t } = useI18n();
const { activateAnchor } = useReaderState();
const { currentSeif } = useCurrentSeif();
const containerRef = useReaderPaneContainer();
useHighlightedAnchor("commentary", containerRef);

/** The marker to print for an item: the source's own, else its stored label. */
const markerFor = (item: CommentaryItem): string =>
  props.anchorMarkers?.get(item.anchorId) ??
  localizedText(item.label, locale.value);

const sections = computed(() =>
  groupCommentaryBySection(props.items).map((section) => ({
    section: section.section,
    seifGroups: groupCommentaryBySeif(section.items),
  })),
);

const hasUnanchoredItems = computed(() =>
  hasUnanchoredCommentaryItems(props.items),
);

/**
 * The section heading is redundant for the ordinary case and it showed:
 * this pane's own header already reads "Inner Light", and `ohr-pnimi`'s
 * section heading is that same string — the reader got the identical words
 * twice, three lines apart, exactly the doubling `ReaderSummaryBody` had.
 *
 * It still earns its place when it says something the pane title doesn't:
 * a chapter carrying both sections needs them told apart, and a
 * `histaklut-pnimit`-only chapter is Inner Observation text sitting in the
 * Inner Light pane, which must be labelled or it misrepresents the layer.
 */
const isSectionHeadingUseful = computed(
  () =>
    sections.value.length > 1 ||
    sections.value.some(({ section }) => section !== "ohr-pnimi"),
);
</script>

<template>
  <div v-if="sections.length > 0" class="tes-commentary-column">
    <p v-if="hasUnanchoredItems" class="text-sm text-(--text-muted)">
      {{ t("reader.commentaryNotAligned") }}
    </p>

    <section
      v-for="group in sections"
      :key="group.section"
      class="flex flex-col gap-4"
    >
      <h3 v-if="isSectionHeadingUseful" class="tes-eyebrow">
        {{ t(`reader.commentarySection.${group.section}`) }}
      </h3>

      <details
        v-for="seifGroup in group.seifGroups"
        :key="seifGroup.seif ?? 'unanchored'"
        class="group flex flex-col"
        open
      >
        <summary
          class="tes-commentary-seif-heading"
          :class="{
            'is-current':
              seifGroup.seif !== null && seifGroup.seif === currentSeif,
          }"
        >
          <h4>
            {{
              seifGroup.seif === null
                ? t("reader.commentaryUnanchoredGroup")
                : t("reader.seifLabel", { n: seifGroup.seif })
            }}
          </h4>
          <span
            aria-hidden="true"
            class="tes-icon tes-icon-chevron-down tes-disclosure-chevron h-4 w-4"
          />
        </summary>

        <ol class="flex flex-col">
          <li
            v-for="item in seifGroup.items"
            :id="item.anchorId"
            :key="item.anchorId"
            class="reader-anchor-target tes-commentary-item"
          >
            <button
              v-if="isAnchoredCommentaryItem(item)"
              type="button"
              class="tes-anchor tes-commentary-marker"
              @click="activateAnchor(item.anchorId, 'commentary')"
            >
              {{ markerFor(item) }}
            </button>
            <span v-else class="tes-commentary-marker is-plain">
              {{ markerFor(item) }}
            </span>
            <span class="tes-commentary-body" v-html="item.html" />
          </li>
        </ol>
      </details>
    </section>
  </div>
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.commentaryEmpty") }}
  </p>
</template>
