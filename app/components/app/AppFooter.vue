<script setup lang="ts">
// The attribution credits Bnei Baruch, so the academy's name links to their
// own source library rather than leaving the reader to go looking for it.
//
// The name is a separate message from the sentence around it, and the
// sentence is split on a placeholder rather than stored as two half-
// sentences: Hebrew puts the name in a different position, and asking a
// translator to hand-place an `<a>` inside a translated string (or to keep
// two fragments in the right order) is how attribution ends up mangled in
// the languages nobody on the team reads.
//
// Split rather than `<i18n-t>`: that component resolved the message but
// dropped the slot's markup here, rendering the name as plain text.
const { t, locale } = useI18n();

/**
 * Placeholder we split the sentence on. Never rendered, so it only has to be
 * a string no translation would contain — plain ASCII on purpose, since a
 * control character here is invisible in review and trips the template
 * parser.
 */
const NAME_SLOT = "@@ACADEMY@@";

/** KabbalahMedia serves these; the other target languages fall back to English. */
const KM_SOURCES_LOCALES = new Set(["en", "he"]);

const sourcesUrl = computed(
  () =>
    `https://kabbalahmedia.info/${
      KM_SOURCES_LOCALES.has(locale.value) ? locale.value : "en"
    }/sources/`,
);

/** The sentence either side of the academy's name, in the translation's own order. */
const attribution = computed(() => {
  const [before = "", after = ""] = t("footer.attribution", {
    academy: NAME_SLOT,
  }).split(NAME_SLOT);
  return { before, after };
});
</script>

<template>
  <footer
    class="border-t border-(--border) bg-(--surface) px-4 py-6 text-center text-sm text-(--text-muted) sm:px-6"
  >
    <p>
      {{ attribution.before
      }}<a
        :href="sourcesUrl"
        :title="t('footer.sourcesLinkTitle')"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-button underline underline-offset-2 hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        >{{ t("footer.academy") }}</a
      >{{ attribution.after }}
    </p>
  </footer>
</template>
