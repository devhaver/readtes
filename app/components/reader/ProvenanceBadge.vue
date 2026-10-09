<script setup lang="ts">
// The one provenance label, shared by every surface that shows a version's
// text (pane headers, original mode, the third pane's per-section headings).
// Provenance is a LABEL, never a control: the reader picks a language and
// `resolveVersionForLanguage` picks the edition, so the only thing worth
// telling them is when the text they're reading isn't the official Bnei
// Baruch translation. Hebrew is never badged — it is the original. "AI
// translated" is the project's one mandatory label: any surface that can
// display `en-ai` text must render this.
import type { ContentVersion } from "~~/shared/types/content";

const props = defineProps<{ meta: ContentVersion | null }>();

const { t } = useI18n();

const provenance = computed(() => {
  const kind = versionProvenance(props.meta);
  if (kind === "ai") {
    return { label: t("reader.aiTranslated"), tone: "warning" as const };
  }
  if (kind === "sefaria") {
    return { label: t("reader.sefariaTranslated"), tone: "muted" as const };
  }
  return null;
});
</script>

<template>
  <span
    v-if="provenance"
    class="tes-provenance-badge shrink-0"
    :title="provenance.label"
    :class="
      provenance.tone === 'warning'
        ? 'border-orange-cta text-(--warning-text)'
        : 'border-(--border) text-(--text-muted)'
    "
  >
    <span class="@max-sm:sr-only">{{ provenance.label }}</span>
    <span aria-hidden="true" class="hidden @max-sm:inline">&#10022;</span>
  </span>
</template>
