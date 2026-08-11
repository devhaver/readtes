<script setup lang="ts">
/**
 * One aligned Hebrew/English excerpt pair — the evidence unit of the whole
 * glossary. Used both for a term's citations and for the examples under
 * each house rule, which carry the same `{ chapterId, layer, he, en }`
 * shape.
 *
 * Text is rendered as text, never `v-html`. Four of the conventions'
 * examples quote the edition's own markup (`<strong> Upper, simple
 * light:</strong>`) because the rule they illustrate *is* about that
 * markup — showing the tags verbatim is the correct rendering, not an
 * escaping bug.
 */
import { glossaryCitationTarget } from "~/utils/glossary";
import type { LayerKind } from "~~/shared/types/content";

const props = defineProps<{
  he: string;
  en: string;
  chapterId?: string;
  layer?: LayerKind;
  /** Free text locating the quote inside its chapter, e.g. "item 1". */
  item?: string;
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const target = computed(() =>
  props.chapterId ? glossaryCitationTarget(props.chapterId) : null,
);

const chapterLabel = computed(() => {
  if (!target.value) return null;
  return t("glossary.citationChapter", {
    part: target.value.partNumber,
    chapter: t(`glossary.chapterKind.${target.value.kind}`, {
      n: target.value.chapterNumber,
    }),
  });
});
</script>

<template>
  <figure class="border-s-2 border-(--border) ps-3">
    <blockquote>
      <p class="font-hebrew text-base/relaxed" dir="rtl" lang="he">
        {{ he }}
      </p>
      <p class="mt-1 text-sm/relaxed text-(--text-muted)" dir="ltr" lang="en">
        {{ en }}
      </p>
    </blockquote>
    <figcaption class="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
      <NuxtLink
        v-if="chapterId && chapterLabel"
        :to="localePath(`/read/${chapterId}`)"
        class="inline-flex items-center gap-1 text-(--accent-text) hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      >
        {{ chapterLabel }}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-3 w-3 rtl:rotate-180"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </NuxtLink>
      <span v-if="layer" class="text-(--text-muted)">
        {{ t(GLOSSARY_LAYER_LABEL_KEYS[layer]) }}
      </span>
      <span v-if="item" class="text-(--text-muted)" dir="ltr" lang="en">
        {{ item }}
      </span>
    </figcaption>
  </figure>
</template>
