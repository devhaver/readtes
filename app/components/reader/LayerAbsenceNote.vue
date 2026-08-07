<script setup lang="ts">
// The honest replacement for what used to be an empty Inner Light pane:
// when a chapter has no commentary in ANY edition (the overwhelmingly
// common case — see `resolveReaderPanes`' docblock for the corpus numbers),
// the pane is not rendered at all and this scholarly footnote at the end of
// the Source pane says why, instead of the reader silently wondering where
// the commentary went. Styled as an aside/footnote (muted, hairline top
// border), not an alert — an absent 1950s digitization is a property of the
// corpus, not an error state.
const { t } = useI18n();
</script>

<template>
  <aside role="note" class="mt-10 border-t border-(--border) pt-4">
    <h3
      class="font-display text-sm tracking-wide text-(--text-muted) uppercase"
    >
      {{ t("reader.pane.innerLight") }}
    </h3>
    <p class="mt-1 text-sm leading-relaxed text-(--text-muted)">
      {{ t("reader.innerLightAbsent") }}
    </p>
  </aside>
</template>
