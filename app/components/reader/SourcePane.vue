<script setup lang="ts">
// Renders a chapter's source segments. Anchor clicks (`a.tes-anchor[data-anchor]`,
// Sefaria's inline commentary markers, normalized at import time — see
// `app/utils/anchors.ts`) are caught via a single delegated listener on the
// scroll container, bound imperatively (not a template `@click`) so a
// non-interactive container isn't flagged by
// `vuejs-accessibility/no-static-element-interactions` — the actual
// interactive elements are the `<a>` tags themselves, which already have a
// working `href="#op-N"` no-JS fallback; this only intercepts to run the
// reader's own highlight/scroll behaviour instead of a plain in-page jump.
import type { SourceSegment } from "~~/shared/types/content";

defineProps<{ segments: SourceSegment[] }>();

const { t } = useI18n();
const { activateAnchor } = useReaderState();
const containerRef = useReaderPaneContainer();
useHighlightedAnchor("source", containerRef);

// `rewriteLegacySefariaRelativeHrefs` patches a data quirk in already-
// committed content: some Questions/Answers chapters' Hebrew source has
// Sefaria's own site-relative cross-reference links (`href="/Talmud_..."`),
// which don't resolve on this site — see `app/utils/sanitizeHtml.ts`.
const displayHtml = (segment: SourceSegment): string =>
  rewriteLegacySefariaRelativeHrefs(
    stripLeadingSeifNumber(segment.html, segment.n),
  );

const anchorIdFromEvent = (event: Event): string | undefined => {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest<HTMLAnchorElement>(
    "a.tes-anchor[data-anchor]",
  );
  return anchor?.dataset.anchor;
};

// A focused `<a href>`'s native Enter activation fires both this `keydown`
// (which handles it, since Space also needs handling here and anchors don't
// natively activate on Space) and a browser-synthesized `click` right after
// — without a guard, that click re-runs `activateAnchor` for the same Enter
// press. `suppressNextClickId` records the id an Enter keydown just
// activated so the following synthetic click for that same id is a no-op;
// it's cleared on a microtask so it can never suppress a later *real*
// click if the browser's `click` doesn't materialize (e.g. `preventDefault`
// already stopped it upstream).
let suppressNextClickId: string | null = null;

const onContainerClick = (event: MouseEvent) => {
  const id = anchorIdFromEvent(event);
  if (!id) return;
  if (suppressNextClickId === id) {
    suppressNextClickId = null;
    return;
  }
  event.preventDefault();
  activateAnchor(id, "source");
};

const onContainerKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const id = anchorIdFromEvent(event);
  if (!id) return;
  event.preventDefault();
  activateAnchor(id, "source");

  if (event.key === "Enter") {
    suppressNextClickId = id;
    queueMicrotask(() => {
      if (suppressNextClickId === id) suppressNextClickId = null;
    });
  }
};

watchEffect((onCleanup) => {
  const container = containerRef.value;
  if (!container) return;

  container.addEventListener("click", onContainerClick);
  container.addEventListener("keydown", onContainerKeydown);
  onCleanup(() => {
    container.removeEventListener("click", onContainerClick);
    container.removeEventListener("keydown", onContainerKeydown);
  });
});
</script>

<template>
  <ol
    v-if="segments.length > 0"
    class="mx-auto flex max-w-[65ch] flex-col gap-6"
  >
    <li
      v-for="segment in segments"
      :id="`seif-${segment.n}`"
      :key="segment.n"
      class="reader-anchor-target scroll-mt-4 text-lg leading-relaxed text-(--text-primary)"
    >
      <span
        class="me-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-(--surface-raised) px-1 align-middle text-xs tabular-nums text-(--text-muted)"
        aria-hidden="true"
      >
        {{ segment.n }}
      </span>
      <span v-html="displayHtml(segment)" />
    </li>
  </ol>
  <p v-else class="text-sm text-(--text-muted)">
    {{ t("reader.sourceEmpty") }}
  </p>
</template>
